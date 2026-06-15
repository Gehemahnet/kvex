import { apiGet, apiPost, apiPostVoid } from "../api-client";
import type {
	AuthCredentials,
	AuthResponse,
	AuthSessionStatus,
} from "./auth.types";

export const authApi = {
	/** Confirms a password reset token and sets a new password. */
	confirmPasswordReset: (params: {
		password: string;
		token: string;
	}): Promise<void> =>
		apiPostVoid("/api/auth/password-reset/confirm", params),

	/** Requests the current auth session from the browser cookie. */
	getCurrentSession: (): Promise<AuthSessionStatus> =>
		apiGet<AuthSessionStatus>("/api/auth/me"),

	/** Logs in a local KVEX user and returns a browser session payload. */
	login: (credentials: AuthCredentials): Promise<AuthResponse> =>
		apiPost<AuthResponse, AuthCredentials>("/api/auth/login", credentials),

	/** Clears the current browser auth session. */
	logout: (csrfToken: string): Promise<void> =>
		apiPostVoid("/api/auth/logout", undefined, {
			headers: {
				"X-CSRF-Token": csrfToken,
			},
		}),

	/** Registers a local KVEX user and returns a browser session payload. */
	register: (credentials: AuthCredentials): Promise<AuthResponse> =>
		apiPost<AuthResponse, AuthCredentials>("/api/auth/register", credentials),

	/** Requests a password reset for a login without exposing account existence. */
	requestPasswordReset: (login: string): Promise<void> =>
		apiPostVoid("/api/auth/password-reset/request", { login }),

	/** Rotates the current browser auth session and returns the fresh session. */
	refreshSession: (csrfToken: string): Promise<AuthResponse> =>
		apiPost<AuthResponse>("/api/auth/refresh", undefined, {
			headers: {
				"X-CSRF-Token": csrfToken,
			},
		}),
};
