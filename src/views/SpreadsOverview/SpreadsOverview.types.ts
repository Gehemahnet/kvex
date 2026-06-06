import type { FundingExchange } from "../FundingOverview/FundingOverview.types";

export type SpreadPriceSource = "depth" | "bbo" | "mark" | "mid" | "index";

export type SpreadSide = {
	exchange: FundingExchange;
	quoteAsset?: string;
	settlementAsset?: string;
	price: number;
	priceSource: SpreadPriceSource;
	feeSource?: "api" | "documentation";
	ageMs?: number;
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
	occurrences: number;
	lifetimeMs: number;
	averagePriceSpreadPercent: number;
	averageEstimatedNetSpreadPercent?: number;
};

export type SpreadConfidenceBreakdown = Partial<Record<
	"priceSource" | "freshness" | "funding" | "fees" | "liquidity",
	SpreadConfidenceComponent
>>;

export type SpreadConfidenceComponent = {
	score: number;
	weight: number;
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
