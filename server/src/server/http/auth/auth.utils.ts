import type { IncomingMessage } from "node:http";
import { getAuthSessionTtlSeconds } from "../../../services/auth/auth.config";
import type {
	ConfirmPasswordResetInput,
	LoginUserInput,
	RegisterUserInput,
	RequestPasswordResetInput,
} from "../../../services/auth/auth.types";
import { getPostgresPool } from "../../../storage/postgres/postgres.client";
import type { Queryable } from "../../../storage/postgres/postgres.client";
import {
	BadRequestError,
	InternalServerError,
	UnauthorizedError,
} from "../http-errors";
import type {
	AuthCredentialsBody,
	PasswordResetConfirmBody,
	PasswordResetRequestBody,
} from "./auth.types";
import { getAuthCookieToken, getCsrfCookieToken } from "./auth.cookies";

export type AuthDependencies = {
	db: Queryable;
	sessionTtlSeconds: number;
};

/** Returns auth runtime dependencies or throws an HTTP-safe configuration error. */
export const getAuthDependencies = (): AuthDependencies => {
	const db = getPostgresPool();

	if (db === undefined) {
		throw new InternalServerError("Postgres is not configured");
	}

	return {
		db,
		sessionTtlSeconds: getAuthSessionTtlSeconds(),
	};
};

/** Normalizes auth credentials request bodies into service inputs. */
export const parseAuthCredentialsBody = (
	body: AuthCredentialsBody,
): LoginUserInput | RegisterUserInput => {
	if (typeof body.login !== "string") {
		throw new BadRequestError("Field `login` must be a string", "INVALID_LOGIN");
	}

	if (typeof body.password !== "string") {
		throw new BadRequestError(
			"Field `password` must be a string",
			"INVALID_PASSWORD",
		);
	}

	return {
		...(typeof body.email === "string" && body.email.trim()
			? { email: body.email }
			: {}),
		login: body.login,
		password: body.password,
	};
};

/** Extracts an auth token from a bearer header or the browser auth cookie. */
export const getAuthRequestToken = (request: IncomingMessage): string => {
	const token = getOptionalAuthRequestToken(request);

	if (token !== undefined) {
		return token;
	}

	throw new UnauthorizedError("Authorization token is required");
};

/** Extracts an auth token from a bearer header or cookie when present. */
export const getOptionalAuthRequestToken = (
	request: IncomingMessage,
): string | undefined => {
	const bearerToken = getBearerToken(request);

	if (bearerToken !== undefined) {
		return bearerToken;
	}

	const cookieToken = getAuthCookieToken(request);

	if (cookieToken !== undefined) {
		return cookieToken;
	}

	return undefined;
};

/** Extracts the CSRF token from request header or readable CSRF cookie. */
export const getCsrfRequestToken = (request: IncomingMessage): string => {
	const headerToken = request.headers["x-csrf-token"];
	const csrfToken = Array.isArray(headerToken) ? headerToken[0] : headerToken;

	if (csrfToken !== undefined && csrfToken.trim()) {
		return csrfToken;
	}

	const cookieToken = getCsrfCookieToken(request);

	if (cookieToken !== undefined && cookieToken.trim()) {
		return cookieToken;
	}

	throw new UnauthorizedError("CSRF token is required", "MISSING_CSRF_TOKEN");
};

/** Extracts a bearer token from the Authorization header when present. */
export const getBearerToken = (request: IncomingMessage): string | undefined => {
	const header = request.headers.authorization;

	if (header === undefined) {
		return undefined;
	}

	const [scheme, token] = header.split(" ");

	if (scheme !== "Bearer" || !token) {
		throw new UnauthorizedError("Authorization header must use Bearer token");
	}

	return token;
};

/** Normalizes password reset request bodies. */
export const parsePasswordResetRequestBody = (
	body: PasswordResetRequestBody,
): RequestPasswordResetInput => {
	if (typeof body.login !== "string") {
		throw new BadRequestError("Field `login` must be a string", "INVALID_LOGIN");
	}

	return {
		login: body.login,
	};
};

/** Normalizes password reset confirmation bodies. */
export const parsePasswordResetConfirmBody = (
	body: PasswordResetConfirmBody,
): ConfirmPasswordResetInput => {
	if (typeof body.token !== "string") {
		throw new BadRequestError(
			"Field `token` must be a string",
			"INVALID_RESET_TOKEN",
		);
	}

	if (typeof body.password !== "string") {
		throw new BadRequestError(
			"Field `password` must be a string",
			"INVALID_PASSWORD",
		);
	}

	return {
		token: body.token,
		password: body.password,
	};
};
