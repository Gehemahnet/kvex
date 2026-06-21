import { ApiRequestError } from "@api/api-client";

const AUTH_REQUEST_ATTEMPTS = 8;
const AUTH_REQUEST_RETRY_DELAY_MS = 250;

/** Retries only transport and server failures that commonly occur during backend restarts. */
export const retryTransientAuthRequest = async <T>(
	request: () => Promise<T>,
	wait: (delayMs: number) => Promise<void> = waitForDelay,
): Promise<T> => {
	let lastError: unknown;

	for (let attempt = 1; attempt <= AUTH_REQUEST_ATTEMPTS; attempt += 1) {
		try {
			return await request();
		} catch (error) {
			lastError = error;

			if (!isTransientAuthError(error) || attempt === AUTH_REQUEST_ATTEMPTS) {
				throw error;
			}

			await wait(AUTH_REQUEST_RETRY_DELAY_MS);
		}
	}

	throw lastError;
};

export const isTransientAuthError = (error: unknown): boolean =>
	!(error instanceof ApiRequestError) || error.status >= 500;

const waitForDelay = (delayMs: number): Promise<void> =>
	new Promise((resolve) => window.setTimeout(resolve, delayMs));
