import { computed, ref } from "vue";
import { authApi, type AuthResponse, type AuthUser } from "@api/auth";
import { isTransientAuthError, retryTransientAuthRequest } from "./Auth.utils";

const LEGACY_AUTH_STORAGE_KEY = "kvex-auth";

type AuthState = {
	csrfToken: string;
	expiresAt: string;
	user: AuthUser;
} | null;

type AuthStatus = "loading" | "anonymous" | "authenticated";

const authState = ref<AuthState>(null);
const authStatus = ref<AuthStatus>("loading");
let restoreSessionPromise: Promise<boolean> | undefined;

/** Stores the current browser auth state in memory while cookies remain source of truth. */
export const useAuthSession = () => {
	const isAuthenticated = computed(() => authState.value !== null);

	const setAuthSession = (response: AuthResponse) => {
		authState.value = {
			csrfToken: response.csrfToken,
			expiresAt: response.expiresAt,
			user: response.user,
		};
		authStatus.value = "authenticated";
		clearLegacyAuthStorage();
	};

	const clearAuthSession = () => {
		authState.value = null;
		authStatus.value = "anonymous";
		clearLegacyAuthStorage();
	};

	const restoreAuthSession = async (): Promise<boolean> => {
		if (authStatus.value === "authenticated") {
			return true;
		}

		restoreSessionPromise ??= restoreAuthSessionOnce(setAuthSession, clearAuthSession)
			.finally(() => {
				restoreSessionPromise = undefined;
			});

		return restoreSessionPromise;
	};

	const ensureAuthSession = async (): Promise<boolean> => {
		if (authStatus.value === "authenticated") {
			return true;
		}

		if (authStatus.value === "anonymous") {
			return false;
		}

		return restoreAuthSession();
	};

	const refreshAuthSession = async (): Promise<boolean> => {
		if (authState.value === null) {
			return false;
		}

		const csrfToken = authState.value.csrfToken;

		try {
			setAuthSession(await retryTransientAuthRequest(() =>
				authApi.refreshSession(csrfToken)
			));

			return true;
		} catch (error) {
			if (!isTransientAuthError(error)) {
				clearAuthSession();

				return false;
			}

			return authState.value !== null;
		}
	};

	return {
		authState,
		authStatus,
		clearAuthSession,
		ensureAuthSession,
		isAuthenticated,
		refreshAuthSession,
		restoreAuthSession,
		setAuthSession,
	};
};

const restoreAuthSessionOnce = async (
	setAuthSession: (response: AuthResponse) => void,
	clearAuthSession: () => void,
): Promise<boolean> => {
	authStatus.value = "loading";

	try {
		const session = await retryTransientAuthRequest(authApi.getCurrentSession);

		if ("needsLogin" in session) {
			clearAuthSession();

			return false;
		}

		setAuthSession(session);

		return true;
	} catch (error) {
		if (!isTransientAuthError(error)) {
			clearAuthSession();

			return false;
		}

		if (authState.value !== null) {
			authStatus.value = "authenticated";

			return true;
		}

		return false;
	}
};

const clearLegacyAuthStorage = (): void => {
	if (typeof window !== "undefined") {
		window.localStorage.removeItem(LEGACY_AUTH_STORAGE_KEY);
	}
};
