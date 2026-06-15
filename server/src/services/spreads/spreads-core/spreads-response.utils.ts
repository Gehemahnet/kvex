import type {
	CompactSpreadOpportunity,
	SpreadOpportunity,
} from "#services/spreads/spreads-core/spreads.types";

/** Maps the full internal spread model to the compact table API payload. */
export const compactSpreadOpportunity = (
	opportunity: SpreadOpportunity,
): CompactSpreadOpportunity => ({
	symbol: opportunity.symbol,
	long: compactSpreadSide(opportunity.long),
	short: compactSpreadSide(opportunity.short),
	priceSpread: opportunity.priceSpread,
	priceSpreadPercent: opportunity.priceSpreadPercent,
	...(opportunity.executionSlippagePercent !== undefined
		? { executionSlippagePercent: opportunity.executionSlippagePercent }
		: {}),
	confidence: opportunity.confidence,
	confidenceBreakdown: {
		priceSource: compactConfidenceComponent(
			opportunity.confidenceBreakdown.priceSource,
		),
		freshness: compactConfidenceComponent(
			opportunity.confidenceBreakdown.freshness,
		),
		funding: compactConfidenceComponent(opportunity.confidenceBreakdown.funding),
		fees: compactConfidenceComponent(opportunity.confidenceBreakdown.fees),
		liquidity: compactConfidenceComponent(
			opportunity.confidenceBreakdown.liquidity,
		),
	},
	isStale: opportunity.isStale,
	...(opportunity.maxExecutableNotionalUsd !== undefined
		? { maxExecutableNotionalUsd: opportunity.maxExecutableNotionalUsd }
		: {}),
	...(opportunity.maxExecutableNotionalReason !== undefined
		? { maxExecutableNotionalReason: opportunity.maxExecutableNotionalReason }
		: {}),
	...(opportunity.feeAdjustedPriceSpreadPercent !== undefined
		? { feeAdjustedPriceSpreadPercent: opportunity.feeAdjustedPriceSpreadPercent }
		: {}),
	...(opportunity.fundingAprSpread !== undefined
		? { fundingAprSpread: opportunity.fundingAprSpread }
		: {}),
	...(opportunity.fundingImpactPercent !== undefined
		? { fundingImpactPercent: opportunity.fundingImpactPercent }
		: {}),
	...(opportunity.estimatedNetSpreadPercent !== undefined
		? { estimatedNetSpreadPercent: opportunity.estimatedNetSpreadPercent }
		: {}),
	...(opportunity.stability
		? {
			stability: {
				occurrences: opportunity.stability.occurrences,
				lifetimeMs: opportunity.stability.lifetimeMs,
				averagePriceSpreadPercent:
					opportunity.stability.averagePriceSpreadPercent,
				...(opportunity.stability.averageEstimatedNetSpreadPercent !== undefined
					? {
						averageEstimatedNetSpreadPercent:
							opportunity.stability.averageEstimatedNetSpreadPercent,
					}
					: {}),
			},
		}
		: {}),
});

const compactSpreadSide = (
	side: SpreadOpportunity["long"],
): CompactSpreadOpportunity["long"] => ({
	exchange: side.exchange,
	price: side.price,
	priceSource: side.priceSource,
	...(side.quoteAsset !== undefined ? { quoteAsset: side.quoteAsset } : {}),
	...(side.settlementAsset !== undefined
		? { settlementAsset: side.settlementAsset }
		: {}),
	...(side.feeSource !== undefined ? { feeSource: side.feeSource } : {}),
	...(side.ageMs !== undefined ? { ageMs: side.ageMs } : {}),
});

const compactConfidenceComponent = (
	component: SpreadOpportunity["confidenceBreakdown"]["priceSource"],
): CompactSpreadOpportunity["confidenceBreakdown"]["priceSource"] => ({
	score: component.score,
	weight: component.weight,
	reason: component.reason,
});
