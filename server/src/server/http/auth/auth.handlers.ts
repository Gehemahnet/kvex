import type { IncomingMessage, ServerResponse } from "node:http";
import {
	getAuthenticatedSession,
	confirmPasswordReset,
	loginUser,
	logoutUser,
	refreshAuthSession,
	requestPasswordReset,
	registerUser,
} from "../../../services/auth/auth.service";
import type {
	AuthSession,
	AuthSessionStatus,
} from "../../../services/auth/auth.types";
import { readJsonBody } from "../http-request.utils";
import { writeJsonResponse } from "../http-response.utils";
import {
	getAuthDependencies,
	getAuthRequestToken,
	getCsrfRequestToken,
	getOptionalAuthRequestToken,
	parsePasswordResetConfirmBody,
	parsePasswordResetRequestBody,
	parseAuthCredentialsBody,
} from "./auth.utils";
import {
	clearAuthCookie,
	clearCsrfCookie,
	setAuthCookie,
	setCsrfCookie,
} from "./auth.cookies";
import type {
	AuthCredentialsBody,
	PasswordResetConfirmBody,
	PasswordResetRequestBody,
} from "./auth.types";
import { UnauthorizedError } from "../http-errors";

/** Handles `POST /auth/register` and creates a local user account. */
export const registerUserHandler = async (
	request: IncomingMessage,
	response: ServerResponse,
) => {
	const dependencies = getAuthDependencies();
	const body = await readJsonBody<AuthCredentialsBody>(request);
	const credentials = parseAuthCredentialsBody(body);
	const data = await registerUser(
		dependencies.db,
		credentials,
		dependencies.sessionTtlSeconds,
	);

	setAuthCookies(response, data, dependencies.sessionTtlSeconds);
	writeJsonResponse(response, 201, toAuthSessionResponse(data));
};

/** Handles `POST /auth/login` and returns a bearer token. */
export const loginUserHandler = async (
	request: IncomingMessage,
	response: ServerResponse,
) => {
	const dependencies = getAuthDependencies();
	const body = await readJsonBody<AuthCredentialsBody>(request);
	const credentials = parseAuthCredentialsBody(body);
	const data = await loginUser(
		dependencies.db,
		credentials,
		dependencies.sessionTtlSeconds,
	);

	setAuthCookies(response, data, dependencies.sessionTtlSeconds);
	writeJsonResponse(response, 200, toAuthSessionResponse(data));
};

/** Handles `GET /auth/me` and returns the current authenticated user. */
export const getCurrentUserHandler = async (
	request: IncomingMessage,
	response: ServerResponse,
) => {
	const dependencies = getAuthDependencies();
	const token = getOptionalAuthRequestToken(request);

	if (token === undefined) {
		writeJsonResponse(response, 200, toAnonymousAuthSessionResponse());

		return;
	}

	try {
		const session = await getAuthenticatedSession(
			dependencies.db,
			token,
			getOptionalCsrfRequestToken(request),
		);

		setCsrfCookie(response, session.csrfToken, dependencies.sessionTtlSeconds);
		writeJsonResponse(response, 200, session);
	} catch (error) {
		if (!(error instanceof UnauthorizedError)) {
			throw error;
		}

		clearAuthCookie(response);
		clearCsrfCookie(response);
		writeJsonResponse(response, 200, toAnonymousAuthSessionResponse());
	}
};

/** Handles `POST /auth/logout` and clears the browser auth cookie. */
export const logoutUserHandler = async (
	request: IncomingMessage,
	response: ServerResponse,
) => {
	const dependencies = getAuthDependencies();

	await logoutUser(dependencies.db, {
		csrfToken: getCsrfRequestToken(request),
		token: getAuthRequestToken(request),
	});
	clearAuthCookie(response);
	clearCsrfCookie(response);

	writeJsonResponse(response, 200, {
		ok: true,
	});
};

/** Handles `POST /auth/refresh` and rotates the current browser session. */
export const refreshAuthSessionHandler = async (
	request: IncomingMessage,
	response: ServerResponse,
) => {
	const dependencies = getAuthDependencies();
	const data = await refreshAuthSession(dependencies.db, {
		csrfToken: getCsrfRequestToken(request),
		sessionTtlSeconds: dependencies.sessionTtlSeconds,
		token: getAuthRequestToken(request),
	});

	setAuthCookies(response, data, dependencies.sessionTtlSeconds);
	writeJsonResponse(response, 200, toAuthSessionResponse(data));
};

/** Handles `POST /auth/password-reset/request` and creates a reset token internally. */
export const requestPasswordResetHandler = async (
	request: IncomingMessage,
	response: ServerResponse,
) => {
	const dependencies = getAuthDependencies();
	const body = await readJsonBody<PasswordResetRequestBody>(request);
	const input = parsePasswordResetRequestBody(body);

	await requestPasswordReset(dependencies.db, input);

	writeJsonResponse(response, 202, {
		ok: true,
	});
};

/** Handles `POST /auth/password-reset/confirm` and sets a new password. */
export const confirmPasswordResetHandler = async (
	request: IncomingMessage,
	response: ServerResponse,
) => {
	const dependencies = getAuthDependencies();
	const body = await readJsonBody<PasswordResetConfirmBody>(request);
	const input = parsePasswordResetConfirmBody(body);

	await confirmPasswordReset(dependencies.db, input);

	writeJsonResponse(response, 200, {
		ok: true,
	});
};

const toAuthSessionResponse = <TAuth extends {
	expiresAt: string;
	user: AuthSession["user"];
	csrfToken: string;
}>(auth: TAuth): AuthSession => ({
	csrfToken: auth.csrfToken,
	expiresAt: auth.expiresAt,
	user: auth.user,
});

const toAnonymousAuthSessionResponse = (): AuthSessionStatus => ({
	needsLogin: true,
});

const setAuthCookies = (
	response: ServerResponse,
	auth: {
		csrfToken: string;
		token: string;
	},
	sessionTtlSeconds: number,
): void => {
	setAuthCookie(response, auth.token, sessionTtlSeconds);
	setCsrfCookie(response, auth.csrfToken, sessionTtlSeconds);
};

const getOptionalCsrfRequestToken = (
	request: IncomingMessage,
): string | undefined => {
	try {
		return getCsrfRequestToken(request);
	} catch {
		return undefined;
	}
};
