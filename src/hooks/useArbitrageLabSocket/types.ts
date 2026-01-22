import type { LowercaseExchange, ConnectionStatus } from "../../common/types";

export type Strategy = "perp-perp" | "perp-spot";
export type OpportunityStatus = "executable" | "marginal" | "theoretical";

export interface DepthAtBps {
	bps5: number;
	bps10: number;
	bps25: number;
}

export interface ExchangeFees {
	takerFeeBps: number;
	makerFeeBps: number;
	gasEstimateUsd: number;
}

export interface OrderBookLevel {
	price: number;
	size: number;
}

export interface ExchangeMarketData {
	exchange: LowercaseExchange;
	symbol: string;
	bid: number;
	bidSize: number;
	ask: number;
	askSize: number;
	midPrice: number;
	bids: OrderBookLevel[];
	asks: OrderBookLevel[];
	bidDepthAtBps: DepthAtBps;
	askDepthAtBps: DepthAtBps;
	fundingRate?: number;
	markPrice?: number;
	indexPrice?: number;
	timestamp: number;
	receivedAt: number;
	latencyMs: number;
	isStale: boolean;
}

export interface OpportunityLifecycle {
	firstSeenAt: number;
	lastSeenAt: number;
	lifetimeMs: number;
	peakSpreadBps: number;
	avgSpreadBps: number;
	occurrenceCount: number;
	spreadHistory: number[];
}

export interface RiskMetrics {
	volatility1m: number;
	volatility5m: number;
	bookSkew: number;
	latencyRisk: number;
	staleDataRisk: boolean;
	riskFlags: string[];
}

export interface ArbitrageOpportunity {
	id: string;
	symbol: string;
	strategy: Strategy;

	buyExchange: LowercaseExchange;
	sellExchange: LowercaseExchange;
	buyPrice: number;
	sellPrice: number;
	buyData: ExchangeMarketData;
	sellData: ExchangeMarketData;

	rawSpreadBps: number;
	netSpreadBps: number;
	spreadAbsolute: number;

	maxExecutableSize: number;
	slippageAt1k: number;
	slippageAt5k: number;
	depthBuyAt10Bps: number;
	depthSellAt10Bps: number;

	buyFeesBps: number;
	sellFeesBps: number;
	totalFeesBps: number;
	gasEstimateUsd: number;

	buyFundingRate: number;
	sellFundingRate: number;
	fundingDeltaBps: number;

	lifecycle: OpportunityLifecycle;
	risk: RiskMetrics;

	score: number;
	status: OpportunityStatus;

	lastUpdatedAt: number;
}

export interface ServerStats {
	totalSymbols: number;
	totalOpportunities: number;
	executableCount: number;
	avgScore: number;
	updatesPerSecond: number;
	uptime: number;
}

export interface SubscriptionConfig {
	minNetSpreadBps?: number;
	minScore?: number;
	exchanges?: LowercaseExchange[];
	symbols?: string[];
}
