import type { MarketSnapshot } from "../../services/markets/market-snapshots.types";
import { normalizeOptionalNumber } from "../../common/number.utils";
import {
	annualizeHourlyFundingRate,
	normalizeOverviewSymbol,
	normalizeOptionalTimestamp,
} from "../../services/funding/funding-overview.utils";
import { FUNDING_INTERVAL_HOURS } from "../../services/funding/funding.constants";
import type {
	EtherealL2BookData,
	EtherealL2BookMessage,
	EtherealTickerData,
	EtherealTickerMessage,
	EtherealWsSubscriptionMessage,
} from "./ethereal.ws.types";
import {DEFAULT_CURRENCY} from "../../common/constants";

/** Builds an Ethereal ticker subscription for one source symbol. */
export const createEtherealTickerSubscriptionMessage = (
	symbol: string,
): EtherealWsSubscriptionMessage => ({
	event: "subscribe",
	data: {
		type: "Ticker",
		symbol,
	},
});

/** Builds an Ethereal level-2 order book subscription for one source symbol. */
export const createEtherealL2BookSubscriptionMessage = (
	symbol: string,
): EtherealWsSubscriptionMessage => ({
	event: "subscribe",
	data: {
		type: "L2Book",
		symbol,
	},
});

/** Type guard for Ethereal ticker messages. */
export const isEtherealTickerMessage = (
	message: unknown,
): message is EtherealTickerMessage => {
	if (!isRecord(message) || message.e !== "Ticker" || !isRecord(message.data)) {
		return false;
	}

	return typeof message.data.s === "string";
};

/** Type guard for Ethereal level-2 order book messages. */
export const isEtherealL2BookMessage = (
	message: unknown,
): message is EtherealL2BookMessage => {
	if (!isRecord(message) || message.e !== "L2Book" || !isRecord(message.data)) {
		return false;
	}

	return typeof message.data.s === "string" &&
		Array.isArray(message.data.a) &&
		Array.isArray(message.data.b);
};

/** Maps an Ethereal ticker into normalized price, funding, and liquidity fields. */
export const mapEtherealTickerToMarketSnapshot = (
	ticker: EtherealTickerData,
	serverTimestamp?: number,
): MarketSnapshot => {
	const bidPrice = normalizeOptionalNumber(ticker.bidPx);
	const bidSize = normalizeOptionalNumber(ticker.bidAmt);
	const askPrice = normalizeOptionalNumber(ticker.askPx);
	const askSize = normalizeOptionalNumber(ticker.askAmt);
	const fundingRate = normalizeOptionalNumber(ticker.fr1h);
	const markPrice = normalizeOptionalNumber(ticker.markPx);
	const openInterest = normalizeOptionalNumber(ticker.oi);
	const timestamp = normalizeOptionalTimestamp(ticker.t ?? serverTimestamp);
	const volume24h = normalizeOptionalNumber(ticker.vol24h);

	return {
		exchange: "ethereal",
		symbol: normalizeEtherealTickerSymbol(ticker.s),
		sourceSymbol: ticker.s,
		...(fundingRate !== undefined ? { fundingRate } : {}),
		...(fundingRate !== undefined
			? { fundingIntervalHours: FUNDING_INTERVAL_HOURS.ETHEREAL }
			: {}),
		...(fundingRate !== undefined
			? { fundingApr: annualizeHourlyFundingRate(fundingRate) }
			: {}),
		...(bidPrice !== undefined ? { bidPrice } : {}),
		...(askPrice !== undefined ? { askPrice } : {}),
		...(bidSize !== undefined ? { bidSize } : {}),
		...(askSize !== undefined ? { askSize } : {}),
		...(markPrice !== undefined ? { markPrice } : {}),
		...(bidPrice !== undefined && askPrice !== undefined
			? { midPrice: (bidPrice + askPrice) / 2 }
			: {}),
		...(openInterest !== undefined ? { openInterest } : {}),
		...(volume24h !== undefined ? { volume24h } : {}),
		...(timestamp !== undefined ? { timestamp } : {}),
	};
};

/** Maps an Ethereal L2 book into top-of-book and depth snapshot fields. */
export const mapEtherealL2BookToMarketSnapshot = (
	book: EtherealL2BookData,
	serverTimestamp?: number,
): MarketSnapshot => {
	const bidLevels = book.b.map(mapEtherealBookLevel).filter(isDefined);
	const askLevels = book.a.map(mapEtherealBookLevel).filter(isDefined);
	const bestBid = bidLevels[0];
	const bestAsk = askLevels[0];
	const timestamp = normalizeOptionalTimestamp(book.t ?? book.pt ?? serverTimestamp);

	return {
		exchange: "ethereal",
		symbol: normalizeEtherealTickerSymbol(book.s),
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

const normalizeEtherealTickerSymbol = (symbol: string): string => {
	const normalizedSymbol = normalizeOverviewSymbol(symbol);

	return normalizedSymbol.endsWith(DEFAULT_CURRENCY)
		? normalizedSymbol.slice(0, -DEFAULT_CURRENCY.length)
		: normalizedSymbol;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null;

const mapEtherealBookLevel = (
	level: [string, string],
): { price: number; size: number } | undefined => {
	const price = normalizeOptionalNumber(level[0]);
	const size = normalizeOptionalNumber(level[1]);

	return price === undefined || size === undefined
		? undefined
		: { price, size };
};

const isDefined = <Value>(value: Value | undefined): value is Value =>
	value !== undefined;
