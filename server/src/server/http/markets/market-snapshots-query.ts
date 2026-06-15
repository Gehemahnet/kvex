import type { MarketSnapshotsQuery } from "#services/markets/market-snapshots/market-snapshots.types";
import {
	parseFundingExchanges,
	parseOptionalFundingSymbol,
} from "../funding-query.utils";

/** Parses `/markets/snapshots` REST query parameters. */
export const parseMarketSnapshotsQuery = (
	urlString: string | undefined,
): MarketSnapshotsQuery => {
	const url = new URL(urlString ?? "/", "http://localhost");
	const symbol = parseOptionalFundingSymbol(url);

	return {
		exchanges: parseFundingExchanges(url),
		...(symbol ? { symbol } : {}),
	};
};
