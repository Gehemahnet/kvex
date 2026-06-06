import type {
	AuthCredentials,
	AuthResponse,
	AuthSessionStatus,
} from "./Auth.types";

/** Registers a local KVEX user and returns a bearer token. */
export const registerAuthUser = async (
	credentials: AuthCredentials,
): Promise<AuthResponse> =>
	sendAuthRequest("/api/auth/register", credentials);

/** Logs in a local KVEX user and returns a bearer token. */
export const loginAuthUser = async (
	credentials: AuthCredentials,
): Promise<AuthResponse> =>
	sendAuthRequest("/api/auth/login", credentials);

/** Requests the current auth session from the browser cookie. */
export const getCurrentAuthSession = async (): Promise<AuthSessionStatus> => {
	const response = await fetch("/api/auth/me");

	if (!response.ok) {
		throw new Error(await getAuthErrorMessage(response));
	}

	return response.json() as Promise<AuthSessionStatus>;
};

/** Clears the current browser auth session. */
export const logoutAuthUser = async (csrfToken: string): Promise<void> => {
	const response = await fetch("/api/auth/logout", {
		method: "POST",
		headers: createCsrfHeaders(csrfToken),
	});

	if (!response.ok) {
		throw new Error(await getAuthErrorMessage(response));
	}
};

/** Rotates the current browser auth session and returns the fresh session. */
export const refreshAuthSession = async (
	csrfToken: string,
): Promise<AuthResponse> => {
	const response = await fetch("/api/auth/refresh", {
		method: "POST",
		headers: createCsrfHeaders(csrfToken),
	});

	if (!response.ok) {
		throw new Error(await getAuthErrorMessage(response));
	}

	return response.json() as Promise<AuthResponse>;
};

/** Requests a password reset for a login without exposing account existence. */
export const requestPasswordReset = async (login: string): Promise<void> => {
	const response = await fetch("/api/auth/password-reset/request", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ login }),
	});

	if (!response.ok) {
		throw new Error(await getAuthErrorMessage(response));
	}
};

/** Confirms a password reset token and sets a new password. */
export const confirmPasswordReset = async (
	params: {
		password: string;
		token: string;
	},
): Promise<void> => {
	const response = await fetch("/api/auth/password-reset/confirm", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(params),
	});

	if (!response.ok) {
		throw new Error(await getAuthErrorMessage(response));
	}
};

const sendAuthRequest = async (
	pathname: string,
	credentials: AuthCredentials,
): Promise<AuthResponse> => {
	const response = await fetch(pathname, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(credentials),
	});

	if (!response.ok) {
		throw new Error(await getAuthErrorMessage(response));
	}

	return response.json() as Promise<AuthResponse>;
};

const getAuthErrorMessage = async (response: Response): Promise<string> => {
	const body = await response.json().catch(() => undefined) as
		| { error?: { message?: string } }
		| undefined;

	return body?.error?.message ?? `Auth request failed: ${response.status}`;
};

const createCsrfHeaders = (csrfToken: string): HeadersInit => ({
	"X-CSRF-Token": csrfToken,
});
