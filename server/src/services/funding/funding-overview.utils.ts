import { PERIOD_POINTS } from "../../common/constants";
import type { Exchange, Period } from "../../common/types";
import { FUNDING_HOURS_PER_YEAR } from "./funding.constants";
import type {
	FundingOverviewExchangeCell,
	FundingOverviewRow,
} from "./funding-overview.types";

export const annualizeHourlyFundingRate = (fundingRate?: number): number | undefined => {
	if (fundingRate === undefined || Number.isNaN(fundingRate)) {
		return undefined;
	}

	return fundingRate * FUNDING_HOURS_PER_YEAR;
};

export const normalizeOverviewSymbol = (symbol: string): string =>
	symbol.trim().toUpperCase().split(/[-_/]/)[0];

export const normalizeOptionalTimestamp = (
	timestamp?: number,
): number | undefined => {
	if (!timestamp) {
		return undefined;
	}

	return timestamp < 1_000_000_000_000 ? timestamp * 1000 : timestamp;
};

export const createFundingOverviewRows = (
	cells: FundingOverviewExchangeCell[],
): FundingOverviewRow[] => {
	const rowsBySymbol = new Map<string, FundingOverviewRow>();

	for (const cell of cells) {
		const symbol = normalizeOverviewSymbol(cell.sourceSymbol);
		const row = rowsBySymbol.get(symbol) ?? createEmptyFundingOverviewRow(symbol);

		row.exchanges[cell.exchange] = removeEmptyFundingValues({
			exchange: cell.exchange,
			sourceSymbol: normalizeOverviewSymbol(cell.sourceSymbol),
			fundingRate: cell.fundingRate,
			nextFundingRate: cell.nextFundingRate,
			apr: cell.apr,
			timestamp: cell.timestamp,
		});
		rowsBySymbol.set(symbol, row);
	}

	return [...rowsBySymbol.values()]
		.filter(hasVisibleFundingValues)
		.sort((a, b) => a.symbol.localeCompare(b.symbol));
};

export const scaleFundingOverviewCellsToTimeframe = (
	cells: FundingOverviewExchangeCell[],
	timeframe: Period,
): FundingOverviewExchangeCell[] => {
	const multiplier = PERIOD_POINTS[timeframe];

	return cells.map((cell) => ({
		...cell,
		fundingRate:
			cell.fundingRate !== undefined ? cell.fundingRate * multiplier : undefined,
		nextFundingRate:
			cell.nextFundingRate !== undefined
				? cell.nextFundingRate * multiplier
				: undefined,
	}));
};

const createEmptyFundingOverviewRow = (symbol: string): FundingOverviewRow => ({
	symbol,
	exchanges: {},
});

const removeEmptyFundingValues = (
	cell: FundingOverviewExchangeCell,
): FundingOverviewExchangeCell => ({
	exchange: cell.exchange,
	sourceSymbol: cell.sourceSymbol,
	...(cell.fundingRate ? { fundingRate: cell.fundingRate } : {}),
	...(cell.nextFundingRate ? { nextFundingRate: cell.nextFundingRate } : {}),
	...(cell.apr ? { apr: cell.apr } : {}),
	...(cell.timestamp ? { timestamp: cell.timestamp } : {}),
});

const hasVisibleFundingValues = (row: FundingOverviewRow): boolean =>
	Object.values(row.exchanges).some(
		(cell) =>
			cell !== undefined &&
			(cell.fundingRate !== undefined ||
				cell.nextFundingRate !== undefined ||
				cell.apr !== undefined),
	);

export const createFundingOverviewCacheKey = (
	timeframe: string,
	exchanges: Exchange[],
): string => `funding-overview:${timeframe}:${exchanges.join(",")}`;
