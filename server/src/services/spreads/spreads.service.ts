import { observeSpreadsRun } from "../../common/metrics";
import { getMarketSnapshots } from "../markets/market-snapshots.service";
import type { MarketSnapshot } from "../markets/market-snapshots.types";
import type {
	SpreadOpportunity,
	SpreadsQuery,
	SpreadsResponse,
} from "./spreads.types";
import { enrichSpreadStability } from "./spread-stability.store";
import { compactSpreadOpportunity } from "./spreads-response.utils";
import { createSpreadOpportunity } from "./spreads.utils";

type SpreadBuildOptions = {
	maxSnapshotAgeMs?: number;
	positionSizeUsd?: number;
	holdingPeriodHours?: number;
};

type SpreadsRunTimings = {
	snapshotLoadMs: number;
	pairingMs: number;
	stabilityMs: number;
	filterMs: number;
	compactMs: number;
};

/**
 * Builds, ranks, and filters current spread opportunities from the normalized
 * market snapshot store.
 */
export const getSpreads = async (
	query: SpreadsQuery,
): Promise<SpreadsResponse> => {
	const startedAt = performance.now();
	const snapshotLoadStartedAt = performance.now();
	const snapshots = await getMarketSnapshots(query);
	const snapshotLoadMs = performance.now() - snapshotLoadStartedAt;

	const pairingStartedAt = performance.now();
	const rawOpportunities = createSpreadOpportunities(
		snapshots.data,
		createSpreadBuildOptions(query),
	);
	const pairingMs = performance.now() - pairingStartedAt;

	const stabilityStartedAt = performance.now();
	const stableOpportunities = enrichSpreadOpportunities(rawOpportunities);
	const stabilityMs = performance.now() - stabilityStartedAt;

	const filterStartedAt = performance.now();
	const opportunities = filterSpreadOpportunities(stableOpportunities, query);
	const filterMs = performance.now() - filterStartedAt;

	const compactStartedAt = performance.now();
	const compactOpportunities = opportunities.map(compactSpreadOpportunity);
	const compactMs = performance.now() - compactStartedAt;
	const response: SpreadsResponse = {
		...query,
		data: compactOpportunities,
		errors: snapshots.errors,
	};

	observeSpreadsResponse(response, {
		compactMs,
		filterMs,
		pairingMs,
		snapshotLoadMs,
		stabilityMs,
	}, {
		durationMs: performance.now() - startedAt,
		errorCount: snapshots.errors.length,
		filteredOpportunityCount: opportunities.length,
		rawOpportunityCount: rawOpportunities.length,
		snapshotCount: snapshots.data.length,
	});

	return response;
};

const createSpreadBuildOptions = (query: SpreadsQuery): SpreadBuildOptions => ({
	maxSnapshotAgeMs: query.maxSnapshotAgeMs,
	positionSizeUsd: query.positionSizeUsd,
	holdingPeriodHours: query.holdingPeriodHours,
});

const enrichSpreadOpportunities = (
	opportunities: SpreadOpportunity[],
): SpreadOpportunity[] =>
	opportunities.map((opportunity) => enrichSpreadStability(opportunity));

const filterSpreadOpportunities = (
	opportunities: SpreadOpportunity[],
	query: SpreadsQuery,
): SpreadOpportunity[] =>
	opportunities.filter((opportunity) =>
		matchesMinPriceSpread(opportunity, query) &&
		matchesMinOccurrences(opportunity, query) &&
		matchesMinLifetime(opportunity, query),
	);

const matchesMinPriceSpread = (
	opportunity: SpreadOpportunity,
	query: Pick<SpreadsQuery, "minPriceSpreadPercent">,
): boolean =>
	query.minPriceSpreadPercent === undefined ||
	opportunity.priceSpreadPercent >= query.minPriceSpreadPercent;

const matchesMinOccurrences = (
	opportunity: SpreadOpportunity,
	query: Pick<SpreadsQuery, "minOccurrences">,
): boolean =>
	query.minOccurrences === undefined ||
	(opportunity.stability?.occurrences ?? 0) >= query.minOccurrences;

const matchesMinLifetime = (
	opportunity: SpreadOpportunity,
	query: Pick<SpreadsQuery, "minLifetimeMs">,
): boolean =>
	query.minLifetimeMs === undefined ||
	(opportunity.stability?.lifetimeMs ?? 0) >= query.minLifetimeMs;

const observeSpreadsResponse = (
	response: SpreadsResponse,
	timings: SpreadsRunTimings,
	counts: {
		durationMs: number;
		errorCount: number;
		filteredOpportunityCount: number;
		rawOpportunityCount: number;
		snapshotCount: number;
	},
): void => {
	observeSpreadsRun({
		...counts,
		...timings,
		responseOpportunityCount: response.data.length,
		responseBytes: Buffer.byteLength(JSON.stringify(response)),
	});
};

const createSpreadOpportunities = (
	snapshots: MarketSnapshot[],
	options: SpreadBuildOptions,
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
	options: SpreadBuildOptions,
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
