import type { Exchange } from "#common/types";
import type { UserExchangeFeeProfile } from "#services/users/user-exchange-accounts/user-exchange-accounts.types";

export type SpreadPriceSource = "depth" | "bbo" | "mark" | "mid" | "index";

export type SpreadSide = {
	exchange: Exchange;
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
	receivedAt?: number;
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

export type CompactSpreadSide = Pick<
	SpreadSide,
	| "exchange"
	| "price"
	| "priceSource"
	| "quoteAsset"
	| "settlementAsset"
	| "feeSource"
	| "ageMs"
>;

export type CompactSpreadOpportunity = Pick<
	SpreadOpportunity,
	| "symbol"
	| "priceSpread"
	| "priceSpreadPercent"
	| "executionSlippagePercent"
	| "confidence"
	| "isStale"
	| "maxExecutableNotionalUsd"
	| "maxExecutableNotionalReason"
	| "feeAdjustedPriceSpreadPercent"
	| "fundingAprSpread"
	| "fundingImpactPercent"
	| "estimatedNetSpreadPercent"
> & {
	long: CompactSpreadSide;
	short: CompactSpreadSide;
	confidenceBreakdown: CompactSpreadConfidenceBreakdown;
	stability?: CompactSpreadStability;
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

export type CompactSpreadStability = Pick<
	SpreadStability,
	| "occurrences"
	| "lifetimeMs"
	| "averagePriceSpreadPercent"
	| "averageEstimatedNetSpreadPercent"
>;

export type SpreadConfidenceBreakdown = {
	priceSource: SpreadConfidenceComponent;
	freshness: SpreadConfidenceComponent;
	funding: SpreadConfidenceComponent;
	fees: SpreadConfidenceComponent;
	liquidity: SpreadConfidenceComponent;
};

export type SpreadConfidenceComponent = {
	score: number;
	weight: number;
	weightedScore: number;
	reason: string;
};

export type CompactSpreadConfidenceBreakdown = Record<
	keyof SpreadConfidenceBreakdown,
	CompactSpreadConfidenceComponent
>;

export type CompactSpreadConfidenceComponent = Pick<
	SpreadConfidenceComponent,
	"score" | "weight" | "reason"
>;

export type SpreadsQuery = {
	exchanges: Exchange[];
	symbol?: string;
	minPriceSpreadPercent?: number;
	maxSnapshotAgeMs?: number;
	positionSizeUsd?: number;
	minOccurrences?: number;
	minLifetimeMs?: number;
	holdingPeriodHours?: number;
};

export type SpreadsResponse = SpreadsQuery & {
	data: CompactSpreadOpportunity[];
	errors: {
		exchange: Exchange;
		code: string;
		message: string;
	}[];
};

export type SpreadFeeProfile = UserExchangeFeeProfile & {
	exchange: Exchange;
};
