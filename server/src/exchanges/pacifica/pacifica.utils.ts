import { HOUR_IN_MS, PERIOD_POINTS } from "../../common/constants";
import { Period } from "../../common/types";
import type { FundingRateHistory } from "./pacifica.types";

export const normalizeFundingHistory = (
	period: Period,
	rows: FundingRateHistory[],
): FundingRateHistory[] => {
	if (rows.length === 0) {
		return [];
	}

	const sortedRows = [...rows].sort((a, b) =>
		a.created_at > b.created_at ? 1 : -1,
	);
	const rowsByHour = new Map<number, FundingRateHistory>();

	for (const row of sortedRows) {
		rowsByHour.set(toHourTimestamp(row.created_at), row);
	}

	const expectedPoints = PERIOD_POINTS[period];
	const lastHour = toHourTimestamp(sortedRows[sortedRows.length - 1].created_at);
	const firstHour = lastHour - (expectedPoints - 1) * HOUR_IN_MS;
	const normalizedRows: FundingRateHistory[] = [];
	let fallbackRow = rowsByHour.get(firstHour) ?? sortedRows[0];

	for (
		let currentHour = firstHour;
		currentHour <= lastHour;
		currentHour += HOUR_IN_MS
	) {
		const existingRow = rowsByHour.get(currentHour);

		if (existingRow) {
			fallbackRow = existingRow;
			normalizedRows.push(existingRow);
			continue;
		}

		normalizedRows.push({
			...fallbackRow,
			created_at: currentHour,
		});
	}

	return normalizedRows;
};

export const toHourTimestamp = (timestamp: number): number =>
	Math.floor(timestamp / HOUR_IN_MS) * HOUR_IN_MS;
