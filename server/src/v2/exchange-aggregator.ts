import type {
	ArbitrageOpportunity,
	BBOUpdate,
	ConnectionStatus,
	DepthAtBps,
	Exchange,
	ExchangeMarketData,
	OpportunityLifecycle,
	OrderBookLevel,
	OrderBookUpdate,
} from "./types";
import { buildOpportunity, calculateDepthAtBps } from "./opportunity-calculator";

const STALE_THRESHOLD_MS = 10000;

/**
 * Aggregates data from all exchanges and calculates arbitrage opportunities.
 */
export class ExchangeAggregator {
	// Symbol -> Exchange -> MarketData
	private marketData = new Map<string, Map<Exchange, ExchangeMarketData>>();

	// Opportunity ID -> Lifecycle (for tracking)
	private lifecycles = new Map<string, OpportunityLifecycle>();

	// Exchange connection status
	private connectionStatus: Record<Exchange, ConnectionStatus> = {
		paradex: "disconnected",
		hyperliquid: "disconnected",
		pacifica: "disconnected",
		ethereal: "disconnected",
	};

	// Callbacks
	private opportunityCallbacks: Array<(opp: ArbitrageOpportunity) => void> = [];
	private removeCallbacks: Array<(id: string) => void> = [];
	private statusCallbacks: Array<(status: Record<Exchange, ConnectionStatus>) => void> = [];

	/**
	 * Normalize symbol to common format
	 */
	private normalizeSymbol(symbol: string): string {
		return symbol
			.replace(/-USD-PERP$/i, "")
			.replace(/-PERP$/i, "")
			.replace(/\/USD$/i, "")
			.replace(/-USD$/i, "")
			.replace(/USDC$/i, "")
			.replace(/USD$/i, "")
			.toUpperCase();
	}

	/**
	 * Update BBO data for an exchange
	 */
	handleBBO(update: BBOUpdate): void {
		const symbol = this.normalizeSymbol(update.symbol);
		const now = Date.now();

		if (!this.marketData.has(symbol)) {
			this.marketData.set(symbol, new Map());
		}

		const exchangeMap = this.marketData.get(symbol)!;
		const existing = exchangeMap.get(update.exchange);

		const bid = parseFloat(update.bid);
		const ask = parseFloat(update.ask);
		const bidSize = parseFloat(update.bidSize);
		const askSize = parseFloat(update.askSize);

		if (isNaN(bid) || isNaN(ask) || bid <= 0 || ask <= 0) return;

		const midPrice = (bid + ask) / 2;

		const marketData: ExchangeMarketData = {
			exchange: update.exchange,
			symbol,
			bid,
			bidSize,
			ask,
			askSize,
			midPrice,
			bids: existing?.bids ?? [{ price: bid, size: bidSize }],
			asks: existing?.asks ?? [{ price: ask, size: askSize }],
			bidDepthAtBps: existing?.bidDepthAtBps ?? { bps5: bid * bidSize, bps10: bid * bidSize, bps25: bid * bidSize },
			askDepthAtBps: existing?.askDepthAtBps ?? { bps5: ask * askSize, bps10: ask * askSize, bps25: ask * askSize },
			fundingRate: existing?.fundingRate,
			timestamp: update.timestamp || now,
			receivedAt: now,
			latencyMs: now - (update.timestamp || now),
			isStale: false,
		};

		exchangeMap.set(update.exchange, marketData);

		// Recalculate opportunities for this symbol
		this.calculateOpportunities(symbol);
	}

	/**
	 * Update orderbook data for an exchange
	 */
	handleOrderBook(update: OrderBookUpdate): void {
		const symbol = this.normalizeSymbol(update.symbol);
		const now = Date.now();

		if (!this.marketData.has(symbol)) {
			this.marketData.set(symbol, new Map());
		}

		const exchangeMap = this.marketData.get(symbol)!;
		const existing = exchangeMap.get(update.exchange);

		if (!existing) return; // Need BBO first

		const midPrice = existing.midPrice;
		const bidDepthAtBps = calculateDepthAtBps(update.bids, midPrice, "bid");
		const askDepthAtBps = calculateDepthAtBps(update.asks, midPrice, "ask");

		const marketData: ExchangeMarketData = {
			...existing,
			bids: update.bids,
			asks: update.asks,
			bidDepthAtBps,
			askDepthAtBps,
			timestamp: update.timestamp,
			receivedAt: update.receivedAt,
			latencyMs: update.receivedAt - update.timestamp,
			isStale: false,
		};

		exchangeMap.set(update.exchange, marketData);

		// Recalculate opportunities for this symbol
		this.calculateOpportunities(symbol);
	}

	/**
	 * Update funding rate for an exchange/symbol
	 */
	handleFundingRate(exchange: Exchange, symbol: string, fundingRate: number): void {
		const normalizedSymbol = this.normalizeSymbol(symbol);
		const exchangeMap = this.marketData.get(normalizedSymbol);
		if (!exchangeMap) return;

		const existing = exchangeMap.get(exchange);
		if (!existing) return;

		exchangeMap.set(exchange, {
			...existing,
			fundingRate,
		});
	}

	/**
	 * Update connection status for an exchange
	 */
	handleStatus(exchange: Exchange, status: ConnectionStatus): void {
		this.connectionStatus[exchange] = status;
		for (const cb of this.statusCallbacks) {
			cb({ ...this.connectionStatus });
		}
	}

	/**
	 * Calculate all opportunities for a symbol
	 */
	private calculateOpportunities(symbol: string): void {
		const exchangeMap = this.marketData.get(symbol);
		if (!exchangeMap || exchangeMap.size < 2) return;

		const exchanges = Array.from(exchangeMap.entries());
		const now = Date.now();

		// Mark stale data
		for (const [, data] of exchanges) {
			data.isStale = now - data.timestamp > STALE_THRESHOLD_MS;
		}

		// Calculate opportunities for all exchange pairs
		for (let i = 0; i < exchanges.length; i++) {
			for (let j = 0; j < exchanges.length; j++) {
				if (i === j) continue;

				const [buyExchange, buyData] = exchanges[i];
				const [sellExchange, sellData] = exchanges[j];

				// Only consider opportunities where we can buy low and sell high
				if (sellData.bid <= buyData.ask) continue;

				const oppId = `${symbol}_${buyExchange}_${sellExchange}`;
				const existingLifecycle = this.lifecycles.get(oppId);

				const opportunity = buildOpportunity(
					symbol,
					buyData,
					sellData,
					existingLifecycle,
				);

				if (opportunity) {
					this.lifecycles.set(oppId, opportunity.lifecycle);
					this.emitOpportunity(opportunity);
				}
			}
		}
	}

	/**
	 * Emit an opportunity to all subscribers
	 */
	private emitOpportunity(opportunity: ArbitrageOpportunity): void {
		for (const cb of this.opportunityCallbacks) {
			cb(opportunity);
		}
	}

	/**
	 * Get all current opportunities
	 */
	getAllOpportunities(): ArbitrageOpportunity[] {
		const opportunities: ArbitrageOpportunity[] = [];

		for (const [symbol, exchangeMap] of this.marketData) {
			if (exchangeMap.size < 2) continue;

			const exchanges = Array.from(exchangeMap.entries());

			for (let i = 0; i < exchanges.length; i++) {
				for (let j = 0; j < exchanges.length; j++) {
					if (i === j) continue;

					const [, buyData] = exchanges[i];
					const [, sellData] = exchanges[j];

					if (sellData.bid <= buyData.ask) continue;

					const oppId = `${symbol}_${buyData.exchange}_${sellData.exchange}`;
					const existingLifecycle = this.lifecycles.get(oppId);

					const opportunity = buildOpportunity(
						symbol,
						buyData,
						sellData,
						existingLifecycle,
					);

					if (opportunity) {
						opportunities.push(opportunity);
					}
				}
			}
		}

		return opportunities.sort((a, b) => b.score - a.score);
	}

	/**
	 * Get connection status for all exchanges
	 */
	getConnectionStatus(): Record<Exchange, ConnectionStatus> {
		return { ...this.connectionStatus };
	}

	/**
	 * Get statistics
	 */
	getStats(): { totalSymbols: number; totalOpportunities: number } {
		const opportunities = this.getAllOpportunities();
		return {
			totalSymbols: this.marketData.size,
			totalOpportunities: opportunities.length,
		};
	}

	/**
	 * Subscribe to opportunity updates
	 */
	onOpportunity(cb: (opp: ArbitrageOpportunity) => void): () => void {
		this.opportunityCallbacks.push(cb);
		return () => {
			const idx = this.opportunityCallbacks.indexOf(cb);
			if (idx >= 0) this.opportunityCallbacks.splice(idx, 1);
		};
	}

	/**
	 * Subscribe to opportunity removals
	 */
	onRemove(cb: (id: string) => void): () => void {
		this.removeCallbacks.push(cb);
		return () => {
			const idx = this.removeCallbacks.indexOf(cb);
			if (idx >= 0) this.removeCallbacks.splice(idx, 1);
		};
	}

	/**
	 * Subscribe to status updates
	 */
	onStatus(cb: (status: Record<Exchange, ConnectionStatus>) => void): () => void {
		this.statusCallbacks.push(cb);
		cb({ ...this.connectionStatus }); // Emit current status immediately
		return () => {
			const idx = this.statusCallbacks.indexOf(cb);
			if (idx >= 0) this.statusCallbacks.splice(idx, 1);
		};
	}
}

// Singleton instance
export const aggregator = new ExchangeAggregator();
