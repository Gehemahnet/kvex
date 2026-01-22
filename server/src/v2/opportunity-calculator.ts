import { calculateRoundTripFees, getFees } from "./fee-registry";
import type {
	ArbitrageOpportunity,
	DepthAtBps,
	Exchange,
	ExchangeMarketData,
	OpportunityLifecycle,
	OpportunityStatus,
	OrderBookLevel,
	RiskMetrics,
} from "./types";

// Thresholds for status classification
const EXECUTABLE_NET_SPREAD_BPS = 5;
const MARGINAL_NET_SPREAD_BPS = 0;
const MIN_EXECUTABLE_SIZE_USD = 500;
const STALE_DATA_THRESHOLD_MS = 5000;

// Scoring weights
const SCORE_WEIGHTS = {
	netSpread: 0.35,
	size: 0.20,
	lifetime: 0.15,
	depth: 0.15,
	risk: 0.15,
};

/**
 * Calculate depth at various basis point levels from mid price
 */
export const calculateDepthAtBps = (
	levels: OrderBookLevel[],
	midPrice: number,
	side: "bid" | "ask",
): DepthAtBps => {
	const bpsLevels = [5, 10, 25];
	const result: DepthAtBps = { bps5: 0, bps10: 0, bps25: 0 };

	for (const level of levels) {
		const priceDiffBps = Math.abs((level.price - midPrice) / midPrice) * 10000;

		if (priceDiffBps <= 5) result.bps5 += level.price * level.size;
		if (priceDiffBps <= 10) result.bps10 += level.price * level.size;
		if (priceDiffBps <= 25) result.bps25 += level.price * level.size;
	}

	return result;
};

/**
 * Calculate slippage for a given size
 */
export const calculateSlippage = (
	levels: OrderBookLevel[],
	sizeUsd: number,
	side: "buy" | "sell",
): number => {
	if (levels.length === 0) return 0;

	const referencePrice = levels[0].price;
	let remainingSize = sizeUsd;
	let totalCost = 0;
	let totalQty = 0;

	for (const level of levels) {
		const levelValueUsd = level.price * level.size;
		const fillUsd = Math.min(remainingSize, levelValueUsd);
		const fillQty = fillUsd / level.price;

		totalCost += fillQty * level.price;
		totalQty += fillQty;
		remainingSize -= fillUsd;

		if (remainingSize <= 0) break;
	}

	if (totalQty === 0) return 0;

	const avgPrice = totalCost / totalQty;
	const slippageBps = Math.abs((avgPrice - referencePrice) / referencePrice) * 10000;

	return slippageBps;
};

/**
 * Calculate max executable size based on orderbook depth
 */
export const calculateMaxExecutableSize = (
	buyAsks: OrderBookLevel[],
	sellBids: OrderBookLevel[],
	maxSlippageBps: number = 10,
): number => {
	// Find the size where slippage exceeds threshold on either side
	const testSizes = [500, 1000, 2000, 5000, 10000, 25000, 50000];

	let maxSize = 0;
	for (const size of testSizes) {
		const buySlippage = calculateSlippage(buyAsks, size, "buy");
		const sellSlippage = calculateSlippage(sellBids, size, "sell");

		if (buySlippage <= maxSlippageBps && sellSlippage <= maxSlippageBps) {
			maxSize = size;
		} else {
			break;
		}
	}

	return maxSize;
};

/**
 * Calculate risk metrics
 */
export const calculateRiskMetrics = (
	buyData: ExchangeMarketData,
	sellData: ExchangeMarketData,
	spreadHistory: number[],
): RiskMetrics => {
	const riskFlags: string[] = [];

	// Latency risk
	const maxLatency = Math.max(buyData.latencyMs, sellData.latencyMs);
	if (maxLatency > 500) riskFlags.push("high_latency");

	// Stale data
	const now = Date.now();
	const buyStale = now - buyData.timestamp > STALE_DATA_THRESHOLD_MS;
	const sellStale = now - sellData.timestamp > STALE_DATA_THRESHOLD_MS;
	if (buyStale || sellStale) riskFlags.push("stale_data");

	// Book skew
	const bidDepth = sellData.bidDepthAtBps.bps10;
	const askDepth = buyData.askDepthAtBps.bps10;
	const bookSkew = bidDepth > 0 && askDepth > 0
		? Math.abs(bidDepth - askDepth) / Math.max(bidDepth, askDepth)
		: 0;
	if (bookSkew > 0.5) riskFlags.push("skewed_book");

	// Volatility (std dev of spread history)
	let volatility1m = 0;
	if (spreadHistory.length >= 2) {
		const mean = spreadHistory.reduce((a, b) => a + b, 0) / spreadHistory.length;
		const variance = spreadHistory.reduce((sum, val) => sum + (val - mean) ** 2, 0) / spreadHistory.length;
		volatility1m = Math.sqrt(variance);
	}
	if (volatility1m > 5) riskFlags.push("high_volatility");

	return {
		volatility1m,
		volatility5m: volatility1m, // Simplified - would need longer history
		bookSkew,
		latencyRisk: maxLatency,
		staleDataRisk: buyStale || sellStale,
		riskFlags,
	};
};

/**
 * Calculate opportunity score (0-100)
 */
export const calculateScore = (
	netSpreadBps: number,
	maxSize: number,
	lifetimeMs: number,
	depth10Bps: number,
	riskFlags: string[],
): number => {
	// Spread score (0-100)
	const spreadScore = Math.min(100, Math.max(0, netSpreadBps * 5));

	// Size score (0-100)
	const sizeScore = Math.min(100, (maxSize / 10000) * 100);

	// Lifetime score (longer = more stable = better)
	const lifetimeScore = Math.min(100, (lifetimeMs / 60000) * 100);

	// Depth score
	const depthScore = Math.min(100, (depth10Bps / 50000) * 100);

	// Risk penalty
	const riskPenalty = riskFlags.length * 10;

	const weightedScore =
		spreadScore * SCORE_WEIGHTS.netSpread +
		sizeScore * SCORE_WEIGHTS.size +
		lifetimeScore * SCORE_WEIGHTS.lifetime +
		depthScore * SCORE_WEIGHTS.depth -
		riskPenalty * SCORE_WEIGHTS.risk;

	return Math.max(0, Math.min(100, weightedScore));
};

/**
 * Determine opportunity status based on metrics
 */
export const determineStatus = (
	netSpreadBps: number,
	maxSize: number,
	staleData: boolean,
): OpportunityStatus => {
	if (staleData) return "theoretical";
	if (netSpreadBps >= EXECUTABLE_NET_SPREAD_BPS && maxSize >= MIN_EXECUTABLE_SIZE_USD) {
		return "executable";
	}
	if (netSpreadBps >= MARGINAL_NET_SPREAD_BPS) {
		return "marginal";
	}
	return "theoretical";
};

/**
 * Build a complete ArbitrageOpportunity from exchange data
 */
export const buildOpportunity = (
	symbol: string,
	buyData: ExchangeMarketData,
	sellData: ExchangeMarketData,
	existingLifecycle?: OpportunityLifecycle,
): ArbitrageOpportunity | null => {
	// Buy at ask, sell at bid
	const buyPrice = buyData.ask;
	const sellPrice = sellData.bid;

	if (buyPrice <= 0 || sellPrice <= 0) return null;

	// Raw spread
	const spreadAbsolute = sellPrice - buyPrice;
	const rawSpreadBps = (spreadAbsolute / buyPrice) * 10000;

	// Fees
	const fees = calculateRoundTripFees(buyData.exchange, sellData.exchange);
	const buyFees = getFees(buyData.exchange);
	const sellFees = getFees(sellData.exchange);

	// Net spread (after fees, assuming $1000 position for gas calculation)
	const gasCostBps = (fees.totalGasUsd / 1000) * 10000;
	const netSpreadBps = rawSpreadBps - fees.totalBps - gasCostBps;

	// Size & Slippage
	const maxExecutableSize = calculateMaxExecutableSize(buyData.asks, sellData.bids);
	const slippageAt1k = calculateSlippage(buyData.asks, 1000, "buy") +
		calculateSlippage(sellData.bids, 1000, "sell");
	const slippageAt5k = calculateSlippage(buyData.asks, 5000, "buy") +
		calculateSlippage(sellData.bids, 5000, "sell");

	// Lifecycle
	const now = Date.now();
	const lifecycle: OpportunityLifecycle = existingLifecycle
		? {
			...existingLifecycle,
			lastSeenAt: now,
			lifetimeMs: now - existingLifecycle.firstSeenAt,
			peakSpreadBps: Math.max(existingLifecycle.peakSpreadBps, netSpreadBps),
			occurrenceCount: existingLifecycle.occurrenceCount + 1,
			spreadHistory: [...existingLifecycle.spreadHistory.slice(-59), netSpreadBps],
			avgSpreadBps:
				(existingLifecycle.avgSpreadBps * existingLifecycle.occurrenceCount + netSpreadBps) /
				(existingLifecycle.occurrenceCount + 1),
		}
		: {
			firstSeenAt: now,
			lastSeenAt: now,
			lifetimeMs: 0,
			peakSpreadBps: netSpreadBps,
			avgSpreadBps: netSpreadBps,
			occurrenceCount: 1,
			spreadHistory: [netSpreadBps],
		};

	// Risk metrics
	const risk = calculateRiskMetrics(buyData, sellData, lifecycle.spreadHistory);

	// Depth
	const depthBuyAt10Bps = buyData.askDepthAtBps.bps10;
	const depthSellAt10Bps = sellData.bidDepthAtBps.bps10;

	// Score
	const score = calculateScore(
		netSpreadBps,
		maxExecutableSize,
		lifecycle.lifetimeMs,
		Math.min(depthBuyAt10Bps, depthSellAt10Bps),
		risk.riskFlags,
	);

	// Status
	const status = determineStatus(netSpreadBps, maxExecutableSize, risk.staleDataRisk);

	// Funding
	const buyFundingRate = buyData.fundingRate ?? 0;
	const sellFundingRate = sellData.fundingRate ?? 0;
	const fundingDeltaBps = (sellFundingRate - buyFundingRate) * 10000;

	const id = `${symbol}_${buyData.exchange}_${sellData.exchange}`;

	return {
		id,
		symbol,
		strategy: "perp-perp",
		buyExchange: buyData.exchange,
		sellExchange: sellData.exchange,
		buyPrice,
		sellPrice,
		buyData,
		sellData,
		rawSpreadBps,
		netSpreadBps,
		spreadAbsolute,
		maxExecutableSize,
		slippageAt1k,
		slippageAt5k,
		depthBuyAt10Bps,
		depthSellAt10Bps,
		buyFeesBps: buyFees.takerFeeBps,
		sellFeesBps: sellFees.takerFeeBps,
		totalFeesBps: fees.totalBps,
		gasEstimateUsd: fees.totalGasUsd,
		buyFundingRate,
		sellFundingRate,
		fundingDeltaBps,
		lifecycle,
		risk,
		score,
		status,
		lastUpdatedAt: now,
	};
};
