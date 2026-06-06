import { getFundingOverviewExchangeCells } from "../funding/funding-overview.service";
import type {
	MarketSnapshotsQuery,
	MarketSnapshotsResponse,
} from "./market-snapshots.types";
import {
	MARKET_SNAPSHOT_BOOTSTRAP_FRESHNESS_MS,
} from "./market-snapshots.constants";
import {
	filterMarketSnapshotsBySymbol,
	mapFundingCellToMarketSnapshot,
} from "./market-snapshots.utils";
import {
	getStoredMarketSnapshots,
	hasMarketSnapshotCoverage,
	markMarketSnapshotExchangesHydrated,
	upsertMarketSnapshots,
} from "./market-snapshot-store";

/**
 * Bootstraps market snapshots from batch funding overview data, merges them
 * into the live snapshot store, and returns the current store view.
 */
export const getMarketSnapshots = async (
	query: MarketSnapshotsQuery,
): Promise<MarketSnapshotsResponse> => {
	const storedSnapshots = await getStoredMarketSnapshots(query);

	if (
		hasMarketSnapshotCoverage(storedSnapshots, query) &&
		hasFreshMarketSnapshots(storedSnapshots)
	) {
		return {
			...query,
			data: storedSnapshots,
			errors: [],
		};
	}

	const cells = await getFundingOverviewExchangeCells(query.exchanges);
	const snapshots = cells.data.map(mapFundingCellToMarketSnapshot);
	const filteredSnapshots = filterMarketSnapshotsBySymbol(snapshots, query.symbol);

	await upsertMarketSnapshots(filteredSnapshots);
	markMarketSnapshotExchangesHydrated(query.exchanges);

	return {
		...query,
		data: await getStoredMarketSnapshots(query),
		errors: cells.errors,
	};
};

const hasFreshMarketSnapshots = (snapshots: { receivedAt?: number }[]): boolean => {
	const now = Date.now();

	return snapshots.every((snapshot) =>
		snapshot.receivedAt !== undefined &&
		now - snapshot.receivedAt <= MARKET_SNAPSHOT_BOOTSTRAP_FRESHNESS_MS,
	);
};
