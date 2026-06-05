import { describe, expect, it } from "vitest";
import { mapOkxTickerToFundingOverviewCell, normalizeOkxSwapSymbol } from "../../src/exchanges/okx/okx.utils";
import {
	createOkxMarketDataSubscriptionMessage,
	isOkxFundingRateMessage,
	isOkxTickerMessage,
	mapOkxFundingRateToMarketSnapshot,
	isOkxBookMessage,
	mapOkxBookToMarketSnapshot,
	mapOkxTickerToMarketSnapshot,
} from "../../src/exchanges/okx/okx.ws.utils";

describe("okx ws utils", () => {
	it("normalizes swap symbols", () => {
		expect(normalizeOkxSwapSymbol("BTC-USDT-SWAP")).toBe("BTC");
	});

	it("creates market data subscription payload", () => {
		expect(createOkxMarketDataSubscriptionMessage(["BTC-USDT-SWAP"])).toEqual({
			op: "subscribe",
			args: [
				{
					channel: "tickers",
					instId: "BTC-USDT-SWAP",
				},
				{
					channel: "funding-rate",
					instId: "BTC-USDT-SWAP",
				},
				{
					channel: "books5",
					instId: "BTC-USDT-SWAP",
				},
			],
		});
	});

	it("detects ticker and funding messages", () => {
		expect(
			isOkxTickerMessage({
				arg: {
					channel: "tickers",
					instId: "BTC-USDT-SWAP",
				},
				data: [],
			}),
		).toBe(true);
		expect(
			isOkxFundingRateMessage({
				arg: {
					channel: "funding-rate",
					instId: "BTC-USDT-SWAP",
				},
				data: [],
			}),
		).toBe(true);
		expect(
			isOkxBookMessage({
				arg: {
					channel: "books5",
					instId: "BTC-USDT-SWAP",
				},
				data: [],
			}),
		).toBe(true);
	});

	it("maps ticker data into a market snapshot", () => {
		expect(
			mapOkxTickerToMarketSnapshot({
				instId: "BTC-USDT-SWAP",
				last: "101",
				bidPx: "100",
				bidSz: "3",
				askPx: "102",
				askSz: "2",
				volCcy24h: "20",
				ts: "1000000000000",
			}),
		).toEqual({
			exchange: "okx",
			symbol: "BTC",
			sourceSymbol: "BTC-USDT-SWAP",
			bidPrice: 100,
			askPrice: 102,
			bidSize: 3,
			askSize: 2,
			markPrice: 101,
			midPrice: 101,
			volume24h: 20,
			timestamp: 1_000_000_000_000,
		});
	});

	it("maps funding data into a market snapshot", () => {
		expect(
			mapOkxFundingRateToMarketSnapshot({
				instId: "BTC-USDT-SWAP",
				fundingRate: "0.008",
				fundingTime: "1000000000000",
				nextFundingTime: "1000028800000",
				ts: "1000000000000",
			}),
		).toEqual({
			exchange: "okx",
			symbol: "BTC",
			sourceSymbol: "BTC-USDT-SWAP",
			fundingRate: 0.001,
			fundingIntervalHours: 8,
			fundingApr: 8.76,
			timestamp: 1_000_000_000_000,
		});
	});

	it("maps book data into a market snapshot", () => {
		expect(
			mapOkxBookToMarketSnapshot({
				instId: "BTC-USDT-SWAP",
				bids: [
					["100", "1", "0", "1"],
					["99", "2", "0", "1"],
				],
				asks: [
					["102", "3", "0", "1"],
					["103", "4", "0", "1"],
				],
				ts: "1000000000000",
			}),
		).toEqual({
			exchange: "okx",
			symbol: "BTC",
			sourceSymbol: "BTC-USDT-SWAP",
			bidPrice: 100,
			bidSize: 1,
			askPrice: 102,
			askSize: 3,
			midPrice: 101,
			orderBookBids: [
				{ price: 100, size: 1 },
				{ price: 99, size: 2 },
			],
			orderBookAsks: [
				{ price: 102, size: 3 },
				{ price: 103, size: 4 },
			],
			timestamp: 1_000_000_000_000,
		});
	});

	it("uses OKX funding interval when it is not the default eight hours", () => {
		expect(
			mapOkxFundingRateToMarketSnapshot({
				instId: "BTC-USDT-SWAP",
				fundingRate: "0.006",
				fundingTime: "1000000000000",
				nextFundingTime: "1000014400000",
			}),
		).toEqual({
			exchange: "okx",
			symbol: "BTC",
			sourceSymbol: "BTC-USDT-SWAP",
			fundingRate: 0.0015,
			fundingIntervalHours: 4,
			fundingApr: 13.14,
		});
	});

	it("maps REST ticker data into a funding overview cell", () => {
		expect(
			mapOkxTickerToFundingOverviewCell({
				instId: "BTC-USDT-SWAP",
				last: "101",
				bidPx: "100",
				bidSz: "3",
				askPx: "102",
				askSz: "2",
				volCcy24h: "20",
				ts: "1000000000000",
			}),
		).toEqual({
			exchange: "okx",
			sourceSymbol: "BTC-USDT-SWAP",
			bidPrice: 100,
			askPrice: 102,
			bidSize: 3,
			askSize: 2,
			markPrice: 101,
			midPrice: 101,
			volume24h: 20,
			timestamp: 1_000_000_000_000,
		});
	});
});
