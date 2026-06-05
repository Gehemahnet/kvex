import type { FundingExchange } from "../FundingOverview/FundingOverview.types";

export type SpreadPriceSource = "depth" | "bbo" | "mark" | "mid" | "index";

export type SpreadSide = {
	exchange: FundingExchange;
	symbol: string;
	baseAsset?: string;
	quoteAsset?: string;
	settlementAsset?: string;
	contractType?: "perp" | "unknown";
	assetClass?: "crypto" | "equity" | "synthetic" | "unknown";
	price: number;
	priceSource: SpreadPriceSource;
	bidPrice?: number;
	askPrice?: number;
	bidSize?: number;
	askSize?: number;
	orderBookBidLevels?: number;
	orderBookAskLevels?: number;
	slippagePercent?: number;
	fundingRate?: number;
	fundingApr?: number;
	fundingIntervalHours?: number;
	makerFeeRate?: number;
	takerFeeRate?: number;
	feeSource?: "api" | "documentation";
	timestamp?: number;
	priceReceivedAt?: number;
	fundingReceivedAt?: number;
	liquidityReceivedAt?: number;
	ageMs?: number;
	priceAgeMs?: number;
	fundingAgeMs?: number;
	liquidityAgeMs?: number;
};

export type SpreadOpportunity = {
	symbol: string;
	long: SpreadSide;
	short: SpreadSide;
	priceSpread: number;
	priceSpreadPercent: number;
	executionSlippagePercent?: number;
	confidence: number;
	confidenceBreakdown: SpreadConfidenceBreakdown;
	isStale: boolean;
	maxExecutableNotionalUsd?: number;
	maxExecutableNotionalReason?: SpreadExecutableNotionalReason;
	feeAdjustedPriceSpreadPercent?: number;
	fundingAprSpread?: number;
	fundingImpactPercent?: number;
	estimatedNetSpreadPercent?: number;
	stability?: SpreadStability;
};

export type SpreadExecutableNotionalReason =
	| "available"
	| "missing-long-ask"
	| "missing-long-ask-size"
	| "missing-short-bid"
	| "missing-short-bid-size";

export type SpreadStability = {
	firstSeenAt: number;
	lastSeenAt: number;
	occurrences: number;
	lifetimeMs: number;
	averagePriceSpread: number;
	averagePriceSpreadPercent: number;
	averageFeeAdjustedPriceSpreadPercent?: number;
	averageFundingAprSpread?: number;
	averageEstimatedNetSpreadPercent?: number;
};

export type SpreadConfidenceBreakdown = Partial<Record<
	"priceSource" | "freshness" | "funding" | "fees" | "liquidity",
	SpreadConfidenceComponent
>>;

export type SpreadConfidenceComponent = {
	score: number;
	weight: number;
	weightedScore: number;
	reason: string;
};

export type SpreadsResponse = {
	exchanges: FundingExchange[];
	symbol?: string;
	minPriceSpreadPercent?: number;
	maxSnapshotAgeMs?: number;
	positionSizeUsd?: number;
	minOccurrences?: number;
	minLifetimeMs?: number;
	holdingPeriodHours?: number;
	data: SpreadOpportunity[];
	errors: {
		exchange: FundingExchange;
		code: string;
		message: string;
	}[];
};
