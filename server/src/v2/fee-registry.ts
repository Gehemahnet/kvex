import type { Exchange, ExchangeFees } from "./types";

/**
 * Fee registry for all supported exchanges.
 * Fees are in basis points (bps) where 1 bps = 0.01%
 *
 * Sources:
 * - Paradex: https://docs.paradex.trade/getting-started/fees
 * - Hyperliquid: https://hyperliquid.gitbook.io/hyperliquid-docs/trading/fees
 * - Pacifica: https://docs.pacifica.finance/fees
 * - Ethereal: https://docs.ethereal.trade/fees
 */
export const EXCHANGE_FEES: Record<Exchange, ExchangeFees> = {
	paradex: {
		takerFeeBps: 3.5, // 0.035%
		makerFeeBps: 2.0, // 0.02%
		gasEstimateUsd: 0.05, // StarkNet gas
	},
	hyperliquid: {
		takerFeeBps: 3.5, // 0.035%
		makerFeeBps: 1.0, // 0.01%
		gasEstimateUsd: 0, // L1 built-in
	},
	pacifica: {
		takerFeeBps: 4.0, // 0.04%
		makerFeeBps: 2.0, // 0.02%
		gasEstimateUsd: 0.02, // Solana gas
	},
	ethereal: {
		takerFeeBps: 3.0, // 0.03%
		makerFeeBps: 1.5, // 0.015%
		gasEstimateUsd: 0.01, // Low gas chain
	},
};

/**
 * Calculate total fees for a round-trip trade (buy + sell)
 * Assumes taker fees on both legs (worst case for arbitrage)
 */
export const calculateRoundTripFees = (
	buyExchange: Exchange,
	sellExchange: Exchange,
): { totalBps: number; totalGasUsd: number } => {
	const buyFees = EXCHANGE_FEES[buyExchange];
	const sellFees = EXCHANGE_FEES[sellExchange];

	return {
		totalBps: buyFees.takerFeeBps + sellFees.takerFeeBps,
		totalGasUsd: buyFees.gasEstimateUsd + sellFees.gasEstimateUsd,
	};
};

/**
 * Calculate net spread after fees
 */
export const calculateNetSpread = (
	rawSpreadBps: number,
	buyExchange: Exchange,
	sellExchange: Exchange,
	positionSizeUsd: number = 1000,
): number => {
	const { totalBps, totalGasUsd } = calculateRoundTripFees(buyExchange, sellExchange);
	const gasCostBps = (totalGasUsd / positionSizeUsd) * 10000;
	return rawSpreadBps - totalBps - gasCostBps;
};

export const getFees = (exchange: Exchange): ExchangeFees => {
	return EXCHANGE_FEES[exchange];
};
