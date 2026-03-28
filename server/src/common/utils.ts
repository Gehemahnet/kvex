import { Period } from "./types";

export const getFromTimestamp = (period: Period): number => {
	const now = new Date();

	now.setMinutes(0, 0, 0);

	switch (period) {
		case "DAY":
			now.setHours(now.getHours() - 24);
			break;
		case "WEEK":
			now.setHours(now.getHours() - 24 * 7);
			break;
		case "MONTH":
			now.setHours(now.getHours() - 24 * 30);
			break;
		case "YEAR":
			now.setHours(now.getHours() - 24 * 365);
			break;
	}

	return now.getTime();
};
