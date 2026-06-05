import { describe, expect, it } from "vitest";
import {
	createEtherealL2BookSubscriptionMessage,
	createEtherealTickerSubscriptionMessage,
	isEtherealL2BookMessage,
	isEtherealTickerMessage,
	mapEtherealL2BookToMarketSnapshot,
	mapEtherealTickerToMarketSnapshot,
} from "../../src/exchanges/ethereal/ethereal.ws.utils";

describe("ethereal ws utils", () => {
	it("creates ticker subscription payload", () => {
		expect(createEtherealTickerSubscriptionMessage("BTCUSD")).toEqual({
			event: "subscribe",
			data: {
				type: "Ticker",
				symbol: "BTCUSD",
			},
		});
	});

	it("creates l2 book subscription payload", () => {
		expect(createEtherealL2BookSubscriptionMessage("BTCUSD")).toEqual({
			event: "subscribe",
			data: {
				type: "L2Book",
				symbol: "BTCUSD",
			},
		});
	});

	it("detects ticker messages", () => {
		expect(
			isEtherealTickerMessage({
				e: "Ticker",
				t: 1,
				data: {
					s: "BTCUSD",
				},
			}),
		).toBe(true);
		expect(isEtherealTickerMessage({ e: "TradeFill", data: {} })).toBe(false);
	});

	it("detects l2 book messages", () => {
		expect(
			isEtherealL2BookMessage({
				e: "L2Book",
				t: 1_000,
				data: {
					s: "BTCUSD",
					a: [["102", "2"]],
					b: [["100", "1"]],
				},
			}),
		).toBe(true);
		expect(isEtherealL2BookMessage({ e: "Ticker" })).toBe(false);
	});

	it("maps ticker data into a market snapshot", () => {
		expect(
			mapEtherealTickerToMarketSnapshot(
				{
					s: "BTCUSD",
					bidPx: "100",
					askPx: "102",
					bidAmt: "3",
					askAmt: "2",
					markPx: "101",
					oi: "10",
					fr1h: "0.001",
					vol24h: "20",
					t: 1_000,
				},
				2_000,
			),
		).toEqual({
			exchange: "ethereal",
			symbol: "BTC",
			sourceSymbol: "BTCUSD",
			fundingRate: 0.001,
			fundingIntervalHours: 1,
			fundingApr: 8.76,
			bidPrice: 100,
			askPrice: 102,
			bidSize: 3,
			askSize: 2,
			markPrice: 101,
			midPrice: 101,
			openInterest: 10,
			volume24h: 20,
			timestamp: 1_000_000,
		});
	});

	it("maps l2 book data into a market snapshot", () => {
		expect(
			mapEtherealL2BookToMarketSnapshot(
				{
					s: "BTCUSD",
					a: [
						["102", "3"],
						["103", "4"],
					],
					b: [
						["100", "1"],
						["99", "2"],
					],
				},
				1_000,
			),
		).toEqual({
			exchange: "ethereal",
			symbol: "BTC",
			sourceSymbol: "BTCUSD",
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
			timestamp: 1_000_000,
		});
	});
});
