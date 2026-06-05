import { normalizeOptionalNumber } from "../../common/number.utils";
import { FUNDING_INTERVAL_HOURS } from "../../services/funding/funding.constants";
import {
	annualizeFundingRate,
	normalizeFundingRateToHourly,
	normalizeOptionalTimestamp,
} from "../../services/funding/funding-overview.utils";
import type { MarketSnapshot } from "../../services/markets/market-snapshots.types";
import { normalizeOkxSwapSymbol } from "./okx.utils";
import type {
	OkxBookMessage,
	OkxFundingRateMessage,
	OkxTickerMessage,
	OkxWsSubscriptionMessage,
} from "./okx.ws.types";

/** Builds OKX public subscriptions for tickers, funding, and level-5 books. */
export const createOkxMarketDataSubscriptionMessage = (
	instIds: string[],
): OkxWsSubscriptionMessage => ({
	op: "subscribe",
	args: instIds.flatMap((instId) => [
		{
			channel: "tickers",
			instId,
		},
		{
			channel: "funding-rate",
			instId,
		},
		{
			channel: "books5",
			instId,
		},
	]),
});

/** Type guard for OKX ticker channel messages. */
export const isOkxTickerMessage = (
	message: unknown,
): message is OkxTickerMessage =>
	isRecord(message) &&
	isRecord(message.arg) &&
	message.arg.channel === "tickers" &&
	Array.isArray(message.data);

/** Type guard for OKX funding-rate channel messages. */
export const isOkxFundingRateMessage = (
	message: unknown,
): message is OkxFundingRateMessage =>
	isRecord(message) &&
	isRecord(message.arg) &&
	message.arg.channel === "funding-rate" &&
	Array.isArray(message.data);

/** Type guard for OKX books5 channel messages. */
export const isOkxBookMessage = (
	message: unknown,
): message is OkxBookMessage =>
	isRecord(message) &&
	isRecord(message.arg) &&
	message.arg.channel === "books5" &&
	Array.isArray(message.data);

/** Maps an OKX ticker payload into price, BBO, and volume snapshot fields. */
export const mapOkxTickerToMarketSnapshot = (
	ticker: OkxTickerMessage["data"][number],
): MarketSnapshot => {
	const askPrice = normalizeOptionalNumber(ticker.askPx);
	const askSize = normalizeOptionalNumber(ticker.askSz);
	const bidPrice = normalizeOptionalNumber(ticker.bidPx);
	const bidSize = normalizeOptionalNumber(ticker.bidSz);
	const markPrice = normalizeOptionalNumber(ticker.last);
	const timestamp = normalizeOptionalTimestamp(normalizeOptionalNumber(ticker.ts));
	const volume24h = normalizeOptionalNumber(ticker.volCcy24h);

	return {
		exchange: "okx",
		symbol: normalizeOkxSwapSymbol(ticker.instId),
		sourceSymbol: ticker.instId,
		...(bidPrice !== undefined ? { bidPrice } : {}),
		...(askPrice !== undefined ? { askPrice } : {}),
		...(bidSize !== undefined ? { bidSize } : {}),
		...(askSize !== undefined ? { askSize } : {}),
		...(markPrice !== undefined ? { markPrice } : {}),
		...(bidPrice !== undefined && askPrice !== undefined
			? { midPrice: (bidPrice + askPrice) / 2 }
			: {}),
		...(volume24h !== undefined ? { volume24h } : {}),
		...(timestamp !== undefined ? { timestamp } : {}),
	};
};

/** Maps an OKX funding payload into normalized hourly funding snapshot fields. */
export const mapOkxFundingRateToMarketSnapshot = (
	fundingRateData: OkxFundingRateMessage["data"][number],
): MarketSnapshot => {
	const fundingRate = normalizeOptionalNumber(fundingRateData.fundingRate);
	const fundingIntervalHours = getOkxFundingIntervalHours(fundingRateData);
	const hourlyFundingRate = normalizeFundingRateToHourly(
		fundingRate,
		fundingIntervalHours,
	);
	const timestamp = normalizeOptionalTimestamp(
		normalizeOptionalNumber(fundingRateData.ts),
	);

	return {
		exchange: "okx",
		symbol: normalizeOkxSwapSymbol(fundingRateData.instId),
		sourceSymbol: fundingRateData.instId,
		...(hourlyFundingRate !== undefined
			? { fundingRate: hourlyFundingRate }
			: {}),
		...(hourlyFundingRate !== undefined ? { fundingIntervalHours } : {}),
		...(hourlyFundingRate !== undefined
			? { fundingApr: annualizeFundingRate(fundingRate, fundingIntervalHours) }
			: {}),
		...(timestamp !== undefined ? { timestamp } : {}),
	};
};

/** Maps an OKX books5 payload into top-of-book and depth snapshot fields. */
export const mapOkxBookToMarketSnapshot = (
	book: OkxBookMessage["data"][number],
): MarketSnapshot => {
	const bidLevels = book.bids.map(mapOkxBookLevel).filter(isDefined);
	const askLevels = book.asks.map(mapOkxBookLevel).filter(isDefined);
	const bestBid = bidLevels[0];
	const bestAsk = askLevels[0];
	const timestamp = normalizeOptionalTimestamp(normalizeOptionalNumber(book.ts));

	return {
		exchange: "okx",
		symbol: normalizeOkxSwapSymbol(book.instId),
		sourceSymbol: book.instId,
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

const getOkxFundingIntervalHours = (
	fundingRateData: OkxFundingRateMessage["data"][number],
): number => {
	const fundingTime = normalizeOptionalNumber(fundingRateData.fundingTime);
	const nextFundingTime = normalizeOptionalNumber(fundingRateData.nextFundingTime);

	if (
		fundingTime === undefined ||
		nextFundingTime === undefined ||
		nextFundingTime <= fundingTime
	) {
		return FUNDING_INTERVAL_HOURS.OKX_FALLBACK;
	}

	return (nextFundingTime - fundingTime) / 60 / 60 / 1000;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null;

const mapOkxBookLevel = (
	level: string[],
): { price: number; size: number } | undefined => {
	const price = normalizeOptionalNumber(level[0]);
	const size = normalizeOptionalNumber(level[1]);

	return price === undefined || size === undefined
		? undefined
		: { price, size };
};

const isDefined = <Value>(value: Value | undefined): value is Value =>
	value !== undefined;
