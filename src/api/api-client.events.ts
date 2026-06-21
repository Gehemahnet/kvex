export const BACKEND_UNAVAILABLE_EVENT = "kvex:backend-unavailable";

export const notifyBackendUnavailable = (pathname: string): void => {
	if (typeof window === "undefined") return;

	window.dispatchEvent(new CustomEvent(BACKEND_UNAVAILABLE_EVENT, {
		detail: { pathname },
	}));
};
