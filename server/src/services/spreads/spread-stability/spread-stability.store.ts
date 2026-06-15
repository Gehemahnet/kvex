import type { SpreadOpportunity, SpreadStability } from "#services/spreads/spreads-core/spreads.types";
import { SPREAD_STABILITY_RECORD_TTL_MS } from "#services/spreads/spreads-core/spreads.constants";

type SpreadStabilityRecord = {
	firstSeenAt: number;
	lastSeenAt: number;
	occurrences: number;
	averagePriceSpread: number;
	averagePriceSpreadPercent: number;
	averageFeeAdjustedPriceSpreadPercent?: number;
	feeAdjustedOccurrences: number;
	averageFundingAprSpread?: number;
	fundingOccurrences: number;
	averageEstimatedNetSpreadPercent?: number;
	estimatedNetOccurrences: number;
};

const stabilityRecords = new Map<string, SpreadStabilityRecord>();

/**
 * Adds rolling stability metadata to a spread opportunity and updates the
 * in-memory signal record keyed by symbol and directed exchange pair.
 */
export const enrichSpreadStability = (
	opportunity: SpreadOpportunity,
	now = Date.now(),
): SpreadOpportunity => {
	pruneExpiredSpreadStability(now);

	const key = createSpreadStabilityKey(opportunity);
	const record = stabilityRecords.get(key);
	const nextRecord = record === undefined
		? createInitialRecord(opportunity, now)
		: updateRecord(record, opportunity, now);

	stabilityRecords.set(key, nextRecord);

	return {
		...opportunity,
		stability: createSpreadStability(nextRecord),
	};
};

/** Clears all in-memory spread stability records. */
export const resetSpreadStability = (): void => {
	stabilityRecords.clear();
};

/** Removes stability records that have not been observed within the TTL. */
export const pruneExpiredSpreadStability = (now = Date.now()): void => {
	for (const [key, record] of stabilityRecords.entries()) {
		if (now - record.lastSeenAt > SPREAD_STABILITY_RECORD_TTL_MS) {
			stabilityRecords.delete(key);
		}
	}
};

const createSpreadStabilityKey = (opportunity: SpreadOpportunity): string =>
	[
		opportunity.symbol,
		opportunity.long.exchange,
		opportunity.short.exchange,
	].join(":");

const createSpreadStability = (
	record: SpreadStabilityRecord,
): SpreadStability => ({
	firstSeenAt: record.firstSeenAt,
	lastSeenAt: record.lastSeenAt,
	occurrences: record.occurrences,
	lifetimeMs: record.lastSeenAt - record.firstSeenAt,
	averagePriceSpread: record.averagePriceSpread,
	averagePriceSpreadPercent: record.averagePriceSpreadPercent,
	...(record.averageFeeAdjustedPriceSpreadPercent !== undefined
		? {
			averageFeeAdjustedPriceSpreadPercent:
				record.averageFeeAdjustedPriceSpreadPercent,
		}
		: {}),
	...(record.averageFundingAprSpread !== undefined
		? { averageFundingAprSpread: record.averageFundingAprSpread }
		: {}),
	...(record.averageEstimatedNetSpreadPercent !== undefined
		? {
			averageEstimatedNetSpreadPercent:
				record.averageEstimatedNetSpreadPercent,
		}
		: {}),
});

const createInitialRecord = (
	opportunity: SpreadOpportunity,
	now: number,
): SpreadStabilityRecord => ({
	firstSeenAt: now,
	lastSeenAt: now,
	occurrences: 1,
	averagePriceSpread: opportunity.priceSpread,
	averagePriceSpreadPercent: opportunity.priceSpreadPercent,
	averageFeeAdjustedPriceSpreadPercent:
		opportunity.feeAdjustedPriceSpreadPercent,
	feeAdjustedOccurrences:
		opportunity.feeAdjustedPriceSpreadPercent === undefined ? 0 : 1,
	averageFundingAprSpread: opportunity.fundingAprSpread,
	fundingOccurrences: opportunity.fundingAprSpread === undefined ? 0 : 1,
	averageEstimatedNetSpreadPercent: opportunity.estimatedNetSpreadPercent,
	estimatedNetOccurrences:
		opportunity.estimatedNetSpreadPercent === undefined ? 0 : 1,
});

const updateRecord = (
	record: SpreadStabilityRecord,
	opportunity: SpreadOpportunity,
	now: number,
): SpreadStabilityRecord => {
	const occurrences = record.occurrences + 1;
	const feeAdjustedOccurrences = opportunity.feeAdjustedPriceSpreadPercent === undefined
		? record.feeAdjustedOccurrences
		: record.feeAdjustedOccurrences + 1;
	const fundingOccurrences = opportunity.fundingAprSpread === undefined
		? record.fundingOccurrences
		: record.fundingOccurrences + 1;
	const estimatedNetOccurrences = opportunity.estimatedNetSpreadPercent === undefined
		? record.estimatedNetOccurrences
		: record.estimatedNetOccurrences + 1;

	return {
		firstSeenAt: record.firstSeenAt,
		lastSeenAt: now,
		occurrences,
		averagePriceSpread: updateAverage(
			record.averagePriceSpread,
			opportunity.priceSpread,
			occurrences,
		),
		averagePriceSpreadPercent: updateAverage(
			record.averagePriceSpreadPercent,
			opportunity.priceSpreadPercent,
			occurrences,
		),
		averageFeeAdjustedPriceSpreadPercent: updateOptionalAverage(
			record.averageFeeAdjustedPriceSpreadPercent,
			record.feeAdjustedOccurrences,
			opportunity.feeAdjustedPriceSpreadPercent,
			feeAdjustedOccurrences,
		),
		feeAdjustedOccurrences,
		averageFundingAprSpread: updateOptionalAverage(
			record.averageFundingAprSpread,
			record.fundingOccurrences,
			opportunity.fundingAprSpread,
			fundingOccurrences,
		),
		fundingOccurrences,
		averageEstimatedNetSpreadPercent: updateOptionalAverage(
			record.averageEstimatedNetSpreadPercent,
			record.estimatedNetOccurrences,
			opportunity.estimatedNetSpreadPercent,
			estimatedNetOccurrences,
		),
		estimatedNetOccurrences,
	};
};

const updateAverage = (
	currentAverage: number,
	nextValue: number,
	nextOccurrences: number,
): number =>
	currentAverage + (nextValue - currentAverage) / nextOccurrences;

const updateOptionalAverage = (
	currentAverage: number | undefined,
	currentOccurrences: number,
	nextValue: number | undefined,
	nextOccurrences: number,
): number | undefined => {
	if (nextValue === undefined) {
		return currentAverage;
	}

	if (currentAverage === undefined || currentOccurrences === 0) {
		return nextValue;
	}

	return currentAverage + (nextValue - currentAverage) / nextOccurrences;
};
