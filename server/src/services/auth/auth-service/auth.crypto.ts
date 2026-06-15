import { createHash, createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { UnauthorizedError } from "#server/http/http-errors";
import type { AuthTokenPayload } from "./auth.types";

const scryptAsync = promisify(scrypt);
const PASSWORD_HASH_PREFIX = "scrypt";
const PASSWORD_KEY_LENGTH = 64;
const JWT_ALGORITHM = "HS256";
const JWT_TYPE = "JWT";

/** Hashes a raw password using Node scrypt with a random salt. */
export const hashPassword = async (password: string): Promise<string> => {
	const salt = randomBytes(16).toString("base64url");
	const hash = await derivePasswordHash(password, salt);

	return `${PASSWORD_HASH_PREFIX}:${salt}:${hash}`;
};

/** Verifies a raw password against a stored scrypt password hash. */
export const verifyPassword = async (
	password: string,
	passwordHash: string,
): Promise<boolean> => {
	const [prefix, salt, expectedHash] = passwordHash.split(":");

	if (prefix !== PASSWORD_HASH_PREFIX || !salt || !expectedHash) {
		return false;
	}

	const actualHash = await derivePasswordHash(password, salt);
	const actual = Buffer.from(actualHash, "base64url");
	const expected = Buffer.from(expectedHash, "base64url");

	return actual.length === expected.length && timingSafeEqual(actual, expected);
};

/** Creates a high-entropy one-time password reset token. */
export const createPasswordResetToken = (): string =>
	randomBytes(32).toString("base64url");

/** Creates a high-entropy browser session token. */
export const createAuthSessionToken = (): string =>
	randomBytes(32).toString("base64url");

/** Creates a high-entropy CSRF token for authenticated browser mutations. */
export const createCsrfToken = (): string =>
	randomBytes(32).toString("base64url");

/** Hashes a browser session token before persistence. */
export const hashAuthSessionToken = (token: string): string =>
	hashToken(token);

/** Hashes a CSRF token before persistence. */
export const hashCsrfToken = (token: string): string =>
	hashToken(token);

/** Hashes a password reset token before persistence. */
export const hashPasswordResetToken = (token: string): string =>
	hashToken(token);

/** Signs a compact HMAC JWT for local KVEX auth. */
export const signAuthToken = (
	params: {
		login: string;
		secret: string;
		ttlSeconds: number;
		userId: string;
	},
	nowSeconds = getNowSeconds(),
): string => {
	const header = encodeJwtPart({
		alg: JWT_ALGORITHM,
		typ: JWT_TYPE,
	});
	const payload = encodeJwtPart({
		sub: params.userId,
		login: params.login,
		iat: nowSeconds,
		exp: nowSeconds + params.ttlSeconds,
	});
	const unsignedToken = `${header}.${payload}`;
	const signature = createJwtSignature(unsignedToken, params.secret);

	return `${unsignedToken}.${signature}`;
};

/** Verifies a local HMAC JWT and returns its auth payload. */
export const verifyAuthToken = (
	token: string,
	secret: string,
	nowSeconds = getNowSeconds(),
): AuthTokenPayload => {
	const [encodedHeader, encodedPayload, signature] = token.split(".");

	if (!encodedHeader || !encodedPayload || !signature) {
		throw new UnauthorizedError("Invalid auth token", "INVALID_AUTH_TOKEN");
	}

	const unsignedToken = `${encodedHeader}.${encodedPayload}`;
	const expectedSignature = createJwtSignature(unsignedToken, secret);

	if (!safeCompare(signature, expectedSignature)) {
		throw new UnauthorizedError("Invalid auth token", "INVALID_AUTH_TOKEN");
	}

	const header = decodeJwtPart<{ alg?: string; typ?: string }>(encodedHeader);

	if (header.alg !== JWT_ALGORITHM || header.typ !== JWT_TYPE) {
		throw new UnauthorizedError("Invalid auth token", "INVALID_AUTH_TOKEN");
	}

	const payload = decodeJwtPart<AuthTokenPayload>(encodedPayload);

	if (
		typeof payload.sub !== "string" ||
		typeof payload.login !== "string" ||
		typeof payload.exp !== "number" ||
		typeof payload.iat !== "number"
	) {
		throw new UnauthorizedError("Invalid auth token", "INVALID_AUTH_TOKEN");
	}

	if (payload.exp <= nowSeconds) {
		throw new UnauthorizedError("Auth token expired", "AUTH_TOKEN_EXPIRED");
	}

	return payload;
};

const derivePasswordHash = async (
	password: string,
	salt: string,
): Promise<string> => {
	const hash = await scryptAsync(password, salt, PASSWORD_KEY_LENGTH);

	return Buffer.from(hash as Buffer).toString("base64url");
};

const createJwtSignature = (unsignedToken: string, secret: string): string =>
	createHmac("sha256", secret).update(unsignedToken).digest("base64url");

const hashToken = (token: string): string =>
	createHash("sha256").update(token).digest("base64url");

const encodeJwtPart = (value: object): string =>
	Buffer.from(JSON.stringify(value)).toString("base64url");

const decodeJwtPart = <Value>(value: string): Value => {
	try {
		return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Value;
	} catch {
		throw new UnauthorizedError("Invalid auth token", "INVALID_AUTH_TOKEN");
	}
};

const safeCompare = (first: string, second: string): boolean => {
	const firstBuffer = Buffer.from(first);
	const secondBuffer = Buffer.from(second);

	return firstBuffer.length === secondBuffer.length &&
		timingSafeEqual(firstBuffer, secondBuffer);
};

const getNowSeconds = (): number => Math.floor(Date.now() / 1000);
