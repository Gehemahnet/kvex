import { DURATIONS } from "./constants";
import { Period } from "./types";

export const getFromTimestamp = (period: Period): number => {
	const now = new Date();

	now.setMinutes(0, 0, 0);

	return now.getTime() - DURATIONS[period];
};
