export type Exchange = "paradex" | "hyperliquid" | "pacifica" | "ethereal";

export type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

export type Strategy = "perp-perp" | "perp-spot";

export type OpportunityStatus = "executable" | "marginal" | "theoretical";

// Raw data from exchanges
export interface BBOUpdate {
	exchange: Exchange;
	symbol: string;
	bid: string;
	bidSize: string;
	ask: string;
	askSize: string;
	timestamp: number;
}

export interface OrderBookLevel {
	price: number;
	size: number;
}

export interface OrderBookUpdate {
	exchange: Exchange;
	symbol: string;
	bids: OrderBookLevel[];
	asks: OrderBookLevel[];
	timestamp: number;
	receivedAt: number;
}

// Fee structure
export interface ExchangeFees {
	takerFeeBps: number;
	makerFeeBps: number;
	gasEstimateUsd: number;
}

// Depth metrics
export interface DepthAtBps {
	bps5: number;
	bps10: number;
	bps25: number;
}

// Exchange state for a symbol
export interface ExchangeMarketData {
	exchange: Exchange;
	symbol: string;

	// BBO
	bid: number;
	bidSize: number;
	ask: number;
	askSize: number;
	midPrice: number;

	// Orderbook depth
	bids: OrderBookLevel[];
	asks: OrderBookLevel[];
	bidDepthAtBps: DepthAtBps;
	askDepthAtBps: DepthAtBps;

	// Funding (optional, perps only)
	fundingRate?: number;
	markPrice?: number;
	indexPrice?: number;

	// Meta
	timestamp: number;
	receivedAt: number;
	latencyMs: number;
	isStale: boolean;
}

// Lifecycle tracking for an opportunity
export interface OpportunityLifecycle {
	firstSeenAt: number;
	lastSeenAt: number;
	lifetimeMs: number;
	peakSpreadBps: number;
	avgSpreadBps: number;
	occurrenceCount: number;
	spreadHistory: number[]; // Rolling window of last N spreads
}

// Risk metrics
export interface RiskMetrics {
	volatility1m: number;
	volatility5m: number;
	bookSkew: number; // bid depth vs ask depth imbalance
	latencyRisk: number; // max latency across exchanges
	staleDataRisk: boolean;
	riskFlags: string[];
}

// The main opportunity object emitted to clients
export interface ArbitrageOpportunity {
	id: string; // symbol_buyExchange_sellExchange
	symbol: string;
	strategy: Strategy;

	// Execution details
	buyExchange: Exchange;
	sellExchange: Exchange;
	buyPrice: number;
	sellPrice: number;
	buyData: ExchangeMarketData;
	sellData: ExchangeMarketData;

	// Spreads
	rawSpreadBps: number;
	netSpreadBps: number;
	spreadAbsolute: number;

	// Size & Execution
	maxExecutableSize: number; // USD value
	slippageAt1k: number; // bps
	slippageAt5k: number; // bps
	depthBuyAt10Bps: number;
	depthSellAt10Bps: number;

	// Costs breakdown
	buyFeesBps: number;
	sellFeesBps: number;
	totalFeesBps: number;
	gasEstimateUsd: number;

	// Funding
	buyFundingRate: number;
	sellFundingRate: number;
	fundingDeltaBps: number;

	// Lifecycle
	lifecycle: OpportunityLifecycle;

	// Risk
	risk: RiskMetrics;

	// Scoring
	score: number; // 0-100
	status: OpportunityStatus;

	// Timestamps
	lastUpdatedAt: number;
}

// Socket.io events
export interface V2ServerToClientEvents {
	opportunity: (opp: ArbitrageOpportunity) => void;
	snapshot: (opps: ArbitrageOpportunity[]) => void;
	remove: (id: string) => void;
	status: (status: Record<Exchange, ConnectionStatus>) => void;
	stats: (stats: ServerStats) => void;
}

export interface V2ClientToServerEvents {
	subscribe: (config?: SubscriptionConfig) => void;
	unsubscribe: () => void;
}

export interface SubscriptionConfig {
	minNetSpreadBps?: number;
	minScore?: number;
	exchanges?: Exchange[];
	symbols?: string[];
}

export interface ServerStats {
	totalSymbols: number;
	totalOpportunities: number;
	executableCount: number;
	avgScore: number;
	updatesPerSecond: number;
	uptime: number;
}
