import type {
	FundingExchange,
	FundingOverviewExchangeCell,
	FundingOverviewRow,
} from "@api/funding";

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

/** Formats the table status timestamp in a compact user-facing form. */
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

/** Reads a single exchange cell from a funding overview row. */
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

/** Returns badge classes for positive and negative funding values. */
export const getFundingValueClass = (rate?: number | null): string => {
	if ((rate ?? 0) > 0) {
		return "bg-[var(--kvex-success-background)] text-[var(--kvex-success-color)]";
	}

	if ((rate ?? 0) < 0) {
		return "bg-[var(--kvex-danger-background)] text-[var(--kvex-danger-color)]";
	}

	return "";
};

/** Returns text color classes for positive and negative funding values. */
export const getFundingTextClass = (rate?: number | null): string => {
	if ((rate ?? 0) > 0) {
		return "text-[var(--kvex-success-color)]";
	}

	if ((rate ?? 0) < 0) {
		return "text-[var(--kvex-danger-color)]";
	}

	return "";
};
