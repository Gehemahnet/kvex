import { normalizeOptionalNumber } from "../../common/number.utils";
import { FUNDING_INTERVAL_HOURS } from "../../services/funding/funding.constants";
import {
	annualizeFundingRate,
	normalizeOverviewSymbol,
	normalizeFundingRateToHourly,
} from "../../services/funding/funding-overview.utils";
import type {
	MarketOrderBookLevel,
	MarketSnapshot,
} from "../../services/markets/market-snapshots.types";
import type {
	NadoMarketLiquidity,
	NadoMarketLiquidityLevel,
	NadoSymbol,
} from "./nado.types";
import type {
	NadoBestBidOfferEvent,
	NadoBookDepthEvent,
	NadoFundingRateEvent,
	NadoWsSubscriptionMessage,
	NadoWsStreamSubscription,
} from "./nado.ws.types";

type NadoBookDepthResyncEvent = {
	productId: number;
	symbol?: string;
	expectedLastMaxTimestamp?: string;
	actualLastMaxTimestamp?: string;
	maxTimestamp?: string;
};

export type NadoBookDepthResyncSummary = {
	productId: number;
	symbol?: string;
	totalGapCount: number;
	productGapCount: number;
	expectedLastMaxTimestamp?: string;
	actualLastMaxTimestamp?: string;
	maxTimestamp?: string;
};

/** Builds per-product Nado market-data subscriptions for BBO, funding, and depth. */
export const createNadoMarketDataSubscriptionMessage = (
	productIds: number[],
): NadoWsSubscriptionMessage[] =>
	productIds.flatMap(createNadoProductSubscriptions).map((stream, index) => ({
		method: "subscribe",
		stream,
		id: index + 1,
	}));

/** Type guard for live Nado best-bid-offer events. */
export const isNadoBestBidOfferEvent = (
	message: unknown,
): message is NadoBestBidOfferEvent =>
	isRecord(message) &&
	message.type === "best_bid_offer" &&
	typeof message.product_id === "number";

/** Type guard for live Nado funding-rate events. */
export const isNadoFundingRateEvent = (
	message: unknown,
): message is NadoFundingRateEvent =>
	isRecord(message) &&
	message.type === "funding_rate" &&
	typeof message.product_id === "number";

/** Type guard for live Nado incremental depth events. */
export const isNadoBookDepthEvent = (
	message: unknown,
): message is NadoBookDepthEvent =>
	isRecord(message) &&
	message.type === "book_depth" &&
	typeof message.product_id === "number" &&
	Array.isArray(message.bids) &&
	Array.isArray(message.asks);

/** Creates a product id to normalized symbol map from live Nado perp symbols. */
export const createNadoSymbolMap = (
	symbols: NadoSymbol[],
): Map<number, string> =>
	new Map(
		symbols
			.filter((symbol) => symbol.type === "perp" && symbol.trading_status === "live")
			.map((symbol) => [symbol.product_id, normalizeOverviewSymbol(symbol.symbol)]),
	);

/** Maps a Nado BBO event into a partial market snapshot. */
export const mapNadoBestBidOfferToMarketSnapshot = (
	event: NadoBestBidOfferEvent,
	symbolMap: Map<number, string>,
): MarketSnapshot | undefined => {
	const symbol = symbolMap.get(event.product_id);

	if (!symbol) {
		return undefined;
	}

	const bidPrice = normalizeX18Number(event.bid_price);
	const bidSize = normalizeX18Number(event.bid_qty);
	const askPrice = normalizeX18Number(event.ask_price);
	const askSize = normalizeX18Number(event.ask_qty);
	const timestamp = normalizeNadoTimestamp(event.timestamp);

	return {
		exchange: "nado",
		symbol,
		sourceSymbol: symbol,
		...(bidPrice !== undefined ? { bidPrice } : {}),
		...(bidSize !== undefined ? { bidSize } : {}),
		...(askPrice !== undefined ? { askPrice } : {}),
		...(askSize !== undefined ? { askSize } : {}),
		...(bidPrice !== undefined && askPrice !== undefined
			? { midPrice: (bidPrice + askPrice) / 2 }
			: {}),
		...(timestamp !== undefined ? { timestamp } : {}),
	};
};

/** Maps a Nado funding event into normalized hourly funding snapshot fields. */
export const mapNadoFundingRateToMarketSnapshot = (
	event: NadoFundingRateEvent,
	symbolMap: Map<number, string>,
): MarketSnapshot | undefined => {
	const symbol = symbolMap.get(event.product_id);

	if (!symbol) {
		return undefined;
	}

	const fundingRate = normalizeX18Number(event.funding_rate_x18);
	const hourlyFundingRate = normalizeFundingRateToHourly(
		fundingRate,
		FUNDING_INTERVAL_HOURS.NADO,
	);
	const timestamp = normalizeNadoTimestamp(event.timestamp ?? event.update_time);

	return {
		exchange: "nado",
		symbol,
		sourceSymbol: symbol,
		...(hourlyFundingRate !== undefined
			? { fundingRate: hourlyFundingRate }
			: {}),
		...(hourlyFundingRate !== undefined
			? { fundingIntervalHours: FUNDING_INTERVAL_HOURS.NADO }
			: {}),
		...(hourlyFundingRate !== undefined
			? { fundingApr: annualizeFundingRate(fundingRate, FUNDING_INTERVAL_HOURS.NADO) }
			: {}),
		...(timestamp !== undefined ? { timestamp } : {}),
	};
};

/** Maps a REST market-liquidity snapshot into top-of-book and depth fields. */
export const mapNadoMarketLiquidityToMarketSnapshot = (
	liquidity: NadoMarketLiquidity,
	symbolMap: Map<number, string>,
): MarketSnapshot | undefined => {
	const symbol = symbolMap.get(liquidity.product_id);

	if (!symbol) {
		return undefined;
	}

	const bidLevels = liquidity.bids
		.map(mapNadoMarketLiquidityLevel)
		.filter(isDefined);
	const askLevels = liquidity.asks
		.map(mapNadoMarketLiquidityLevel)
		.filter(isDefined);
	const bestBid = bidLevels[0];
	const bestAsk = askLevels[0];
	const timestamp = normalizeNadoTimestamp(liquidity.timestamp);

	return {
		exchange: "nado",
		symbol,
		sourceSymbol: symbol,
		...(bestBid !== undefined ? { bidPrice: bestBid.price, bidSize: bestBid.size } : {}),
		...(bestAsk !== undefined ? { askPrice: bestAsk.price, askSize: bestAsk.size } : {}),
		...(bestBid !== undefined && bestAsk !== undefined
			? { midPrice: (bestBid.price + bestAsk.price) / 2 }
			: {}),
		...(bidLevels.length ? { orderBookBids: bidLevels } : {}),
		...(askLevels.length ? { orderBookAsks: askLevels } : {}),
		...(timestamp !== undefined ? { timestamp } : {}),
	};
};

/** Applies one incremental Nado depth diff to the current local order book. */
export const applyNadoBookDepthUpdate = (
	book: {
		bids: MarketOrderBookLevel[];
		asks: MarketOrderBookLevel[];
	},
	event: NadoBookDepthEvent,
): {
	bids: MarketOrderBookLevel[];
	asks: MarketOrderBookLevel[];
} => ({
	bids: applyNadoDepthSide(book.bids, event.bids, "desc"),
	asks: applyNadoDepthSide(book.asks, event.asks, "asc"),
});

/**
 * Tracks Nado depth gap/resync events and returns throttled summaries suitable
 * for logging without flooding the dev server.
 */
export const createNadoBookDepthResyncMonitor = (params: {
	logIntervalMs: number;
	now?: () => number;
}): {
	recordGap: (
		event: NadoBookDepthResyncEvent,
	) => NadoBookDepthResyncSummary | undefined;
	recordFailure: (
		event: Pick<NadoBookDepthResyncEvent, "productId" | "symbol">,
	) => NadoBookDepthResyncSummary | undefined;
} => {
	const productGapCounts = new Map<number, number>();
	let totalGapCount = 0;
	let lastLoggedAt = 0;
	const now = params.now ?? Date.now;

	const createSummary = (
		event: NadoBookDepthResyncEvent,
	): NadoBookDepthResyncSummary => ({
		productId: event.productId,
		...(event.symbol !== undefined ? { symbol: event.symbol } : {}),
		totalGapCount,
		productGapCount: productGapCounts.get(event.productId) ?? 0,
		...(event.expectedLastMaxTimestamp !== undefined
			? { expectedLastMaxTimestamp: event.expectedLastMaxTimestamp }
			: {}),
		...(event.actualLastMaxTimestamp !== undefined
			? { actualLastMaxTimestamp: event.actualLastMaxTimestamp }
			: {}),
		...(event.maxTimestamp !== undefined ? { maxTimestamp: event.maxTimestamp } : {}),
	});

	const shouldReport = (): boolean => {
		const currentTime = now();

		if (lastLoggedAt !== 0 && currentTime - lastLoggedAt < params.logIntervalMs) {
			return false;
		}

		lastLoggedAt = currentTime;
		return true;
	};

	return {
		recordGap: (event) => {
			totalGapCount += 1;
			productGapCounts.set(
				event.productId,
				(productGapCounts.get(event.productId) ?? 0) + 1,
			);

			return shouldReport() ? createSummary(event) : undefined;
		},
		recordFailure: (event) =>
			shouldReport()
				? createSummary({
					productId: event.productId,
					...(event.symbol !== undefined ? { symbol: event.symbol } : {}),
				})
				: undefined,
	};
};

const createNadoProductSubscriptions = (
	productId: number,
): NadoWsStreamSubscription[] => [
	{
		type: "best_bid_offer",
		product_id: productId,
	},
	{
		type: "funding_rate",
		product_id: productId,
	},
	{
		type: "book_depth",
		product_id: productId,
	},
];

const normalizeX18Number = (value?: string): number | undefined => {
	const numberValue = normalizeOptionalNumber(value);

	return numberValue === undefined ? undefined : numberValue / 1e18;
};

const normalizeNadoTimestamp = (value?: string): number | undefined => {
	const numberValue = normalizeOptionalNumber(value);

	if (numberValue === undefined) {
		return undefined;
	}

	if (numberValue > 1_000_000_000_000_000) {
		return Math.floor(numberValue / 1_000_000);
	}

	return numberValue < 1_000_000_000_000 ? numberValue * 1000 : numberValue;
};

const mapNadoMarketLiquidityLevel = (
	level: NadoMarketLiquidityLevel,
): MarketOrderBookLevel | undefined => {
	const price = normalizeX18Number(level[0]);
	const size = normalizeX18Number(level[1]);

	return price === undefined || size === undefined
		? undefined
		: { price, size };
};

const applyNadoDepthSide = (
	currentLevels: MarketOrderBookLevel[],
	updates: NadoMarketLiquidityLevel[],
	direction: "asc" | "desc",
): MarketOrderBookLevel[] => {
	const byPrice = new Map(currentLevels.map((level) => [level.price, level.size]));

	for (const update of updates) {
		const nextLevel = mapNadoMarketLiquidityLevel(update);

		if (!nextLevel || nextLevel.size <= 0) {
			const price = normalizeX18Number(update[0]);

			if (price !== undefined) {
				byPrice.delete(price);
			}

			continue;
		}

		byPrice.set(nextLevel.price, nextLevel.size);
	}

	return [...byPrice.entries()]
		.map(([price, size]) => ({ price, size }))
		.sort((first, second) =>
			direction === "asc"
				? first.price - second.price
				: second.price - first.price,
		);
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null;

const isDefined = <Value>(value: Value | undefined): value is Value =>
	value !== undefined;
