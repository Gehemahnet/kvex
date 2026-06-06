import type { IncomingMessage, ServerResponse } from "node:http";

const AUTH_COOKIE_NAME = "kvex_auth";
const CSRF_COOKIE_NAME = "kvex_csrf";

/** Reads the auth token from the request cookie header. */
export const getAuthCookieToken = (request: IncomingMessage): string | undefined => {
	return getCookieValue(request, AUTH_COOKIE_NAME);
};

/** Reads the CSRF token from the request cookie header. */
export const getCsrfCookieToken = (request: IncomingMessage): string | undefined =>
	getCookieValue(request, CSRF_COOKIE_NAME);

/** Sets the HttpOnly auth cookie for browser sessions. */
export const setAuthCookie = (
	response: ServerResponse,
	token: string,
	maxAgeSeconds: number,
): void => {
	appendSetCookieHeader(response, serializeAuthCookie(token, maxAgeSeconds));
};

/** Sets the readable CSRF cookie for browser authenticated mutations. */
export const setCsrfCookie = (
	response: ServerResponse,
	token: string,
	maxAgeSeconds: number,
): void => {
	appendSetCookieHeader(response, serializeCookie({
		httpOnly: false,
		maxAgeSeconds,
		name: CSRF_COOKIE_NAME,
		value: token,
	}));
};

/** Clears the browser auth cookie. */
export const clearAuthCookie = (response: ServerResponse): void => {
	appendSetCookieHeader(response, serializeAuthCookie("", 0));
};

/** Clears the browser CSRF cookie. */
export const clearCsrfCookie = (response: ServerResponse): void => {
	appendSetCookieHeader(response, serializeCookie({
		httpOnly: false,
		maxAgeSeconds: 0,
		name: CSRF_COOKIE_NAME,
		value: "",
	}));
};

const serializeAuthCookie = (value: string, maxAgeSeconds: number): string =>
	serializeCookie({
		httpOnly: true,
		maxAgeSeconds,
		name: AUTH_COOKIE_NAME,
		value,
	});

const serializeCookie = (params: {
	httpOnly: boolean;
	maxAgeSeconds: number;
	name: string;
	value: string;
}): string =>
	[
		`${params.name}=${encodeURIComponent(params.value)}`,
		"Path=/",
		...(params.httpOnly ? ["HttpOnly"] : []),
		"SameSite=Lax",
		`Max-Age=${params.maxAgeSeconds}`,
	].join("; ");

const getCookieValue = (
	request: IncomingMessage,
	cookieName: string,
): string | undefined => {
	const cookieHeader = request.headers.cookie;

	if (cookieHeader === undefined) {
		return undefined;
	}

	return cookieHeader
		.split(";")
		.map((cookie) => cookie.trim())
		.map((cookie) => cookie.split("="))
		.map(([name, value]) => [name, decodeURIComponent(value ?? "")] as const)
		.find(([name]) => name === cookieName)?.[1];
};

const appendSetCookieHeader = (
	response: ServerResponse,
	cookie: string,
): void => {
	const currentHeader = response.getHeader("Set-Cookie");

	if (Array.isArray(currentHeader)) {
		response.setHeader("Set-Cookie", [...currentHeader, cookie]);

		return;
	}

	if (typeof currentHeader === "string") {
		response.setHeader("Set-Cookie", [currentHeader, cookie]);

		return;
	}

	response.setHeader("Set-Cookie", cookie);
};
