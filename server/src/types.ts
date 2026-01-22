export type Exchange = "paradex" | "hyperliquid" | "pacifica" | "ethereal";

export type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

export interface BBOUpdate {
	exchange: Exchange;
	symbol: string;
	bid: string;
	bidSize: string;
	ask: string;
	askSize: string;
	timestamp: number;
}

export interface OrderBookUpdate {
	exchange: Exchange;
	symbol: string;
	bids: Array<{ price: string; size: string }>;
	asks: Array<{ price: string; size: string }>;
	timestamp: number;
	receivedAt: number; // for latency calculation
}

export interface SpreadOpportunity {
	symbol: string;
	sellExchange: Exchange;
	buyExchange: Exchange;
	bestBid: number;
	bestAsk: number;
	spreadAbsolute: number;
	spreadPercent: number;
	availableSize: number;
	potentialProfitUsd: number;
	lastUpdatedAt: number;
}

// Enhanced types for Lab view
export interface OrderBookLevel {
	price: number;
	size: number;
}

export interface OrderBookDepth {
	bids: OrderBookLevel[];
	asks: OrderBookLevel[];
	timestamp: number;
}

export interface DepthAtBps {
	bps5: number;
	bps10: number;
	bps25: number;
}

export interface ExchangeFees {
	takerFee: number;
	makerFee: number;
	gasFee?: number;
}

export interface ExchangeData {
	exchange: Exchange;
	symbol: string;
	bid: number;
	bidSize: number;
	ask: number;
	askSize: number;
	midPrice: number;
	depth: OrderBookDepth;
	bidDepthAtBps: DepthAtBps;
	askDepthAtBps: DepthAtBps;
	volume24h: number;
	fundingRate?: number;
	fees: ExchangeFees;
	timestamp: number;
	latencyMs: number;
}

export type OpportunityStatus = "executable" | "marginal" | "theoretical";

export interface EnhancedSpreadOpportunity {
	symbol: string;
	buyExchange: Exchange;
	sellExchange: Exchange;
	buyData: ExchangeData;
	sellData: ExchangeData;

	// Spread metrics
	rawSpreadBps: number;
	netSpreadBps: number;
	spreadAbsolute: number;

	// Liquidity metrics
	maxExecutableSize: number;
	slippageAt1k: number;
	slippageAt5k: number;
	depthRatio: number; // bid depth / ask depth

	// Costs
	totalFeesBps: number;
	fundingCostBps: number;

	// Stability metrics
	lifetimeMs: number;
	firstSeenAt: number;
	occurrenceCount: number;

	// Risk metrics
	volatility1m: number;
	bookSkew: number;

	// Final score and status
	score: number;
	status: OpportunityStatus;

	lastUpdatedAt: number;
}

// Socket.io events
export interface ServerToClientEvents {
	spread: (opportunity: SpreadOpportunity) => void;
	snapshot: (opportunities: SpreadOpportunity[]) => void;
	status: (status: Record<Exchange, ConnectionStatus>) => void;
	// Lab events
	labSpread: (opportunity: EnhancedSpreadOpportunity) => void;
	labSnapshot: (opportunities: EnhancedSpreadOpportunity[]) => void;
}

export interface ClientToServerEvents {
	subscribe: () => void;
	subscribeLab: () => void;
}
