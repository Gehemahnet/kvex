const DEFAULT_AUTH_SESSION_DAYS = 7;
const SECONDS_IN_DAY = 60 * 60 * 24;

/** Returns the JWT signing secret from process environment. */
export const getAuthJwtSecret = (): string | undefined =>
	process.env.AUTH_JWT_SECRET?.trim() || undefined;

/** Returns the configured auth session duration in seconds. */
export const getAuthSessionTtlSeconds = (): number =>
	parseAuthSessionDays(process.env.AUTH_SESSION_DAYS) * SECONDS_IN_DAY;

/** Parses AUTH_SESSION_DAYS and falls back to the default for unsafe values. */
export const parseAuthSessionDays = (value: string | undefined): number => {
	if (value === undefined || !value.trim()) {
		return DEFAULT_AUTH_SESSION_DAYS;
	}

	const days = Number(value);

	return Number.isInteger(days) && days > 0 ? days : DEFAULT_AUTH_SESSION_DAYS;
};
