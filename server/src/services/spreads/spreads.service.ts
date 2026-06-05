import { getMarketSnapshots } from "../markets/market-snapshots.service";
import type { MarketSnapshot } from "../markets/market-snapshots.types";
import type {
	SpreadOpportunity,
	SpreadsQuery,
	SpreadsResponse,
} from "./spreads.types";
import { enrichSpreadStability } from "./spread-stability.store";
import { createSpreadOpportunity } from "./spreads.utils";

/**
 * Builds, ranks, and filters current spread opportunities from the normalized
 * market snapshot store.
 */
export const getSpreads = async (
	query: SpreadsQuery,
): Promise<SpreadsResponse> => {
	const snapshots = await getMarketSnapshots(query);
	const opportunities = createSpreadOpportunities(snapshots.data, {
		maxSnapshotAgeMs: query.maxSnapshotAgeMs,
		positionSizeUsd: query.positionSizeUsd,
		holdingPeriodHours: query.holdingPeriodHours,
	})
		.map((opportunity) => enrichSpreadStability(opportunity))
		.filter(
			(opportunity) =>
				query.minPriceSpreadPercent === undefined ||
				opportunity.priceSpreadPercent >= query.minPriceSpreadPercent,
		)
		.filter(
			(opportunity) =>
				query.minOccurrences === undefined ||
				(opportunity.stability?.occurrences ?? 0) >= query.minOccurrences,
		)
		.filter(
			(opportunity) =>
				query.minLifetimeMs === undefined ||
				(opportunity.stability?.lifetimeMs ?? 0) >= query.minLifetimeMs,
		);

	return {
		...query,
		data: opportunities,
		errors: snapshots.errors,
	};
};

const createSpreadOpportunities = (
	snapshots: MarketSnapshot[],
	options: {
		maxSnapshotAgeMs?: number;
		positionSizeUsd?: number;
		holdingPeriodHours?: number;
	},
): SpreadOpportunity[] => {
	const snapshotsBySymbol = snapshots.reduce(
		(map, snapshot) => {
			map.set(snapshot.symbol, [...(map.get(snapshot.symbol) ?? []), snapshot]);

			return map;
		},
		new Map<string, MarketSnapshot[]>(),
	);

	return [...snapshotsBySymbol.values()]
		.flatMap((symbolSnapshots) =>
			createSymbolSpreadOpportunities(symbolSnapshots, options),
		)
		.sort((first, second) => getSpreadRank(second) - getSpreadRank(first));
};

const createSymbolSpreadOpportunities = (
	snapshots: MarketSnapshot[],
	options: {
		maxSnapshotAgeMs?: number;
		positionSizeUsd?: number;
		holdingPeriodHours?: number;
	},
): SpreadOpportunity[] =>
	snapshots.flatMap((snapshot, index) =>
		snapshots
			.slice(index + 1)
			.map((candidate) => createSpreadOpportunity(snapshot, candidate, options))
			.filter((opportunity): opportunity is SpreadOpportunity =>
				opportunity !== undefined,
			),
	);

const getSpreadRank = (opportunity: SpreadOpportunity): number => {
	if (opportunity.estimatedNetSpreadPercent !== undefined) {
		return opportunity.estimatedNetSpreadPercent * opportunity.confidence;
	}

	if (opportunity.feeAdjustedPriceSpreadPercent !== undefined) {
		return opportunity.feeAdjustedPriceSpreadPercent * opportunity.confidence * 0.75;
	}

	return opportunity.priceSpreadPercent * opportunity.confidence * 0.01;
};
