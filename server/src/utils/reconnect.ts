export interface ReconnectManager {
	attempt: (connectFn: () => void) => void;
	reset: () => void;
	cancel: () => void;
	setMaxAttempts: () => void;
}

export const createReconnectManager = (
	name: string,
	maxAttempts = 10,
	delayMs = 3000
): ReconnectManager => {
	let attempts = 0;
	let timeout: ReturnType<typeof setTimeout> | null = null;

	const cancel = () => {
		if (timeout) {
			clearTimeout(timeout);
			timeout = null;
		}
	};

	return {
		attempt: (connectFn) => {
			if (attempts >= maxAttempts) {
				console.error(`[${name}] Max reconnect attempts reached`);
				return;
			}

			attempts++;
			console.log(`[${name}] Reconnecting (${attempts}/${maxAttempts})...`);
			timeout = setTimeout(connectFn, delayMs);
		},
		reset: () => {
			attempts = 0;
		},
		cancel,
		setMaxAttempts: () => {
			attempts = maxAttempts;
		},
	};
};
