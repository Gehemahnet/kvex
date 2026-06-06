import type { Exchange } from "../../common/types";
import { getRedisClient } from "../../common/redis-client";
import type { MarketSnapshot, MarketSnapshotsQuery } from "./market-snapshots.types";
import {
	MARKET_SNAPSHOT_REDIS_KEY_PREFIX,
	MARKET_SNAPSHOT_REDIS_TTL_SECONDS,
} from "./market-snapshots.constants";
import {
	enrichMarketSnapshotIdentity,
	isTradableMarketSymbol,
} from "./market-snapshots.utils";

const marketSnapshots = new Map<string, MarketSnapshot>();
const memoryHydratedExchanges = new Set<Exchange>();

/**
 * Inserts or merges a normalized market snapshot and stamps field-level
 * freshness for price, funding, and liquidity data.
 */
export const upsertMarketSnapshot = async (
	snapshot: MarketSnapshot,
): Promise<void> => {
	const enrichedSnapshot = enrichMarketSnapshotIdentity(snapshot);

	if (!isTradableMarketSymbol(enrichedSnapshot.symbol)) {
		return;
	}

	const key = createMarketSnapshotKey(
		enrichedSnapshot.exchange,
		enrichedSnapshot.symbol,
	);
	const previousSnapshot = marketSnapshots.get(key);
	const receivedAt = Date.now();

	const storedSnapshot = {
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
	};

	marketSnapshots.set(key, storedSnapshot);
	await setRedisMarketSnapshot(storedSnapshot);
};

/** Inserts multiple snapshots into the shared in-memory market snapshot store. */
export const upsertMarketSnapshots = async (
	snapshots: MarketSnapshot[],
): Promise<void> => {
	for (const snapshot of snapshots) {
		await upsertMarketSnapshot(snapshot);
	}
};

/** Returns stored snapshots filtered by exchange and optional normalized symbol. */
export const getStoredMarketSnapshots = async (
	query: MarketSnapshotsQuery,
): Promise<MarketSnapshot[]> => {
	const memorySnapshots = getMemoryMarketSnapshots(query);

	if (canUseMemoryMarketSnapshots(memorySnapshots, query)) {
		return memorySnapshots;
	}

	const snapshotsByKey = new Map<string, MarketSnapshot>();
	const redisSnapshots = await getRedisMarketSnapshots(query);

	for (const snapshot of redisSnapshots) {
		marketSnapshots.set(
			createMarketSnapshotKey(snapshot.exchange, snapshot.symbol),
			snapshot,
		);
		snapshotsByKey.set(
			createMarketSnapshotKey(snapshot.exchange, snapshot.symbol),
			snapshot,
		);
	}

	for (const snapshot of memorySnapshots) {
		const key = createMarketSnapshotKey(snapshot.exchange, snapshot.symbol);
		const previousSnapshot = snapshotsByKey.get(key);

		if ((snapshot.receivedAt ?? 0) >= (previousSnapshot?.receivedAt ?? 0)) {
			snapshotsByKey.set(key, snapshot);
		}
	}

	const storedSnapshots = [...snapshotsByKey.values()]
		.filter((snapshot) => query.exchanges.includes(snapshot.exchange))
		.filter((snapshot) => !query.symbol || snapshot.symbol === query.symbol)
		.sort(sortMarketSnapshots);

	if (query.symbol === undefined && hasMarketSnapshotCoverage(storedSnapshots, query)) {
		markMarketSnapshotExchangesHydrated(query.exchanges);
	}

	return storedSnapshots;
};

/** Returns true when stored snapshots cover every requested exchange. */
export const hasMarketSnapshotCoverage = (
	snapshots: MarketSnapshot[],
	query: MarketSnapshotsQuery,
): boolean => {
	if (snapshots.length === 0) {
		return false;
	}

	const coveredExchanges = new Set(snapshots.map((snapshot) => snapshot.exchange));

	return query.exchanges.every((exchange) => coveredExchanges.has(exchange));
};

/** Marks exchange snapshot sets as fully hydrated in memory. */
export const markMarketSnapshotExchangesHydrated = (exchanges: Exchange[]): void => {
	for (const exchange of exchanges) {
		memoryHydratedExchanges.add(exchange);
	}
};

/** Clears the in-memory snapshot store; intended for tests and controlled resets. */
export const clearMarketSnapshotStore = (): void => {
	marketSnapshots.clear();
	memoryHydratedExchanges.clear();
};

const createMarketSnapshotKey = (exchange: Exchange, symbol: string): string =>
	`${exchange}:${symbol}`;

const getMemoryMarketSnapshots = (query: MarketSnapshotsQuery): MarketSnapshot[] =>
	[...marketSnapshots.values()]
		.filter((snapshot) => query.exchanges.includes(snapshot.exchange))
		.filter((snapshot) => !query.symbol || snapshot.symbol === query.symbol)
		.sort(sortMarketSnapshots);

const canUseMemoryMarketSnapshots = (
	snapshots: MarketSnapshot[],
	query: MarketSnapshotsQuery,
): boolean =>
	hasMarketSnapshotCoverage(snapshots, query) &&
	(query.symbol !== undefined ||
		query.exchanges.every((exchange) => memoryHydratedExchanges.has(exchange)));

const createRedisMarketSnapshotKey = (exchange: Exchange, symbol: string): string =>
	`${MARKET_SNAPSHOT_REDIS_KEY_PREFIX}:${exchange}:${symbol}`;

const createRedisMarketSnapshotMatch = (exchange: Exchange): string =>
	`${MARKET_SNAPSHOT_REDIS_KEY_PREFIX}:${exchange}:*`;

const setRedisMarketSnapshot = async (snapshot: MarketSnapshot): Promise<void> => {
	try {
		const client = await getRedisClient();

		if (client === undefined) {
			return;
		}

		await client.set(
			createRedisMarketSnapshotKey(snapshot.exchange, snapshot.symbol),
			JSON.stringify(snapshot),
			{ EX: MARKET_SNAPSHOT_REDIS_TTL_SECONDS },
		);
	} catch {
		// Redis is a hot-cache layer; in-memory snapshots remain the fallback source.
	}
};

const getRedisMarketSnapshots = async (
	query: MarketSnapshotsQuery,
): Promise<MarketSnapshot[]> => {
	try {
		const client = await getRedisClient();

		if (client === undefined) {
			return [];
		}

		const keys = query.symbol === undefined
			? await scanRedisMarketSnapshotKeys(query.exchanges)
			: query.exchanges.map((exchange) =>
				createRedisMarketSnapshotKey(exchange, query.symbol as string),
			);

		if (keys.length === 0) {
			return [];
		}

		const values = await client.mGet(keys);

		return values.flatMap(parseRedisMarketSnapshot);
	} catch {
		return [];
	}
};

const scanRedisMarketSnapshotKeys = async (
	exchanges: Exchange[],
): Promise<string[]> => {
	const client = await getRedisClient();

	if (client === undefined) {
		return [];
	}

	const keys: string[] = [];

	for (const exchange of exchanges) {
		for await (const key of client.scanIterator({
			MATCH: createRedisMarketSnapshotMatch(exchange),
			COUNT: 100,
		})) {
			keys.push(String(key));
		}
	}

	return keys;
};

const parseRedisMarketSnapshot = (value: string | null): MarketSnapshot[] => {
	if (value === null) {
		return [];
	}

	try {
		const snapshot = JSON.parse(value) as MarketSnapshot;

		if (
			typeof snapshot.exchange !== "string" ||
			typeof snapshot.symbol !== "string" ||
			typeof snapshot.sourceSymbol !== "string"
		) {
			return [];
		}

		return [snapshot];
	} catch {
		return [];
	}
};

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
