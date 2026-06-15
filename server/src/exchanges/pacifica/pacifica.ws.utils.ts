import { normalizeOptionalNumber } from "#common/number.utils";
import { FUNDING_INTERVAL_HOURS } from "#services/funding/funding-core/funding.constants";
import {
	annualizeHourlyFundingRate,
	normalizeOptionalTimestamp,
	normalizeOverviewSymbol,
} from "#services/funding/funding-overview/funding-overview.utils";
import type {
	MarketOrderBookLevel,
	MarketSnapshot,
} from "#services/markets/market-snapshots/market-snapshots.types";
import type {
	PacificaBookData,
	PacificaBookLevel,
	PacificaBookMessage,
	PacificaPriceData,
	PacificaPricesMessage,
	PacificaWsPingMessage,
	PacificaWsSubscriptionMessage,
} from "./pacifica.ws.types";

/** Builds the Pacifica all-symbol prices subscription. */
export const createPacificaPricesSubscriptionMessage =
	(): PacificaWsSubscriptionMessage => ({
		method: "subscribe",
		params: {
			source: "prices",
		},
	});

/** Builds a Pacifica order book subscription for one source symbol. */
export const createPacificaBookSubscriptionMessage = (
	symbol: string,
	aggregationLevel = 1,
): PacificaWsSubscriptionMessage => ({
	method: "subscribe",
	params: {
		source: "book",
		symbol,
		agg_level: aggregationLevel,
	},
});

/** Builds a Pacifica ping frame used to keep the WebSocket alive. */
export const createPacificaPingMessage = (): PacificaWsPingMessage => ({
	method: "ping",
});

/** Type guard for Pacifica all-symbol prices messages. */
export const isPacificaPricesMessage = (
	message: unknown,
): message is PacificaPricesMessage => {
	if (!isRecord(message) || message.channel !== "prices") {
		return false;
	}

	return Array.isArray(message.data);
};

/** Type guard for Pacifica order book messages. */
export const isPacificaBookMessage = (
	message: unknown,
): message is PacificaBookMessage => {
	if (!isRecord(message) || message.channel !== "book" || !isRecord(message.data)) {
		return false;
	}

	return typeof message.data.s === "string" && Array.isArray(message.data.l);
};

/** Maps a Pacifica prices row into normalized price, funding, and liquidity fields. */
export const mapPacificaPriceToMarketSnapshot = (
	price: PacificaPriceData,
): MarketSnapshot => {
	const fundingRate = normalizeOptionalNumber(price.funding);
	const indexPrice = normalizeOptionalNumber(price.oracle);
	const markPrice = normalizeOptionalNumber(price.mark);
	const midPrice = normalizeOptionalNumber(price.mid);
	const openInterest = normalizeOptionalNumber(price.open_interest);
	const timestamp = normalizeOptionalTimestamp(price.timestamp);
	const volume24h = normalizeOptionalNumber(price.volume_24h);

	return {
		exchange: "pacifica",
		symbol: normalizeOverviewSymbol(price.symbol),
		sourceSymbol: price.symbol,
		...(fundingRate !== undefined ? { fundingRate } : {}),
		...(fundingRate !== undefined
			? { fundingIntervalHours: FUNDING_INTERVAL_HOURS.PACIFICA }
			: {}),
		...(fundingRate !== undefined
			? { fundingApr: annualizeHourlyFundingRate(fundingRate) }
			: {}),
		...(markPrice !== undefined ? { markPrice } : {}),
		...(indexPrice !== undefined ? { indexPrice } : {}),
		...(midPrice !== undefined ? { midPrice } : {}),
		...(openInterest !== undefined ? { openInterest } : {}),
		...(volume24h !== undefined ? { volume24h } : {}),
		...(timestamp !== undefined ? { timestamp } : {}),
	};
};

/** Maps a Pacifica book payload into top-of-book and depth snapshot fields. */
export const mapPacificaBookToMarketSnapshot = (
	book: PacificaBookData,
): MarketSnapshot => {
	const [bids, asks] = book.l;
	const bidLevels = bids.map(mapPacificaBookLevel).filter(isDefined);
	const askLevels = asks.map(mapPacificaBookLevel).filter(isDefined);
	const bestBid = bidLevels[0];
	const bestAsk = askLevels[0];
	const timestamp = normalizeOptionalTimestamp(book.t);

	return {
		exchange: "pacifica",
		symbol: normalizeOverviewSymbol(book.s),
		sourceSymbol: book.s,
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

/** Returns unique symbols that should receive Pacifica depth subscriptions. */
export const createPacificaDepthSymbols = (
	markets: { symbol: string }[],
): string[] => [...new Set(markets.map((market) => market.symbol).filter(Boolean))];

const mapPacificaBookLevel = (
	level: PacificaBookLevel,
): MarketOrderBookLevel | undefined => {
	const price = normalizeOptionalNumber(level.p);
	const size = normalizeOptionalNumber(level.a);

	return price === undefined || size === undefined
		? undefined
		: { price, size };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null;

const isDefined = <Value>(value: Value | undefined): value is Value =>
	value !== undefined;
