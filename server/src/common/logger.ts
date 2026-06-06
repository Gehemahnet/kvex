type LogLevel = "debug" | "info" | "warn" | "error";

type LogFields = Record<string, boolean | number | string | null | undefined>;

const LOG_LEVEL_ORDER: Record<LogLevel, number> = {
	debug: 0,
	info: 1,
	warn: 2,
	error: 3,
};

const DEFAULT_LOG_LEVEL: LogLevel = "info";

/** Writes structured JSON logs with a small level filter. */
export const log = (level: LogLevel, message: string, fields: LogFields = {}) => {
	if (LOG_LEVEL_ORDER[level] < LOG_LEVEL_ORDER[getLogLevel()]) {
		return;
	}

	const entry = {
		timestamp: new Date().toISOString(),
		level,
		message,
		...fields,
	};

	const serializedEntry = JSON.stringify(entry);

	if (level === "error") {
		console.error(serializedEntry);
		return;
	}

	if (level === "warn") {
		console.warn(serializedEntry);
		return;
	}

	console.log(serializedEntry);
};

const getLogLevel = (): LogLevel => {
	const rawLevel = process.env.LOG_LEVEL?.toLowerCase();

	return isLogLevel(rawLevel) ? rawLevel : DEFAULT_LOG_LEVEL;
};

const isLogLevel = (value: string | undefined): value is LogLevel =>
	value !== undefined && value in LOG_LEVEL_ORDER;
