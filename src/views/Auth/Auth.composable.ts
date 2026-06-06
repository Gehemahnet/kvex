import { computed } from "vue";
import { useValidatedLocalStorage } from "../../common/local-storage.utils";
import type { AuthResponse, AuthUser } from "./Auth.types";
import {
	getCurrentAuthSession,
	refreshAuthSession as requestAuthSessionRefresh,
} from "./Auth.api";

const AUTH_STORAGE_KEY = "kvex-auth";

type AuthState = {
	csrfToken: string;
	expiresAt: string;
	user: AuthUser;
} | null;

/** Runtime guard for persisted auth state. */
export const isAuthState = (value: unknown): value is AuthState => {
	if (value === null) {
		return true;
	}

	if (typeof value !== "object") {
		return false;
	}

	const candidate = value as Partial<AuthResponse>;

	return typeof candidate.csrfToken === "string" &&
		typeof candidate.expiresAt === "string" &&
		Number.isFinite(Date.parse(candidate.expiresAt)) &&
		Date.parse(candidate.expiresAt) > Date.now() &&
		typeof candidate.user?.id === "string" &&
		typeof candidate.user.login === "string" &&
		(candidate.user.status === "active" || candidate.user.status === "disabled");
};

/** Stores the current auth token and user in validated localStorage. */
export const useAuthSession = () => {
	const authState = useValidatedLocalStorage<AuthState>(
		AUTH_STORAGE_KEY,
		null,
		isAuthState,
	);

	const isAuthenticated = computed(() => authState.value !== null);

	const setAuthSession = (response: AuthResponse) => {
		authState.value = {
			csrfToken: response.csrfToken,
			expiresAt: response.expiresAt,
			user: response.user,
		};
	};

	const clearAuthSession = () => {
		authState.value = null;
	};

const restoreAuthSession = async (): Promise<boolean> => {
	try {
		const session = await getCurrentAuthSession();

		if ("needsLogin" in session) {
			clearAuthSession();

			return false;
		}

		setAuthSession(session);

		return true;
	} catch {
			clearAuthSession();

			return false;
		}
	};

	const refreshAuthSession = async (): Promise<boolean> => {
		if (authState.value === null) {
			return false;
		}

		try {
			setAuthSession(await requestAuthSessionRefresh(authState.value.csrfToken));

			return true;
		} catch {
			clearAuthSession();

			return false;
		}
	};

	return {
		authState,
		clearAuthSession,
		isAuthenticated,
		refreshAuthSession,
		restoreAuthSession,
		setAuthSession,
	};
};
