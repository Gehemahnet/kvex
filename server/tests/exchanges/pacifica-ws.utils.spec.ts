import { describe, expect, it } from "vitest";
import {
	createPacificaBookSubscriptionMessage,
	createPacificaDepthSymbols,
	createPacificaPingMessage,
	createPacificaPricesSubscriptionMessage,
	isPacificaBookMessage,
	isPacificaPricesMessage,
	mapPacificaBookToMarketSnapshot,
	mapPacificaPriceToMarketSnapshot,
} from "../../src/exchanges/pacifica/pacifica.ws.utils";

describe("pacifica ws utils", () => {
	it("creates prices subscription payload", () => {
		expect(createPacificaPricesSubscriptionMessage()).toEqual({
			method: "subscribe",
			params: {
				source: "prices",
			},
		});
	});

	it("creates orderbook subscription payload", () => {
		expect(createPacificaBookSubscriptionMessage("BTC")).toEqual({
			method: "subscribe",
			params: {
				source: "book",
				symbol: "BTC",
				agg_level: 1,
			},
		});
	});

	it("creates ping payload", () => {
		expect(createPacificaPingMessage()).toEqual({
			method: "ping",
		});
	});

	it("detects prices messages", () => {
		expect(
			isPacificaPricesMessage({
				channel: "prices",
				data: [],
			}),
		).toBe(true);
		expect(isPacificaPricesMessage({ channel: "pong" })).toBe(false);
	});

	it("detects orderbook messages", () => {
		expect(
			isPacificaBookMessage({
				channel: "book",
				data: {
					s: "BTC",
					l: [[], []],
				},
			}),
		).toBe(true);
		expect(isPacificaBookMessage({ channel: "book", data: [] })).toBe(false);
	});

	it("maps price data into a market snapshot", () => {
		expect(
			mapPacificaPriceToMarketSnapshot({
				symbol: "BTC",
				funding: "0.001",
				mark: "101",
				mid: "100.5",
				oracle: "100",
				open_interest: "10",
				volume_24h: "20",
				timestamp: 1_000,
			}),
		).toEqual({
			exchange: "pacifica",
			symbol: "BTC",
			sourceSymbol: "BTC",
			fundingRate: 0.001,
			fundingIntervalHours: 1,
			fundingApr: 8.76,
			markPrice: 101,
			indexPrice: 100,
			midPrice: 100.5,
			openInterest: 10,
			volume24h: 20,
			timestamp: 1_000_000,
		});
	});

	it("maps orderbook data into a market snapshot", () => {
		expect(
			mapPacificaBookToMarketSnapshot({
				s: "BTC",
				l: [
					[
						{ p: "100", a: "2", n: 1 },
						{ p: "99", a: "3", n: 1 },
					],
					[
						{ p: "101", a: "1.5", n: 1 },
						{ p: "102", a: "4", n: 1 },
					],
				],
				t: 1_000,
			}),
		).toEqual({
			exchange: "pacifica",
			symbol: "BTC",
			sourceSymbol: "BTC",
			bidPrice: 100,
			bidSize: 2,
			askPrice: 101,
			askSize: 1.5,
			midPrice: 100.5,
			orderBookBids: [
				{ price: 100, size: 2 },
				{ price: 99, size: 3 },
			],
			orderBookAsks: [
				{ price: 101, size: 1.5 },
				{ price: 102, size: 4 },
			],
			timestamp: 1_000_000,
		});
	});

	it("creates a unique list of depth symbols", () => {
		expect(
			createPacificaDepthSymbols([
				{ symbol: "BTC" },
				{ symbol: "ETH" },
				{ symbol: "BTC" },
			]),
		).toEqual(["BTC", "ETH"]);
	});
});
