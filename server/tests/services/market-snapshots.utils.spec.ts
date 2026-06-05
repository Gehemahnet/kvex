import { describe, expect, it } from "vitest";
import type { FundingOverviewExchangeCell } from "../../src/services/funding/funding-overview.types";
import type { MarketSnapshot } from "../../src/services/markets/market-snapshots.types";
import {
	filterMarketSnapshotsBySymbol,
	mapFundingCellToMarketSnapshot,
} from "../../src/services/markets/market-snapshots.utils";

describe("market snapshot utils", () => {
	it("maps funding cells into normalized market snapshots", () => {
		const cell: FundingOverviewExchangeCell = {
			exchange: "hyperliquid",
			sourceSymbol: "BTC",
			fundingRate: 0.0001,
			fundingIntervalHours: 1,
			apr: 0.876,
			bidPrice: 99,
			askPrice: 101,
			markPrice: 100,
			indexPrice: 101,
			midPrice: 100.5,
			openInterest: 1_000,
			volume24h: 2_000,
			makerFeeRate: 0.0002,
			takerFeeRate: 0.0005,
			feeSource: "api",
			maxLeverage: 20,
			minOrderSize: 10,
			maxOrderSize: 100_000,
			timestamp: 1_700_000_000_000,
		};

		expect(mapFundingCellToMarketSnapshot(cell)).toEqual({
			exchange: "hyperliquid",
			symbol: "BTC",
			sourceSymbol: "BTC",
			baseAsset: "BTC",
			contractType: "unknown",
			assetClass: "unknown",
			fundingRate: 0.0001,
			fundingApr: 0.876,
			fundingIntervalHours: 1,
			bidPrice: 99,
			askPrice: 101,
			markPrice: 100,
			indexPrice: 101,
			midPrice: 100.5,
			openInterest: 1_000,
			volume24h: 2_000,
			makerFeeRate: 0.0002,
			takerFeeRate: 0.0005,
			feeSource: "api",
			maxLeverage: 20,
			minOrderSize: 10,
			maxOrderSize: 100_000,
			timestamp: 1_700_000_000_000,
		});
	});

	it("extracts market identity from delimited source symbols", () => {
		expect(
			mapFundingCellToMarketSnapshot({
				exchange: "okx",
				sourceSymbol: "BTC-USDT-SWAP",
			}),
		).toEqual({
			exchange: "okx",
			symbol: "BTC",
			sourceSymbol: "BTC-USDT-SWAP",
			baseAsset: "BTC",
			quoteAsset: "USDT",
			settlementAsset: "USDT",
			contractType: "perp",
			assetClass: "unknown",
		});
	});

	it("normalizes known base asset aliases", () => {
		expect(
			mapFundingCellToMarketSnapshot({
				exchange: "okx",
				sourceSymbol: "XBT-USDT-SWAP",
			}),
		).toMatchObject({
			symbol: "BTC",
			baseAsset: "BTC",
			quoteAsset: "USDT",
			settlementAsset: "USDT",
		});
	});

	it("classifies known synthetic markets as non-comparable", () => {
		expect(
			mapFundingCellToMarketSnapshot({
				exchange: "pacifica",
				sourceSymbol: "XAU",
			}),
		).toMatchObject({
			symbol: "XAU",
			baseAsset: "XAU",
			assetClass: "synthetic",
		});
	});

	it("filters snapshots by normalized symbol", () => {
		const snapshots: MarketSnapshot[] = [
			{ exchange: "pacifica", symbol: "BTC", sourceSymbol: "BTC" },
			{ exchange: "pacifica", symbol: "ETH", sourceSymbol: "ETH" },
		];

		expect(filterMarketSnapshotsBySymbol(snapshots, "BTC")).toEqual([
			snapshots[0],
		]);
	});
});
