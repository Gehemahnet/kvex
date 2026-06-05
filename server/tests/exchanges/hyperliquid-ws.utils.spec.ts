import { describe, expect, it, vi } from "vitest";
import {
	createHyperliquidActiveAssetCtxSubscriptionMessage,
	createHyperliquidAllMidsSubscriptionMessage,
	createHyperliquidBboSubscriptionMessage,
	createHyperliquidL2BookSubscriptionMessage,
	createHyperliquidPingMessage,
	isHyperliquidActiveAssetCtxMessage,
	isHyperliquidAllMidsMessage,
	isHyperliquidBboMessage,
	isHyperliquidL2BookMessage,
	mapHyperliquidActiveAssetCtxToMarketSnapshot,
	mapHyperliquidAllMidsToMarketSnapshots,
	mapHyperliquidBboToMarketSnapshot,
	mapHyperliquidL2BookToMarketSnapshot,
} from "../../src/exchanges/hyperliquid/hyperliquid.ws.utils";

describe("hyperliquid ws utils", () => {
	it("creates all mids subscription payload", () => {
		expect(createHyperliquidAllMidsSubscriptionMessage()).toEqual({
			method: "subscribe",
			subscription: {
				type: "allMids",
			},
		});
	});

	it("creates bbo subscription payload", () => {
		expect(createHyperliquidBboSubscriptionMessage("BTC")).toEqual({
			method: "subscribe",
			subscription: {
				type: "bbo",
				coin: "BTC",
			},
		});
	});

	it("creates l2 book subscription payload", () => {
		expect(createHyperliquidL2BookSubscriptionMessage("BTC")).toEqual({
			method: "subscribe",
			subscription: {
				type: "l2Book",
				coin: "BTC",
			},
		});
	});

	it("creates active asset context subscription payload", () => {
		expect(createHyperliquidActiveAssetCtxSubscriptionMessage("BTC")).toEqual({
			method: "subscribe",
			subscription: {
				type: "activeAssetCtx",
				coin: "BTC",
			},
		});
	});

	it("creates ping payload", () => {
		expect(createHyperliquidPingMessage()).toEqual({
			method: "ping",
		});
	});

	it("detects all mids messages", () => {
		expect(
			isHyperliquidAllMidsMessage({
				channel: "allMids",
				data: {
					mids: {
						BTC: "100",
					},
				},
			}),
		).toBe(true);
		expect(isHyperliquidAllMidsMessage({ channel: "pong" })).toBe(false);
	});

	it("detects bbo messages", () => {
		expect(
			isHyperliquidBboMessage({
				channel: "bbo",
				data: {
					coin: "BTC",
					time: 1_000,
					bbo: [
						{ px: "100", sz: "1", n: 1 },
						{ px: "102", sz: "2", n: 1 },
					],
				},
			}),
		).toBe(true);
		expect(isHyperliquidBboMessage({ channel: "allMids" })).toBe(false);
	});

	it("detects active asset context messages", () => {
		expect(
			isHyperliquidActiveAssetCtxMessage({
				channel: "activeAssetCtx",
				data: {
					coin: "BTC",
					ctx: {},
				},
			}),
		).toBe(true);
		expect(isHyperliquidActiveAssetCtxMessage({ channel: "bbo" })).toBe(false);
	});

	it("detects l2 book messages", () => {
		expect(
			isHyperliquidL2BookMessage({
				channel: "l2Book",
				data: {
					coin: "BTC",
					time: 1_000,
					levels: [
						[{ px: "100", sz: "1", n: 1 }],
						[{ px: "102", sz: "2", n: 1 }],
					],
				},
			}),
		).toBe(true);
		expect(isHyperliquidL2BookMessage({ channel: "bbo" })).toBe(false);
	});

	it("maps all mids data into market snapshots", () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-06-04T00:00:00.000Z"));

		expect(
			mapHyperliquidAllMidsToMarketSnapshots({
				BTC: "100",
				ETH: "50",
				BAD: "nope",
			}),
		).toEqual([
			{
				exchange: "hyperliquid",
				symbol: "BTC",
				sourceSymbol: "BTC",
				midPrice: 100,
				timestamp: 1_780_531_200_000,
			},
			{
				exchange: "hyperliquid",
				symbol: "ETH",
				sourceSymbol: "ETH",
				midPrice: 50,
				timestamp: 1_780_531_200_000,
			},
		]);

		vi.useRealTimers();
	});

	it("maps bbo data into a market snapshot", () => {
		expect(
			mapHyperliquidBboToMarketSnapshot({
				coin: "BTC",
				time: 1_000,
				bbo: [
					{ px: "100", sz: "1", n: 1 },
					{ px: "102", sz: "2", n: 1 },
				],
			}),
		).toEqual({
			exchange: "hyperliquid",
			symbol: "BTC",
			sourceSymbol: "BTC",
			bidPrice: 100,
			askPrice: 102,
			bidSize: 1,
			askSize: 2,
			midPrice: 101,
			timestamp: 1_000,
		});
	});

	it("maps l2 book data into a market snapshot", () => {
		expect(
			mapHyperliquidL2BookToMarketSnapshot({
				coin: "BTC",
				time: 1_000,
				levels: [
					[
						{ px: "100", sz: "1", n: 1 },
						{ px: "99", sz: "2", n: 1 },
					],
					[
						{ px: "102", sz: "3", n: 1 },
						{ px: "103", sz: "4", n: 1 },
					],
				],
			}),
		).toEqual({
			exchange: "hyperliquid",
			symbol: "BTC",
			sourceSymbol: "BTC",
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
			timestamp: 1_000,
		});
	});

	it("maps active asset context into a market snapshot", () => {
		expect(
			mapHyperliquidActiveAssetCtxToMarketSnapshot(
				{
					coin: "BTC",
					ctx: {
						dayNtlVlm: "20",
						funding: "0.001",
						markPx: "101",
						midPx: "100.5",
						openInterest: "10",
						oraclePx: "100",
					},
				},
				1_000,
			),
		).toEqual({
			exchange: "hyperliquid",
			symbol: "BTC",
			sourceSymbol: "BTC",
			fundingRate: 0.001,
			fundingIntervalHours: 1,
			fundingApr: 8.76,
			indexPrice: 100,
			markPrice: 101,
			midPrice: 100.5,
			openInterest: 10,
			volume24h: 20,
			timestamp: 1_000,
		});
	});
});
