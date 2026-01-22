import type { LowercaseExchange } from "../../common/types";
import type {
	ExchangeBBO,
	ExchangePriceData,
	SpreadOpportunity,
	SymbolBBOData,
} from "./useSpreadsInfo.types";

/**
 * Normalize symbol to a common format (e.g., BTC-USD-PERP -> BTC)
 */
export const normalizeSymbol = (symbol: string): string => {
	// Remove common suffixes like -USD-PERP, -PERP, /USD, etc.
	return symbol
		.replace(/-USD-PERP$/i, "")
		.replace(/-PERP$/i, "")
		.replace(/\/USD$/i, "")
		.replace(/-USD$/i, "")
		.replace(/USDC$/i, "")
		.replace(/USD$/i, "")
		.toUpperCase();
};

/**
 * Aggregate BBO data from all exchanges by symbol
 */
export const aggregateBBOBySymbol = (
	exchangesData: ExchangePriceData[],
): Map<string, SymbolBBOData> => {
	const symbolMap = new Map<string, SymbolBBOData>();

	for (const exchangeData of exchangesData) {
		for (const bbo of exchangeData.items) {
			const normalizedSymbol = normalizeSymbol(bbo.symbol);

			if (!symbolMap.has(normalizedSymbol)) {
				symbolMap.set(normalizedSymbol, {
					symbol: normalizedSymbol,
					exchanges: {},
				});
			}

			const symbolData = symbolMap.get(normalizedSymbol)!;
			symbolData.exchanges[exchangeData.name] = bbo;
		}
	}

	return symbolMap;
};

/**
 * Calculate spread opportunity between exchanges for a symbol
 */
export const calculateSpreadOpportunity = (
	symbolData: SymbolBBOData,
): SpreadOpportunity | null => {
	const exchanges = Object.entries(symbolData.exchanges) as [
		LowercaseExchange,
		ExchangeBBO,
	][];

	if (exchanges.length < 2) {
		return null;
	}

	let bestBid: {
		exchange: LowercaseExchange;
		price: number;
		size: number;
	} | null = null;
	let bestAsk: {
		exchange: LowercaseExchange;
		price: number;
		size: number;
	} | null = null;
	let latestUpdate = 0;

	for (const [exchange, bbo] of exchanges) {
		const bidPrice = Number.parseFloat(bbo.bid);
		const askPrice = Number.parseFloat(bbo.ask);
		const bidSize = Number.parseFloat(bbo.bidSize);
		const askSize = Number.parseFloat(bbo.askSize);

		if (!Number.isNaN(bidPrice) && bidPrice > 0) {
			if (!bestBid || bidPrice > bestBid.price) {
				bestBid = { exchange, price: bidPrice, size: bidSize };
			}
		}

		if (!Number.isNaN(askPrice) && askPrice > 0) {
			if (!bestAsk || askPrice < bestAsk.price) {
				bestAsk = { exchange, price: askPrice, size: askSize };
			}
		}

		if (bbo.lastUpdatedAt && bbo.lastUpdatedAt > latestUpdate) {
			latestUpdate = bbo.lastUpdatedAt;
		}
	}

	if (!bestBid || !bestAsk) {
		return null;
	}

	// Only show opportunity if we can buy cheaper than we can sell
	// (bestBid > bestAsk means arbitrage opportunity)
	const spreadAbsolute = bestBid.price - bestAsk.price;
	const spreadPercent = (spreadAbsolute / bestAsk.price) * 100;
	const availableSize = Math.min(bestBid.size, bestAsk.size);
	const potentialProfitUsd = spreadAbsolute * availableSize;

	return {
		symbol: symbolData.symbol,
		sellExchange: bestBid.exchange,
		buyExchange: bestAsk.exchange,
		bestBid: bestBid.price.toString(),
		bestAsk: bestAsk.price.toString(),
		spreadAbsolute: spreadAbsolute.toFixed(4),
		spreadPercent: spreadPercent.toFixed(4),
		availableSize: availableSize.toString(),
		potentialProfitUsd: potentialProfitUsd.toFixed(2),
		lastUpdatedAt: latestUpdate || Date.now(),
	};
};

/**
 * Find all spread opportunities across exchanges
 */
export const findSpreadOpportunities = (
	exchangesData: ExchangePriceData[],
	minSpreadPercent = 0,
): SpreadOpportunity[] => {
	const symbolMap = aggregateBBOBySymbol(exchangesData);
	const opportunities: SpreadOpportunity[] = [];

	for (const symbolData of symbolMap.values()) {
		const opportunity = calculateSpreadOpportunity(symbolData);

		if (opportunity) {
			const spreadPercent = Number.parseFloat(opportunity.spreadPercent);
			if (spreadPercent >= minSpreadPercent) {
				opportunities.push(opportunity);
			}
		}
	}

	// Sort by spread percent descending
	return opportunities.sort(
		(a, b) =>
			Number.parseFloat(b.spreadPercent) - Number.parseFloat(a.spreadPercent),
	);
};

/**
 * Format spread percent for display
 */
export const formatSpreadPercent = (spreadPercent: string): string => {
	const value = Number.parseFloat(spreadPercent);
	const sign = value >= 0 ? "+" : "";
	return `${sign}${value.toFixed(2)}%`;
};

/**
 * Get color class based on spread value
 */
export const getSpreadColorClass = (spreadPercent: string): string => {
	const value = Number.parseFloat(spreadPercent);
	if (value > 0) return "positive-spread";
	if (value < 0) return "negative-spread";
	return "";
};
