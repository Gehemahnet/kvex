import { Period } from "./types";

export const DURATIONS: Record<Period, number> = {
	DAY: 86400000,
	WEEK: 7 * 86400000,
	MONTH: 30 * 86400000,
	YEAR: 365 * 86400000,
};
