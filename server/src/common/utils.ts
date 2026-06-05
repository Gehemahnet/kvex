import { DURATIONS } from "./constants";
import { Period } from "./types";

/** Calculates the start timestamp for a historical period aligned to the current hour. */
export const getFromTimestamp = (period: Period): number => {
	const now = new Date();

	now.setMinutes(0, 0, 0);

	return now.getTime() - DURATIONS[period];
};
