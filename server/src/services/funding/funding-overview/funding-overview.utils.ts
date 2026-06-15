import { PERIOD_POINTS } from "#common/constants";
import type { Exchange, Period } from "#common/types";
import { FUNDING_HOURS_PER_YEAR } from "#services/funding/funding-core/funding.constants";
import type {
	FundingOverviewExchangeCell,
	FundingOverviewRow,
} from "./funding-overview.types";

/** Annualizes a funding rate that is already normalized to one hour. */
export const annualizeHourlyFundingRate = (fundingRate?: number): number | undefined => {
	if (fundingRate === undefined || Number.isNaN(fundingRate)) {
		return undefined;
	}

	return fundingRate * FUNDING_HOURS_PER_YEAR;
};

/** Converts an exchange-native interval funding rate into an hourly rate. */
export const normalizeFundingRateToHourly = (
	fundingRate?: number,
	intervalHours = 1,
): number | undefined => {
	if (
		fundingRate === undefined ||
		Number.isNaN(fundingRate) ||
		intervalHours <= 0
	) {
		return undefined;
	}

	return fundingRate / intervalHours;
};

/** Annualizes a funding rate from an exchange-native funding interval. */
export const annualizeFundingRate = (
	fundingRate?: number,
	intervalHours = 1,
): number | undefined =>
	annualizeHourlyFundingRate(
		normalizeFundingRateToHourly(fundingRate, intervalHours),
	);

/** Normalizes exchange market names to a comparable base symbol. */
export const normalizeOverviewSymbol = (symbol: string): string =>
	symbol.trim().toUpperCase().split(/[-_/]/)[0];

/** Converts second-based timestamps to milliseconds while preserving millisecond timestamps. */
export const normalizeOptionalTimestamp = (
	timestamp?: number,
): number | undefined => {
	if (!timestamp) {
		return undefined;
	}

	return timestamp < 1_000_000_000_000 ? timestamp * 1000 : timestamp;
};

/** Groups exchange funding cells into one row per normalized symbol. */
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
			fundingIntervalHours: cell.fundingIntervalHours,
			apr: cell.apr,
			timestamp: cell.timestamp,
		});
		rowsBySymbol.set(symbol, row);
	}

	return [...rowsBySymbol.values()]
		.filter(hasVisibleFundingValues)
		.sort((a, b) => a.symbol.localeCompare(b.symbol));
};

/** Scales hourly funding values to the requested UI timeframe. */
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
	...(cell.fundingIntervalHours ? { fundingIntervalHours: cell.fundingIntervalHours } : {}),
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

/** Creates a deterministic cache key for funding overview responses. */
export const createFundingOverviewCacheKey = (
	timeframe: string,
	exchanges: Exchange[],
): string => `funding-overview:${timeframe}:${exchanges.join(",")}`;
