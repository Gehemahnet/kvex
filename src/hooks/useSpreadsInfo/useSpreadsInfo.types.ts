import type { LowercaseExchange } from "../../common/types";

/**
 * BBO (Best Bid/Offer) data for a single market on an exchange
 */
export interface ExchangeBBO {
	exchange: LowercaseExchange;
	symbol: string;
	bid: string;
	bidSize: string;
	ask: string;
	askSize: string;
	lastUpdatedAt?: number;
}

/**
 * Price spread between two exchanges for the same symbol
 */
export interface SpreadOpportunity {
	symbol: string;
	/** Exchange with the best bid (where to sell) */
	sellExchange: LowercaseExchange;
	/** Exchange with the best ask (where to buy) */
	buyExchange: LowercaseExchange;
	/** Best bid price (sell price) */
	bestBid: string;
	/** Best ask price (buy price) */
	bestAsk: string;
	/** Spread in absolute terms */
	spreadAbsolute: string;
	/** Spread in percentage */
	spreadPercent: string;
	/** Available size to trade (minimum of bid and ask sizes) */
	availableSize: string;
	/** Potential profit in USD for available size */
	potentialProfitUsd: string;
	/** Last update timestamp */
	lastUpdatedAt: number;
}

/**
 * Aggregated BBO data across all exchanges for a symbol
 */
export interface SymbolBBOData {
	symbol: string;
	exchanges: Partial<Record<LowercaseExchange, ExchangeBBO>>;
}

/**
 * Data from a single exchange containing all markets
 */
export interface ExchangePriceData {
	name: LowercaseExchange;
	items: ExchangeBBO[];
	isConnected: boolean;
	lastUpdatedAt?: number;
}
