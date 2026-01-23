import { calculateRoundTripFees, getFees } from "./fee-registry";
import type {
	ArbitrageOpportunity,
	DepthAtBps,
	ExchangeMarketData,
	OpportunityLifecycle,
	OpportunityStatus,
	OrderBookLevel,
	RiskMetrics,
} from "./types";

/* ================== CONFIG ================== */

const EXECUTABLE_NET_SPREAD_BPS = 5;
const MARGINAL_NET_SPREAD_BPS = 0;
const MIN_EXECUTABLE_SIZE_USD = 500;
const STALE_DATA_THRESHOLD_MS = 7000;

const SCORE_WEIGHTS = {
	netSpread: 0.35,
	size: 0.2,
	lifetime: 0.15,
	depth: 0.15,
	risk: 0.15,
};

export const calculateDepthAtBps = (
	levels: OrderBookLevel[],
	midPrice: number,
): DepthAtBps => {
	const result: DepthAtBps = { bps5: 0, bps10: 0, bps25: 0 };

	for (const level of levels) {
		const diffBps = (Math.abs(level.price - midPrice) / midPrice) * 10_000;

		const valueUsd = level.price * level.size;

		if (diffBps <= 5) result.bps5 += valueUsd;
		if (diffBps <= 10) result.bps10 += valueUsd;
		if (diffBps <= 25) result.bps25 += valueUsd;
	}

	return result;
};

export const calculateSlippage = (
	levels: OrderBookLevel[],
	sizeUsd: number,
): number => {
	if (!levels.length || sizeUsd <= 0) return 0;

	const referencePrice = levels[0].price;
	let remaining = sizeUsd;
	let totalQty = 0;
	let totalCost = 0;

	for (const level of levels) {
		const levelUsd = level.price * level.size;
		const fillUsd = Math.min(levelUsd, remaining);
		const fillQty = fillUsd / level.price;

		totalQty += fillQty;
		totalCost += fillQty * level.price;
		remaining -= fillUsd;

		if (remaining <= 0) break;
	}

	if (totalQty === 0) return 0;

	const avgPrice = totalCost / totalQty;
	return (Math.abs(avgPrice - referencePrice) / referencePrice) * 10_000;
};

/* ================== MAX SIZE ================== */

export const calculateMaxExecutableSize = (
	buyAsks: OrderBookLevel[],
	sellBids: OrderBookLevel[],
	maxSlippageBps = 10,
): number => {
	let low = 0;
	let high = 50_000;
	let best = 0;

	for (let i = 0; i < 12; i++) {
		const mid = (low + high) / 2;

		const buySlip = calculateSlippage(buyAsks, mid);
		const sellSlip = calculateSlippage(sellBids, mid);

		if (buySlip <= maxSlippageBps && sellSlip <= maxSlippageBps) {
			best = mid;
			low = mid;
		} else {
			high = mid;
		}
	}

	return Math.floor(best / 100) * 100;
};

/* ================== RISK ================== */

export const calculateRiskMetrics = (
	buyData: ExchangeMarketData,
	sellData: ExchangeMarketData,
	spreadHistory: number[],
	depthImbalance: number,
): RiskMetrics => {
	const riskFlags: string[] = [];

	const latencyAsymmetry = Math.abs(buyData.latencyMs - sellData.latencyMs);

	if (latencyAsymmetry > 200) riskFlags.push("latency_asymmetry");

	const now = Date.now();
	const stale =
		now - buyData.timestamp > STALE_DATA_THRESHOLD_MS ||
		now - sellData.timestamp > STALE_DATA_THRESHOLD_MS;

	if (stale) riskFlags.push("stale_data");

	if (depthImbalance < 0.3) riskFlags.push("depth_imbalance");

	let volatility1m = 0;
	if (spreadHistory.length > 1) {
		const mean =
			spreadHistory.reduce((a, b) => a + b, 0) / spreadHistory.length;
		const variance =
			spreadHistory.reduce((s, v) => s + (v - mean) ** 2, 0) /
			spreadHistory.length;
		volatility1m = Math.sqrt(variance);
	}

	if (volatility1m > 5) riskFlags.push("high_volatility");

	// Calculate book skew (imbalance between buy and sell depth)
	const bookSkew = depthImbalance; // Simplified for now

	return {
		volatility1m,
		volatility5m: volatility1m,
		bookSkew,
		latencyRisk: Math.max(buyData.latencyMs, sellData.latencyMs),
		latencyAsymmetryMs: latencyAsymmetry,
		staleDataRisk: stale,
		depthImbalance,
		riskFlags: riskFlags ?? [],
	};
};

/* ================== SCORE ================== */

export const calculateScore = (
	netSpreadBps: number,
	maxSizeUsd: number,
	lifetimeMs: number,
	depth10BpsUsd: number,
	depthImbalance: number,
	riskFlags: string[],
): number => {
	const spreadScore = Math.min(100, Math.max(0, netSpreadBps * 5));
	const sizeScore = Math.min(100, (maxSizeUsd / 10_000) * 100);
	const lifetimeScore = Math.min(100, (lifetimeMs / 60_000) * 100);
	const depthScore = Math.min(100, (depth10BpsUsd / 50_000) * 100);

	const imbalancePenalty = depthImbalance < 0.5 ? (1 - depthImbalance) * 30 : 0;

	const riskPenalty = riskFlags.length * 10;

	const score =
		spreadScore * SCORE_WEIGHTS.netSpread +
		sizeScore * SCORE_WEIGHTS.size +
		lifetimeScore * SCORE_WEIGHTS.lifetime +
		depthScore * SCORE_WEIGHTS.depth -
		imbalancePenalty -
		riskPenalty * SCORE_WEIGHTS.risk;

	return Math.max(0, Math.min(100, score));
};

/* ================== STATUS ================== */

export const determineStatus = (
	netSpreadBps: number,
	maxSize: number,
	stale: boolean,
): OpportunityStatus => {
	if (stale) return "theoretical";
	if (
		netSpreadBps >= EXECUTABLE_NET_SPREAD_BPS &&
		maxSize >= MIN_EXECUTABLE_SIZE_USD
	) {
		return "executable";
	}
	if (netSpreadBps >= MARGINAL_NET_SPREAD_BPS) return "marginal";
	return "theoretical";
};

/* ================== BUILD ================== */

export const buildOpportunity = (
	symbol: string,
	buyData: ExchangeMarketData,
	sellData: ExchangeMarketData,
	existingLifecycle?: OpportunityLifecycle,
): ArbitrageOpportunity | null => {
	if (buyData.ask <= 0 || sellData.bid <= 0) return null;

	const rawSpreadBps = ((sellData.bid - buyData.ask) / buyData.ask) * 10_000;
	const spreadAbsolute = sellData.bid - buyData.ask;

	const fees = calculateRoundTripFees(buyData.exchange, sellData.exchange);
	const buyFees = getFees(buyData.exchange);
	const sellFees = getFees(sellData.exchange);

	const gasCostBps = (fees.totalGasUsd / 1000) * 10_000;
	const netSpreadBps = rawSpreadBps - fees.totalBps - gasCostBps;

	const maxExecutableSize = calculateMaxExecutableSize(
		buyData.asks,
		sellData.bids,
	);

	const slippageAt1k = calculateSlippage(buyData.asks, 1000) + calculateSlippage(sellData.bids, 1000);
	const slippageAt5k = calculateSlippage(buyData.asks, 5000) + calculateSlippage(sellData.bids, 5000);

	const now = Date.now();
	const lifecycle: OpportunityLifecycle = existingLifecycle
		? {
				...existingLifecycle,
				lastSeenAt: now,
				lifetimeMs: now - existingLifecycle.firstSeenAt,
				occurrenceCount: existingLifecycle.occurrenceCount + 1,
				peakSpreadBps: Math.max(existingLifecycle.peakSpreadBps, netSpreadBps),
				spreadHistory: [
					...existingLifecycle.spreadHistory.slice(-59),
					netSpreadBps,
				],
			}
		: {
				firstSeenAt: now,
				lastSeenAt: now,
				lifetimeMs: 0,
				occurrenceCount: 1,
				peakSpreadBps: netSpreadBps,
				avgSpreadBps: netSpreadBps,
				spreadHistory: [netSpreadBps],
			};

	const depthBuyAt10Bps = buyData.askDepthAtBps.bps10;
	const depthSellAt10Bps = sellData.bidDepthAtBps.bps10;

	const depthImbalance =
		depthBuyAt10Bps > 0 && depthSellAt10Bps > 0
			? Math.min(depthBuyAt10Bps, depthSellAt10Bps) /
				Math.max(depthBuyAt10Bps, depthSellAt10Bps)
			: 0;

	const risk = calculateRiskMetrics(
		buyData,
		sellData,
		lifecycle.spreadHistory,
		depthImbalance,
	);

	const score = calculateScore(
		netSpreadBps,
		maxExecutableSize,
		lifecycle.lifetimeMs,
		Math.min(depthBuyAt10Bps, depthSellAt10Bps),
		depthImbalance,
		risk.riskFlags,
	);

	const status = determineStatus(
		netSpreadBps,
		maxExecutableSize,
		risk.staleDataRisk,
	);

	const id = `${symbol}_${buyData.exchange}_${sellData.exchange}`;

	// Funding rates
	const buyFundingRate = buyData.fundingRate || 0;
	const sellFundingRate = sellData.fundingRate || 0;
	const fundingDeltaBps = (sellFundingRate - buyFundingRate) * 10000;

	return {
		id,
		symbol,
		strategy: "perp-perp",
		buyExchange: buyData.exchange,
		sellExchange: sellData.exchange,
		buyPrice: buyData.ask,
		sellPrice: sellData.bid,
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
		depthImbalance,
		risk,
		score,
		status,
		lifecycle,
		lastUpdatedAt: now,
	};
};
