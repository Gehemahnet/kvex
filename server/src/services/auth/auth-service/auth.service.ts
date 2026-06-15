import type { Queryable } from "#storage/postgres/postgres.client";
import {
	BadRequestError,
	ConflictError,
	UnauthorizedError,
} from "#server/http/http-errors";
import {
	createUser,
	findUserById,
	findUserByLogin,
	updateUserPasswordHash,
} from "#services/users/users-core/users.repository";
import type { User } from "#services/users/users-core/users.types";
import {
	createAuthSessionToken,
	createCsrfToken,
	hashPassword,
	hashAuthSessionToken,
	hashCsrfToken,
	createPasswordResetToken,
	hashPasswordResetToken,
	verifyPassword,
} from "./auth.crypto";
import type {
	AuthResponse,
	AuthSession,
	AuthUser,
	ConfirmPasswordResetInput,
	LoginUserInput,
	RegisterUserInput,
	RequestPasswordResetInput,
} from "./auth.types";
import {
	createAuthSessionRecord,
	findActiveAuthSessionByTokenHash,
	revokeAuthSession,
	touchAuthSession,
	updateAuthSessionCsrfTokenHash,
} from "#services/auth/auth-sessions/auth-sessions.repository";
import {
	createPasswordResetTokenRecord,
	findUsablePasswordResetToken,
	markPasswordResetTokenUsed,
} from "#services/auth/password-reset/password-reset.repository";

const MIN_PASSWORD_LENGTH = 8;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_RESET_TTL_MS = 1000 * 60 * 30;

/** Registers a local user and returns an auth token. */
export const registerUser = async (
	db: Queryable,
	input: RegisterUserInput,
	sessionTtlSeconds: number,
): Promise<AuthResponse> => {
	validateCredentials(input);

	const existingUser = await findUserByLogin(db, input.login);

	if (existingUser !== undefined) {
		throw new ConflictError("Login is already registered", "LOGIN_TAKEN");
	}

	const user = await createUser(db, {
		email: input.email,
		login: input.login,
		passwordHash: await hashPassword(input.password),
	});

	return createAuthResponse(db, user, sessionTtlSeconds);
};

/** Authenticates a local user and returns an auth token. */
export const loginUser = async (
	db: Queryable,
	input: LoginUserInput,
	sessionTtlSeconds: number,
): Promise<AuthResponse> => {
	validateCredentials(input);

	const user = await findUserByLogin(db, input.login);

	if (
		user === undefined ||
		user.status !== "active" ||
		!(await verifyPassword(input.password, user.passwordHash))
	) {
		throw new UnauthorizedError("Invalid login or password", "INVALID_LOGIN");
	}

	return createAuthResponse(db, user, sessionTtlSeconds);
};

/** Resolves the authenticated user from a session token. */
export const getAuthenticatedUser = async (
	db: Queryable,
	token: string,
): Promise<AuthUser> => {
	const session = await getAuthenticatedSession(db, token);

	return session.user;
};

/** Resolves the authenticated session from a bearer token or auth cookie token. */
export const getAuthenticatedSession = async (
	db: Queryable,
	token: string,
	csrfToken?: string,
): Promise<AuthSession> => {
	const session = await getActiveSessionByToken(db, token);
	const user = await findUserById(db, session.userId);

	if (user === undefined || user.status !== "active") {
		throw new UnauthorizedError("Authenticated user was not found", "USER_NOT_FOUND");
	}

	await touchAuthSession(db, session.id);
	const activeCsrfToken = await getOrRotateCsrfToken(db, {
		csrfToken,
		expectedCsrfTokenHash: session.csrfTokenHash,
		sessionId: session.id,
	});

	return {
		csrfToken: activeCsrfToken,
		expiresAt: session.expiresAt.toISOString(),
		user: toAuthUser(user),
	};
};

/** Rotates a valid browser session token and returns a fresh session response. */
export const refreshAuthSession = async (
	db: Queryable,
	params: {
		csrfToken: string;
		sessionTtlSeconds: number;
		token: string;
	},
): Promise<AuthResponse> => {
	const session = await getActiveSessionByToken(db, params.token);
	validateCsrfToken(params.csrfToken, session.csrfTokenHash);

	const user = await findUserById(db, session.userId);

	if (user === undefined || user.status !== "active") {
		throw new UnauthorizedError("Authenticated user was not found", "USER_NOT_FOUND");
	}

	await revokeAuthSession(db, session.id);

	return createAuthResponse(db, user, params.sessionTtlSeconds);
};

/** Revokes a valid browser session token. */
export const logoutUser = async (
	db: Queryable,
	params: {
		csrfToken: string;
		token: string;
	},
): Promise<void> => {
	const session = await getActiveSessionByToken(db, params.token);
	validateCsrfToken(params.csrfToken, session.csrfTokenHash);

	await revokeAuthSession(db, session.id);
};

/** Creates a one-time password reset token when the login exists. */
export const requestPasswordReset = async (
	db: Queryable,
	input: RequestPasswordResetInput,
): Promise<{ issued: boolean; token?: string }> => {
	if (!input.login.trim()) {
		throw new BadRequestError("Login is required", "MISSING_LOGIN");
	}

	const user = await findUserByLogin(db, input.login);

	if (user === undefined || user.status !== "active") {
		return { issued: false };
	}

	const token = createPasswordResetToken();

	await createPasswordResetTokenRecord(db, {
		expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
		tokenHash: hashPasswordResetToken(token),
		userId: user.id,
	});

	return {
		issued: true,
		token,
	};
};

/** Confirms a one-time password reset token and updates the password hash. */
export const confirmPasswordReset = async (
	db: Queryable,
	input: ConfirmPasswordResetInput,
): Promise<void> => {
	if (!input.token.trim()) {
		throw new BadRequestError("Reset token is required", "MISSING_RESET_TOKEN");
	}

	validatePassword(input.password);

	const token = await findUsablePasswordResetToken(
		db,
		hashPasswordResetToken(input.token),
	);

	if (token === undefined) {
		throw new UnauthorizedError("Invalid or expired reset token", "INVALID_RESET_TOKEN");
	}

	await updateUserPasswordHash(db, {
		passwordHash: await hashPassword(input.password),
		userId: token.user_id,
	});
	await markPasswordResetTokenUsed(db, token.id);
};

const createAuthResponse = async (
	db: Queryable,
	user: User,
	sessionTtlSeconds: number,
): Promise<AuthResponse> => {
	const token = createAuthSessionToken();
	const csrfToken = createCsrfToken();
	const expiresAt = new Date(Date.now() + sessionTtlSeconds * 1000);

	await createAuthSessionRecord(db, {
		csrfTokenHash: hashCsrfToken(csrfToken),
		expiresAt,
		tokenHash: hashAuthSessionToken(token),
		userId: user.id,
	});

	return {
		csrfToken,
		expiresAt: expiresAt.toISOString(),
		token,
		user: toAuthUser(user),
	};
};

const getActiveSessionByToken = async (
	db: Queryable,
	token: string,
) => {
	const session = await findActiveAuthSessionByTokenHash(
		db,
		hashAuthSessionToken(token),
	);

	if (session === undefined) {
		throw new UnauthorizedError("Invalid or expired auth session", "INVALID_AUTH_SESSION");
	}

	return session;
};

const validateCsrfToken = (
	csrfToken: string,
	expectedCsrfTokenHash: string,
): void => {
	if (hashCsrfToken(csrfToken) !== expectedCsrfTokenHash) {
		throw new UnauthorizedError("Invalid CSRF token", "INVALID_CSRF_TOKEN");
	}
};

const getOrRotateCsrfToken = async (
	db: Queryable,
	params: {
		csrfToken?: string;
		expectedCsrfTokenHash: string;
		sessionId: string;
	},
): Promise<string> => {
	if (
		params.csrfToken !== undefined &&
		hashCsrfToken(params.csrfToken) === params.expectedCsrfTokenHash
	) {
		return params.csrfToken;
	}

	const csrfToken = createCsrfToken();

	await updateAuthSessionCsrfTokenHash(db, {
		csrfTokenHash: hashCsrfToken(csrfToken),
		sessionId: params.sessionId,
	});

	return csrfToken;
};

const toAuthUser = (user: User): AuthUser => ({
	id: user.id,
	login: user.login,
	...(user.email === undefined ? {} : { email: user.email }),
	status: user.status,
});

const validateCredentials = (input: RegisterUserInput): void => {
	if (!input.login.trim()) {
		throw new BadRequestError("Login is required", "MISSING_LOGIN");
	}

	validatePassword(input.password);

	if (input.email !== undefined && !EMAIL_PATTERN.test(input.email.trim())) {
		throw new BadRequestError("Email must be valid", "INVALID_EMAIL");
	}
};

const validatePassword = (password: string): void => {
	if (password.length < MIN_PASSWORD_LENGTH) {
		throw new BadRequestError(
			`Password must contain at least ${MIN_PASSWORD_LENGTH} characters`,
			"WEAK_PASSWORD",
		);
	}
};
