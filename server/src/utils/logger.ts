const DEBUG = process.env.DEBUG === "true";

export interface StatsLogger {
	increment: () => void;
	start: () => void;
	stop: () => void;
	reset: () => void;
}

export const createStatsLogger = (
	name: string,
	getExtra: () => string,
	intervalMs = 30000
): StatsLogger => {
	let count = 0;
	let lastTime = Date.now();
	let interval: ReturnType<typeof setInterval> | null = null;

	const log = () => {
		const now = Date.now();
		const elapsed = (now - lastTime) / 1000;
		const rate = count / elapsed;
		console.log(
			`[${name}] Stats: ${count} msgs in ${elapsed.toFixed(0)}s (${rate.toFixed(1)}/s), ${getExtra()}`
		);
		count = 0;
		lastTime = now;
	};

	const stop = () => {
		if (interval) {
			clearInterval(interval);
			interval = null;
		}
	};

	const start = () => {
		stop();
		if (DEBUG) {
			interval = setInterval(log, intervalMs);
		}
	};

	const reset = () => {
		count = 0;
		lastTime = Date.now();
	};

	return {
		increment: () => count++,
		start,
		stop,
		reset,
	};
};
