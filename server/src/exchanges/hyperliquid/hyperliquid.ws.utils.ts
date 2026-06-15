import { normalizeOptionalNumber } from "#common/number.utils";
import {
	FUNDING_INTERVAL_HOURS,
} from "#services/funding/funding-core/funding.constants";
import {
	annualizeHourlyFundingRate,
	normalizeOverviewSymbol,
} from "#services/funding/funding-overview/funding-overview.utils";
import type { MarketSnapshot } from "#services/markets/market-snapshots/market-snapshots.types";
import type {
	HyperliquidActiveAssetCtxMessage,
	HyperliquidAllMidsMessage,
	HyperliquidBboMessage,
	HyperliquidL2BookMessage,
	HyperliquidWsPingMessage,
	HyperliquidWsSubscriptionMessage,
} from "./hyperliquid.ws.types";

/** Builds the Hyperliquid all-mids subscription. */
export const createHyperliquidAllMidsSubscriptionMessage =
	(): HyperliquidWsSubscriptionMessage => ({
		method: "subscribe",
		subscription: {
			type: "allMids",
		},
	});

/** Builds a Hyperliquid BBO subscription for one coin. */
export const createHyperliquidBboSubscriptionMessage = (
	coin: string,
): HyperliquidWsSubscriptionMessage => ({
	method: "subscribe",
	subscription: {
		type: "bbo",
		coin,
	},
});

/** Builds a Hyperliquid L2 book subscription for one coin. */
export const createHyperliquidL2BookSubscriptionMessage = (
	coin: string,
): HyperliquidWsSubscriptionMessage => ({
	method: "subscribe",
	subscription: {
		type: "l2Book",
		coin,
	},
});

/** Builds a Hyperliquid active asset context subscription for one coin. */
export const createHyperliquidActiveAssetCtxSubscriptionMessage = (
	coin: string,
): HyperliquidWsSubscriptionMessage => ({
	method: "subscribe",
	subscription: {
		type: "activeAssetCtx",
		coin,
	},
});

/** Builds a Hyperliquid ping frame used to keep the WebSocket alive. */
export const createHyperliquidPingMessage = (): HyperliquidWsPingMessage => ({
	method: "ping",
});

/** Type guard for Hyperliquid all-mids messages. */
export const isHyperliquidAllMidsMessage = (
	message: unknown,
): message is HyperliquidAllMidsMessage => {
	if (!isRecord(message) || message.channel !== "allMids") {
		return false;
	}

	if (!isRecord(message.data)) {
		return false;
	}

	return isRecord(message.data.mids);
};

/** Type guard for Hyperliquid BBO messages. */
export const isHyperliquidBboMessage = (
	message: unknown,
): message is HyperliquidBboMessage => {
	if (!isRecord(message) || message.channel !== "bbo") {
		return false;
	}

	if (!isRecord(message.data)) {
		return false;
	}

	return typeof message.data.coin === "string" && Array.isArray(message.data.bbo);
};

/** Type guard for Hyperliquid active asset context messages. */
export const isHyperliquidActiveAssetCtxMessage = (
	message: unknown,
): message is HyperliquidActiveAssetCtxMessage => {
	if (!isRecord(message) || message.channel !== "activeAssetCtx") {
		return false;
	}

	if (!isRecord(message.data)) {
		return false;
	}

	return typeof message.data.coin === "string" && isRecord(message.data.ctx);
};

/** Type guard for Hyperliquid L2 book messages. */
export const isHyperliquidL2BookMessage = (
	message: unknown,
): message is HyperliquidL2BookMessage => {
	if (!isRecord(message) || message.channel !== "l2Book") {
		return false;
	}

	if (!isRecord(message.data)) {
		return false;
	}

	return typeof message.data.coin === "string" && Array.isArray(message.data.levels);
};

/** Maps all Hyperliquid mid prices into normalized market snapshots. */
export const mapHyperliquidAllMidsToMarketSnapshots = (
	mids: Record<string, string>,
	timestamp = Date.now(),
): MarketSnapshot[] =>
	Object.entries(mids).flatMap(([sourceSymbol, mid]) => {
		const midPrice = normalizeOptionalNumber(mid);

		if (midPrice === undefined) {
			return [];
		}

		return {
			exchange: "hyperliquid",
			symbol: normalizeOverviewSymbol(sourceSymbol),
			sourceSymbol,
			midPrice,
			timestamp,
		};
	});

/** Maps a Hyperliquid BBO event into top-of-book snapshot fields. */
export const mapHyperliquidBboToMarketSnapshot = (
	data: HyperliquidBboMessage["data"],
): MarketSnapshot => {
	const [bid, ask] = data.bbo;
	const bidPrice = normalizeOptionalNumber(bid?.px);
	const bidSize = normalizeOptionalNumber(bid?.sz);
	const askPrice = normalizeOptionalNumber(ask?.px);
	const askSize = normalizeOptionalNumber(ask?.sz);

	return {
		exchange: "hyperliquid",
		symbol: normalizeOverviewSymbol(data.coin),
		sourceSymbol: data.coin,
		...(bidPrice !== undefined ? { bidPrice } : {}),
		...(askPrice !== undefined ? { askPrice } : {}),
		...(bidSize !== undefined ? { bidSize } : {}),
		...(askSize !== undefined ? { askSize } : {}),
		...(bidPrice !== undefined && askPrice !== undefined
			? { midPrice: (bidPrice + askPrice) / 2 }
			: {}),
		timestamp: data.time,
	};
};

/** Maps a Hyperliquid L2 book event into depth snapshot fields. */
export const mapHyperliquidL2BookToMarketSnapshot = (
	data: HyperliquidL2BookMessage["data"],
): MarketSnapshot => {
	const [bids, asks] = data.levels;
	const bidLevels = bids.map(mapHyperliquidBookLevel).filter(isDefined);
	const askLevels = asks.map(mapHyperliquidBookLevel).filter(isDefined);
	const bestBid = bidLevels[0];
	const bestAsk = askLevels[0];

	return {
		exchange: "hyperliquid",
		symbol: normalizeOverviewSymbol(data.coin),
		sourceSymbol: data.coin,
		...(bestBid !== undefined ? { bidPrice: bestBid.price, bidSize: bestBid.size } : {}),
		...(bestAsk !== undefined ? { askPrice: bestAsk.price, askSize: bestAsk.size } : {}),
		...(bestBid !== undefined && bestAsk !== undefined
			? { midPrice: (bestBid.price + bestAsk.price) / 2 }
			: {}),
		...(bidLevels.length ? { orderBookBids: bidLevels } : {}),
		...(askLevels.length ? { orderBookAsks: askLevels } : {}),
		timestamp: data.time,
	};
};

/** Maps Hyperliquid active asset context into funding and liquidity metadata. */
export const mapHyperliquidActiveAssetCtxToMarketSnapshot = (
	data: HyperliquidActiveAssetCtxMessage["data"],
	timestamp = Date.now(),
): MarketSnapshot => {
	const fundingRate = normalizeOptionalNumber(data.ctx.funding);
	const indexPrice = normalizeOptionalNumber(data.ctx.oraclePx);
	const markPrice = normalizeOptionalNumber(data.ctx.markPx);
	const midPrice = normalizeOptionalNumber(data.ctx.midPx);
	const openInterest = normalizeOptionalNumber(data.ctx.openInterest);
	const volume24h = normalizeOptionalNumber(data.ctx.dayNtlVlm);

	return {
		exchange: "hyperliquid",
		symbol: normalizeOverviewSymbol(data.coin),
		sourceSymbol: data.coin,
		...(fundingRate !== undefined ? { fundingRate } : {}),
		...(fundingRate !== undefined
			? { fundingIntervalHours: FUNDING_INTERVAL_HOURS.HYPERLIQUID }
			: {}),
		...(fundingRate !== undefined
			? { fundingApr: annualizeHourlyFundingRate(fundingRate) }
			: {}),
		...(indexPrice !== undefined ? { indexPrice } : {}),
		...(markPrice !== undefined ? { markPrice } : {}),
		...(midPrice !== undefined ? { midPrice } : {}),
		...(openInterest !== undefined ? { openInterest } : {}),
		...(volume24h !== undefined ? { volume24h } : {}),
		timestamp,
	};
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null;

const mapHyperliquidBookLevel = (
	level: { px: string; sz: string },
): { price: number; size: number } | undefined => {
	const price = normalizeOptionalNumber(level.px);
	const size = normalizeOptionalNumber(level.sz);

	return price === undefined || size === undefined
		? undefined
		: { price, size };
};

const isDefined = <Value>(value: Value | undefined): value is Value =>
	value !== undefined;
