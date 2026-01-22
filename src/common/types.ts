export type Exchange = "PARADEX" | "PACIFICA" | "ETHEREAL" | "HYPERLIQUID";
export type LowercaseExchange = Lowercase<Exchange>;
export type Side = "BUY" | "SELL";

export interface OrderbookLevel {
	price: string;
	size: string;
}

export interface Orderbook {
	market: string;
	bids: OrderbookLevel[]; // sorted desc
	asks: OrderbookLevel[]; // sorted asc
	seqNo?: number;
	lastUpdatedAt?: number;
	source: Exchange;
}

export interface NewOrder {
	market: string;
	side: Side;
	type: "LIMIT" | "MARKET";
	size: string;
	price?: string;
	clientOrderId?: string;
	tif?: "GTC" | "IOC" | "FOK";
}

export interface PlacedOrder {
	id: string;
	clientId?: string;
	status: string;
	filledSize?: string;
	remainingSize?: string;
	avgFillPrice?: string;
	source: Exchange;
}

export interface SnapshotResponse {
	bids: [string, string][];
	asks: [string, string][];
	seq_no?: number;
	last_updated_at?: number;
}

export type Column = {
	header: string;
	columnKey: string;
	field: string;
};

// Enhanced types for Lab view
export type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

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
	exchange: LowercaseExchange;
	symbol: string;
	bid: number;
	bidSize: number;
	ask: number;
	askSize: number;
	midPrice: number;
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
	buyExchange: LowercaseExchange;
	sellExchange: LowercaseExchange;
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
	depthRatio: number;

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
