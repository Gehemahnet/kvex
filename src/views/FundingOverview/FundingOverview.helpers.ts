import type { MarketItemWithExchange } from "../../hooks/useFundingInfo/useFundingInfo.types";

export const getApr = (row: MarketItemWithExchange, multiplier: number) => {
	const decimals = multiplier >= 24 ? 2 : 6;
	const arbValue = (Number(row.bestApr) * multiplier * 100).toFixed(decimals);

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
		return numValue > 0 ? "positive-value" : "";
	}

	const value = row[`${columnKey}1h` as keyof typeof row];
	if (!value || value === "-") return "";

	const numValue = Number(value);
	if (numValue > 0) return "positive-value";
	if (numValue < 0) return "negative-value";
	return "";
};
