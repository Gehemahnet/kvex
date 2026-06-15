import type { Exchange } from "#common/types";
import type { FundingExchangeError } from "#services/funding/funding-core/funding.types";

export type MarketSnapshot = {
	exchange: Exchange;
	symbol: string;
	sourceSymbol: string;
	baseAsset?: string;
	quoteAsset?: string;
	settlementAsset?: string;
	contractType?: MarketContractType;
	assetClass?: MarketAssetClass;
	fundingRate?: number;
	fundingApr?: number;
	fundingIntervalHours?: number;
	bidPrice?: number;
	askPrice?: number;
	bidSize?: number;
	askSize?: number;
	orderBookBids?: MarketOrderBookLevel[];
	orderBookAsks?: MarketOrderBookLevel[];
	markPrice?: number;
	indexPrice?: number;
	midPrice?: number;
	openInterest?: number;
	volume24h?: number;
	makerFeeRate?: number;
	takerFeeRate?: number;
	feeSource?: "api" | "documentation";
	maxLeverage?: number;
	minOrderSize?: number;
	maxOrderSize?: number;
	timestamp?: number;
	receivedAt?: number;
	priceReceivedAt?: number;
	fundingReceivedAt?: number;
	liquidityReceivedAt?: number;
};

export type MarketContractType = "perp" | "unknown";

export type MarketAssetClass = "crypto" | "equity" | "synthetic" | "unknown";

export type MarketOrderBookLevel = {
	price: number;
	size: number;
};

export type MarketSnapshotsQuery = {
	exchanges: Exchange[];
	symbol?: string;
};

export type MarketSnapshotsResponse = MarketSnapshotsQuery & {
	data: MarketSnapshot[];
	errors: FundingExchangeError[];
};
