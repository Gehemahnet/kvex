import { getFundingOverviewExchangeCells } from "../funding/funding-overview.service";
import type {
	MarketSnapshotsQuery,
	MarketSnapshotsResponse,
} from "./market-snapshots.types";
import {
	filterMarketSnapshotsBySymbol,
	mapFundingCellToMarketSnapshot,
} from "./market-snapshots.utils";
import {
	getStoredMarketSnapshots,
	upsertMarketSnapshots,
} from "./market-snapshot-store";

/**
 * Bootstraps market snapshots from batch funding overview data, merges them
 * into the live snapshot store, and returns the current store view.
 */
export const getMarketSnapshots = async (
	query: MarketSnapshotsQuery,
): Promise<MarketSnapshotsResponse> => {
	const cells = await getFundingOverviewExchangeCells(query.exchanges);
	const snapshots = cells.data.map(mapFundingCellToMarketSnapshot);
	const filteredSnapshots = filterMarketSnapshotsBySymbol(snapshots, query.symbol);

	upsertMarketSnapshots(filteredSnapshots);

	return {
		...query,
		data: getStoredMarketSnapshots(query),
		errors: cells.errors,
	};
};
