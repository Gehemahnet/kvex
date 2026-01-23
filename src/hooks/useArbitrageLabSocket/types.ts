import type { LowercaseExchange, ConnectionStatus } from "../../common/types";

export type Strategy = "perp-perp" | "perp-spot";
export type OpportunityStatus = "executable" | "marginal" | "theoretical";

/**
 * Метрики глубины рынка.
 * Показывает объем ликвидности (USD) на разных уровнях от лучшей цены.
 */
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

/**
 * Полное состояние рынка по конкретному символу на конкретной бирже.
 */
export interface ExchangeMarketData {
	exchange: LowercaseExchange;
	symbol: string;
	
	// BBO
	bid: number;
	bidSize: number;
	ask: number;
	askSize: number;
	midPrice: number;
	
	// Orderbook (может быть пустым в списке, заполнен в деталях)
	bids: OrderBookLevel[];
	asks: OrderBookLevel[];
	bidDepthAtBps: DepthAtBps;
	askDepthAtBps: DepthAtBps;
	
	// Funding
	fundingRate?: number;
	markPrice?: number;
	indexPrice?: number;
	
	// Meta
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
	latencyAsymmetryMs: number;
	staleDataRisk: boolean;
	depthImbalance: number;
	riskFlags: string[];
}

/**
 * ГЛАВНЫЙ ОБЪЕКТ: Арбитражная возможность.
 * Используется во всем приложении для отображения данных.
 */
export interface ArbitrageOpportunity {
	id: string;
	symbol: string;
	strategy: Strategy;

	// Исполнение
	buyExchange: LowercaseExchange;
	sellExchange: LowercaseExchange;
	buyPrice: number;
	sellPrice: number;
	buyData: ExchangeMarketData;
	sellData: ExchangeMarketData;

	// Спреды
	rawSpreadBps: number;
	netSpreadBps: number;
	spreadAbsolute: number;

	// Ликвидность
	maxExecutableSize: number;
	slippageAt1k: number;
	slippageAt5k: number;
	depthBuyAt10Bps: number;
	depthSellAt10Bps: number;

	// Комиссии
	buyFeesBps: number;
	sellFeesBps: number;
	totalFeesBps: number;
	gasEstimateUsd: number;

	// Фандинг
	buyFundingRate: number;
	sellFundingRate: number;
	fundingDeltaBps: number;

	// Аналитика
	lifecycle: OpportunityLifecycle;
	risk: RiskMetrics;

	// Статус
	score: number;
	status: OpportunityStatus;

	lastUpdatedAt: number;
	depthImbalance: number;
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
