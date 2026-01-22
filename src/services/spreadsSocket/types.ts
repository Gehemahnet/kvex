export type Exchange = "paradex" | "hyperliquid" | "pacifica" | "ethereal";
export type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

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

export interface ServerToClientEvents {
	spread: (opportunity: SpreadOpportunity) => void;
	snapshot: (opportunities: SpreadOpportunity[]) => void;
	status: (status: Record<Exchange, ConnectionStatus>) => void;
}

export interface ClientToServerEvents {
	subscribe: () => void;
}
