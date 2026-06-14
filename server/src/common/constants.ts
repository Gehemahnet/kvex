import { Period } from "./types";

export const HOUR_IN_MS = 60 * 60 * 1000;

export const DURATIONS: Record<Period, number> = {
	DAY: 86400000,
	WEEK: 7 * 86400000,
	MONTH: 30 * 86400000,
	YEAR: 365 * 86400000,
};

export const PERIOD_POINTS: Record<Period, number> = {
	DAY: DURATIONS.DAY / HOUR_IN_MS,
	WEEK: DURATIONS.WEEK / HOUR_IN_MS,
	MONTH: DURATIONS.MONTH / HOUR_IN_MS,
	YEAR: DURATIONS.YEAR / HOUR_IN_MS,
};

export const ALL_PERIODS: Period[] = ["DAY", "WEEK", "MONTH", "YEAR"];

export const DEFAULT_CURRENCY = "USD";
