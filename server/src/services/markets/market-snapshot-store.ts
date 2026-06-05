import type { Exchange } from "../../common/types";
import type { MarketSnapshot, MarketSnapshotsQuery } from "./market-snapshots.types";
import { enrichMarketSnapshotIdentity } from "./market-snapshots.utils";

const marketSnapshots = new Map<string, MarketSnapshot>();

/**
 * Inserts or merges a normalized market snapshot and stamps field-level
 * freshness for price, funding, and liquidity data.
 */
export const upsertMarketSnapshot = (snapshot: MarketSnapshot): void => {
	const enrichedSnapshot = enrichMarketSnapshotIdentity(snapshot);
	const key = createMarketSnapshotKey(
		enrichedSnapshot.exchange,
		enrichedSnapshot.symbol,
	);
	const previousSnapshot = marketSnapshots.get(key);
	const receivedAt = Date.now();

	marketSnapshots.set(key, {
		...previousSnapshot,
		...enrichedSnapshot,
		receivedAt,
		priceReceivedAt: hasPriceData(enrichedSnapshot)
			? receivedAt
			: previousSnapshot?.priceReceivedAt,
		fundingReceivedAt: hasFundingData(enrichedSnapshot)
			? receivedAt
			: previousSnapshot?.fundingReceivedAt,
		liquidityReceivedAt: hasLiquidityData(enrichedSnapshot)
			? receivedAt
			: previousSnapshot?.liquidityReceivedAt,
	});
};

/** Inserts multiple snapshots into the shared in-memory market snapshot store. */
export const upsertMarketSnapshots = (snapshots: MarketSnapshot[]): void => {
	for (const snapshot of snapshots) {
		upsertMarketSnapshot(snapshot);
	}
};

/** Returns stored snapshots filtered by exchange and optional normalized symbol. */
export const getStoredMarketSnapshots = (
	query: MarketSnapshotsQuery,
): MarketSnapshot[] =>
	[...marketSnapshots.values()]
		.filter((snapshot) => query.exchanges.includes(snapshot.exchange))
		.filter((snapshot) => !query.symbol || snapshot.symbol === query.symbol)
		.sort(sortMarketSnapshots);

/** Clears the in-memory snapshot store; intended for tests and controlled resets. */
export const clearMarketSnapshotStore = (): void => {
	marketSnapshots.clear();
};

const createMarketSnapshotKey = (exchange: Exchange, symbol: string): string =>
	`${exchange}:${symbol}`;

const hasPriceData = (snapshot: MarketSnapshot): boolean =>
	snapshot.bidPrice !== undefined ||
	snapshot.askPrice !== undefined ||
	snapshot.markPrice !== undefined ||
	snapshot.indexPrice !== undefined ||
	snapshot.midPrice !== undefined ||
	snapshot.orderBookBids !== undefined ||
	snapshot.orderBookAsks !== undefined;

const hasFundingData = (snapshot: MarketSnapshot): boolean =>
	snapshot.fundingRate !== undefined ||
	snapshot.fundingApr !== undefined ||
	snapshot.fundingIntervalHours !== undefined;

const hasLiquidityData = (snapshot: MarketSnapshot): boolean =>
	snapshot.openInterest !== undefined ||
	snapshot.volume24h !== undefined ||
	snapshot.bidSize !== undefined ||
	snapshot.askSize !== undefined ||
	snapshot.orderBookBids !== undefined ||
	snapshot.orderBookAsks !== undefined;

const sortMarketSnapshots = (
	first: MarketSnapshot,
	second: MarketSnapshot,
): number =>
	first.symbol.localeCompare(second.symbol) ||
	first.exchange.localeCompare(second.exchange);
