import type {
	FundingExchange,
	FundingOverviewExchangeCell,
	FundingOverviewRow,
	FundingTimeframe,
} from "./FundingOverview.types";
import {
	DEFAULT_FUNDING_EXCHANGES,
	DEFAULT_FUNDING_TIMEFRAME,
	FUNDING_EXCHANGE_OPTIONS,
	FUNDING_TIMEFRAME_OPTIONS,
} from "./FundingOverview.constants";

/** Checks whether an unknown persisted value is a supported funding timeframe. */
export const isFundingTimeframe = (
	value: unknown,
): value is FundingTimeframe =>
	typeof value === "string" &&
	FUNDING_TIMEFRAME_OPTIONS.some((option) => option.value === value);

/** Checks whether an unknown persisted value is one of the enabled exchanges. */
export const isFundingExchange = (value: unknown): value is FundingExchange =>
	typeof value === "string" &&
	FUNDING_EXCHANGE_OPTIONS.some((option) => option.value === value);

/** Falls back to the default timeframe when localStorage contains stale data. */
export const normalizeFundingTimeframe = (
	timeframe: unknown,
): FundingTimeframe =>
	isFundingTimeframe(timeframe) ? timeframe : DEFAULT_FUNDING_TIMEFRAME;

/**
 * Keeps only unique supported exchanges and restores defaults when the saved
 * selection is empty or incompatible with the current exchange list.
 */
export const normalizeFundingExchanges = (
	exchanges: unknown,
): FundingExchange[] => {
	if (!Array.isArray(exchanges)) {
		return [...DEFAULT_FUNDING_EXCHANGES];
	}

	const uniqueExchanges = [...new Set(exchanges)].filter(isFundingExchange);

	return uniqueExchanges.length > 0
		? uniqueExchanges
		: [...DEFAULT_FUNDING_EXCHANGES];
};

export const isFundingExchangeList = (
	value: unknown,
): value is FundingExchange[] =>
	Array.isArray(value) && value.length > 0 && value.every(isFundingExchange);

export const isStringList = (value: unknown): value is string[] =>
	Array.isArray(value) && value.every((item) => typeof item === "string");

/** Normalizes pinned symbols from localStorage and removes duplicates. */
export const normalizePinnedSymbols = (symbols: unknown): string[] => {
	if (!Array.isArray(symbols)) {
		return [];
	}

	return [
		...new Set(
			symbols
				.filter((symbol): symbol is string => typeof symbol === "string")
				.map((symbol) => symbol.trim().toUpperCase())
				.filter(Boolean),
		),
	];
};

/** Hides empty funding values so the table only highlights actionable rates. */
export const shouldShowFunding = (rate?: number | null): rate is number =>
	rate !== undefined && rate !== null && !Number.isNaN(rate) && rate !== 0;

/** Formats APR-style values with two decimal places. */
export const formatPercent = (rate?: number | null): string => {
	if (!shouldShowFunding(rate)) {
		return "";
	}

	return `${(rate * 100).toFixed(2)}%`;
};

/** Formats timeframe funding rates with enough precision for small values. */
export const formatFundingRate = (rate?: number | null): string => {
	if (!shouldShowFunding(rate)) {
		return "";
	}

	return `${(rate * 100).toFixed(6)}%`;
};

export const formatLastUpdatedAt = (timestamp?: number): string => {
	if (!timestamp) {
		return "";
	}

	return `Updated ${new Intl.DateTimeFormat("en", {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(timestamp)}`;
};

/** Applies the symbol search locally without changing the server query. */
export const filterFundingOverviewRows = (
	rows: FundingOverviewRow[],
	symbolSearch: string,
): FundingOverviewRow[] => {
	const search = symbolSearch.trim().toUpperCase();

	if (!search) {
		return rows;
	}

	return rows.filter((row) => row.symbol.includes(search));
};

/** Keeps pinned rows at the top while preserving the original order inside each group. */
export const orderFundingOverviewRows = (
	rows: FundingOverviewRow[],
	pinnedSymbols: string[],
): FundingOverviewRow[] => {
	const pinnedSymbolSet = new Set(pinnedSymbols);
	const pinnedRows = rows.filter((row) => pinnedSymbolSet.has(row.symbol));
	const regularRows = rows.filter((row) => !pinnedSymbolSet.has(row.symbol));

	return [...pinnedRows, ...regularRows];
};

/** Shows all pinned rows plus the current scroll-loaded portion of regular rows. */
export const getVisibleFundingOverviewRows = (
	rows: FundingOverviewRow[],
	pinnedSymbols: string[],
	visibleRegularRowCount: number,
): FundingOverviewRow[] => {
	const pinnedSymbolSet = new Set(pinnedSymbols);
	const orderedRows = orderFundingOverviewRows(rows, pinnedSymbols);
	const pinnedRows = orderedRows.filter((row) => pinnedSymbolSet.has(row.symbol));
	const regularRows = orderedRows.filter(
		(row) => !pinnedSymbolSet.has(row.symbol),
	);

	return [...pinnedRows, ...regularRows.slice(0, visibleRegularRowCount)];
};

export const getExchangeCell = (
	rowExchanges: Partial<Record<FundingExchange, FundingOverviewExchangeCell>>,
	exchange: FundingExchange,
): FundingOverviewExchangeCell | undefined => rowExchanges[exchange];

/** Picks a timestamp from the visible exchange cells for the table status line. */
export const getFirstExchangeTimestamp = (
	rows: FundingOverviewRow[],
	exchanges: FundingExchange[],
): number | undefined =>
	rows
		.flatMap((row) =>
			exchanges.map(
				(exchange) => getExchangeCell(row.exchanges, exchange)?.timestamp,
			),
		)
		.find((timestamp) => timestamp !== undefined);

export const getFundingValueClass = (rate?: number | null) => ({
	"kvex-rate-pill-positive": (rate ?? 0) > 0,
	"kvex-rate-pill-negative": (rate ?? 0) < 0,
});

export const getFundingTextClass = (rate?: number | null) => ({
	"kvex-rate-positive": (rate ?? 0) > 0,
	"kvex-rate-negative": (rate ?? 0) < 0,
});
