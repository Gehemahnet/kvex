import { describe, expect, it } from "vitest";
import {
	applyNadoBookDepthUpdate,
	createNadoBookDepthResyncMonitor,
	createNadoSymbolMap,
	isNadoBestBidOfferEvent,
	isNadoBookDepthEvent,
	isNadoFundingRateEvent,
	mapNadoBestBidOfferToMarketSnapshot,
	mapNadoMarketLiquidityToMarketSnapshot,
	mapNadoFundingRateToMarketSnapshot,
} from "../../src/exchanges/nado/nado.ws.utils";
import type { NadoSymbol } from "../../src/exchanges/nado/nado.types";

describe("nado ws utils", () => {
	const symbols: NadoSymbol[] = [
		{
			type: "perp",
			product_id: 1,
			symbol: "BTC-USDC",
			maker_fee_rate_x18: "0",
			taker_fee_rate_x18: "0",
			trading_status: "live",
		},
		{
			type: "spot",
			product_id: 2,
			symbol: "ETH-USDC",
			maker_fee_rate_x18: "0",
			taker_fee_rate_x18: "0",
			trading_status: "live",
		},
	];

	it("creates a normalized perp symbol map", () => {
		expect(createNadoSymbolMap(symbols)).toEqual(new Map([[1, "BTC"]]));
	});

	it("detects bbo and funding events", () => {
		expect(
			isNadoBestBidOfferEvent({
				type: "best_bid_offer",
				product_id: 1,
			}),
		).toBe(true);
		expect(
			isNadoFundingRateEvent({
				type: "funding_rate",
				product_id: 1,
			}),
		).toBe(true);
		expect(
			isNadoBookDepthEvent({
				type: "book_depth",
				product_id: 1,
				bids: [],
				asks: [],
			}),
		).toBe(true);
	});

	it("maps best bid offer data into a market snapshot", () => {
		expect(
			mapNadoBestBidOfferToMarketSnapshot(
				{
					type: "best_bid_offer",
					product_id: 1,
					bid_price: "100000000000000000000",
					bid_qty: "2000000000000000000",
					ask_price: "102000000000000000000",
					ask_qty: "3000000000000000000",
					timestamp: "1000000000",
				},
				createNadoSymbolMap(symbols),
			),
		).toEqual({
			exchange: "nado",
			symbol: "BTC",
			sourceSymbol: "BTC",
			bidPrice: 100,
			bidSize: 2,
			askPrice: 102,
			askSize: 3,
			midPrice: 101,
			timestamp: 1_000_000_000_000,
		});
	});

	it("maps funding rate data into a market snapshot", () => {
		expect(
			mapNadoFundingRateToMarketSnapshot(
				{
					type: "funding_rate",
					product_id: 1,
					funding_rate_x18: "24000000000000000",
					timestamp: "1000000000000000000",
				},
				createNadoSymbolMap(symbols),
			),
		).toEqual({
			exchange: "nado",
			symbol: "BTC",
			sourceSymbol: "BTC",
			fundingRate: 0.001,
			fundingIntervalHours: 24,
			fundingApr: 8.76,
			timestamp: 1_000_000_000_000,
		});
	});

	it("maps market liquidity into a market snapshot", () => {
		expect(
			mapNadoMarketLiquidityToMarketSnapshot(
				{
					product_id: 1,
					bids: [
						["100000000000000000000", "2000000000000000000"],
						["99000000000000000000", "4000000000000000000"],
					],
					asks: [
						["101000000000000000000", "3000000000000000000"],
						["102000000000000000000", "5000000000000000000"],
					],
					timestamp: "1000000000000000000",
				},
				createNadoSymbolMap(symbols),
			),
		).toEqual({
			exchange: "nado",
			symbol: "BTC",
			sourceSymbol: "BTC",
			bidPrice: 100,
			bidSize: 2,
			askPrice: 101,
			askSize: 3,
			midPrice: 100.5,
			orderBookBids: [
				{ price: 100, size: 2 },
				{ price: 99, size: 4 },
			],
			orderBookAsks: [
				{ price: 101, size: 3 },
				{ price: 102, size: 5 },
			],
			timestamp: 1_000_000_000_000,
		});
	});

	it("applies incremental book depth updates", () => {
		expect(
			applyNadoBookDepthUpdate(
				{
					bids: [
						{ price: 100, size: 2 },
						{ price: 99, size: 4 },
					],
					asks: [
						{ price: 101, size: 3 },
						{ price: 102, size: 5 },
					],
				},
				{
					type: "book_depth",
					product_id: 1,
					bids: [
						["100000000000000000000", "1000000000000000000"],
						["98000000000000000000", "6000000000000000000"],
					],
					asks: [
						["101000000000000000000", "0"],
						["103000000000000000000", "7000000000000000000"],
					],
				},
			),
		).toEqual({
			bids: [
				{ price: 100, size: 1 },
				{ price: 99, size: 4 },
				{ price: 98, size: 6 },
			],
			asks: [
				{ price: 102, size: 5 },
				{ price: 103, size: 7 },
			],
		});
	});

	it("throttles book depth resync summaries while keeping counters", () => {
		let now = 1_000;
		const monitor = createNadoBookDepthResyncMonitor({
			logIntervalMs: 60_000,
			now: () => now,
		});

		expect(
			monitor.recordGap({
				productId: 1,
				symbol: "BTC",
				expectedLastMaxTimestamp: "10",
				actualLastMaxTimestamp: "9",
				maxTimestamp: "11",
			}),
		).toEqual({
			productId: 1,
			symbol: "BTC",
			totalGapCount: 1,
			productGapCount: 1,
			expectedLastMaxTimestamp: "10",
			actualLastMaxTimestamp: "9",
			maxTimestamp: "11",
		});

		now += 1_000;

		expect(
			monitor.recordGap({
				productId: 1,
				symbol: "BTC",
			}),
		).toBeUndefined();

		now += 60_000;

		expect(
			monitor.recordGap({
				productId: 2,
				symbol: "ETH",
			}),
		).toMatchObject({
			productId: 2,
			symbol: "ETH",
			totalGapCount: 3,
			productGapCount: 1,
		});
	});
});
