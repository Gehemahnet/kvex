import { describe, expect, it } from "vitest";
import type { SpreadOpportunity } from "./SpreadsOverview.types";
import {
	filterSpreadOpportunities,
	formatAverageSpread,
	formatFundingImpact,
	formatSpreadMarketIdentity,
	formatSpreadPercent,
	getSpreadsSelectionStatus,
	hasFeeAdjustedSpread,
	shouldWarnAboutFeeAdjustedSpread,
} from "./SpreadsOverview.utils";

describe("SpreadsOverview utils", () => {
	it("formats spread and funding impact percentages", () => {
		expect(formatSpreadPercent(0.012346)).toBe("1.235%");
		expect(formatFundingImpact(0.00012345)).toBe("0.0123%");
		expect(formatFundingImpact(0)).toBe("-");
		expect(formatSpreadPercent(undefined)).toBe("-");
	});

	it("uses net stability average before raw spread average", () => {
		expect(
			formatAverageSpread({
				averagePriceSpreadPercent: 0.02,
				averageEstimatedNetSpreadPercent: 0.015,
			}),
		).toBe("1.500%");
		expect(
			formatAverageSpread({
				averagePriceSpreadPercent: 0.02,
			}),
		).toBe("2.000%");
	});

	it("filters opportunities by symbol, stale state, confidence, and fee availability", () => {
		const opportunities = [
			createOpportunity({
				symbol: "BTC",
				confidence: 0.95,
				feeAdjustedPriceSpreadPercent: 0.01,
			}),
			createOpportunity({
				symbol: "ETH",
				confidence: 0.6,
				feeAdjustedPriceSpreadPercent: 0.02,
			}),
			createOpportunity({
				symbol: "BTC-STale",
				confidence: 0.99,
				isStale: true,
				feeAdjustedPriceSpreadPercent: 0.03,
			}),
			createOpportunity({
				symbol: "BTC-NOFEE",
				confidence: 0.99,
			}),
		];

		expect(
			filterSpreadOpportunities(opportunities, "btc", {
				hideStale: true,
				minConfidence: 0.9,
				onlyFeeAdjusted: true,
			}).map((opportunity) => opportunity.symbol),
		).toEqual(["BTC"]);
	});

	it("detects documented fee warnings only for fee-adjusted spreads", () => {
		expect(
			shouldWarnAboutFeeAdjustedSpread(
				createOpportunity({
					feeAdjustedPriceSpreadPercent: 0.01,
					longFeeSource: "documentation",
				}),
			),
		).toBe(true);
		expect(
			shouldWarnAboutFeeAdjustedSpread(
				createOpportunity({
					longFeeSource: "documentation",
				}),
			),
		).toBe(false);
		expect(
			hasFeeAdjustedSpread(
				createOpportunity({
					feeAdjustedPriceSpreadPercent: 0.01,
				}),
			),
		).toBe(true);
	});

	it("formats market identity without repeating source symbols", () => {
		expect(
			formatSpreadMarketIdentity({
				exchange: "okx",
				symbol: "BTC-USDT-SWAP",
				price: 100,
				priceSource: "mark",
				quoteAsset: "USDT",
				settlementAsset: "USDT",
			}),
		).toBe(" · USDT");
		expect(
			formatSpreadMarketIdentity({
				exchange: "okx",
				symbol: "BTC-USDT-SWAP",
				price: 100,
				priceSource: "mark",
				quoteAsset: "USD",
				settlementAsset: "USDT",
			}),
		).toBe(" · USD/USDT");
	});

	it("explains spread data-source selection state", () => {
		expect(getSpreadsSelectionStatus(0)).toBe(
			"Select data sources to compare spreads.",
		);
		expect(getSpreadsSelectionStatus(1)).toBe(
			"Select at least two data sources to compare spreads.",
		);
		expect(getSpreadsSelectionStatus(2)).toBe("");
	});
});

const createOpportunity = (
	options: {
		confidence?: number;
		feeAdjustedPriceSpreadPercent?: number;
		isStale?: boolean;
		longFeeSource?: "api" | "documentation";
		shortFeeSource?: "api" | "documentation";
		symbol?: string;
	} = {},
): SpreadOpportunity => ({
	symbol: options.symbol ?? "BTC",
	long: {
		exchange: "hyperliquid",
		symbol: "BTC",
		price: 100,
		priceSource: "mark",
		feeSource: options.longFeeSource ?? "api",
	},
	short: {
		exchange: "okx",
		symbol: "BTC-USDT-SWAP",
		price: 101,
		priceSource: "mark",
		feeSource: options.shortFeeSource ?? "api",
	},
	priceSpread: 1,
	priceSpreadPercent: 0.01,
	confidence: options.confidence ?? 1,
	confidenceBreakdown: {},
	isStale: options.isStale ?? false,
	...(options.feeAdjustedPriceSpreadPercent !== undefined
		? { feeAdjustedPriceSpreadPercent: options.feeAdjustedPriceSpreadPercent }
		: {}),
});
