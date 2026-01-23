import type { MarketItemWithExchange } from "../../hooks/useFundingInfo/useFundingInfo.types";

export const getApr = (row: MarketItemWithExchange) => {
	const YEAR_MULTIPLIER = 8760; // 365 * 24 hours
	const arbValue = (Number(row.bestApr) * YEAR_MULTIPLIER * 100).toFixed(2);

	return `${arbValue}%`;
};

export const getExchangePair = (row: MarketItemWithExchange) => {
	const shortExchange = row.shortExchange?.toUpperCase();
	const longExchange = row.longExchange?.toUpperCase();
	return `(S: ${shortExchange}, L: ${longExchange})`;
};

export const getDataAccordingToMultiplier = (
	row: MarketItemWithExchange,
	columnKey: string,
	multiplier: number,
) => {
	const value =
		columnKey === "bestApr"
			? row.bestApr
			: row[`${columnKey}1h` as keyof typeof row];

	const decimals = multiplier >= 24 ? 2 : 6;
	return value
		? `${(Number(value) * multiplier * 100).toFixed(decimals)}%`
		: "-";
};

export const getValueColorClass = (
	row: MarketItemWithExchange,
	columnKey: string,
) => {
	if (columnKey === "bestApr") {
		const value = row.bestApr;
		if (!value || value === "-") return "";
		const numValue = Number(value);
		return numValue > 0 ? "text-success" : "";
	}

	const value = row[`${columnKey}1h` as keyof typeof row];
	if (!value || value === "-") return "";

	const numValue = Number(value);
	if (numValue > 0) return "text-success";
	if (numValue < 0) return "text-danger";
	return "";
};
