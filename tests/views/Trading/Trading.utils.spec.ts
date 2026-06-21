import { describe, expect, it } from "vitest";
import {
	formatTradingQuoteValue,
	getFlexibleLeverageTooltip,
	getTradingExchangeLabel,
	getTradingPnlClass,
	hasFlexibleLeverage,
} from "../../../src/views/Trading/Trading.utils";

describe("Trading utils", () => {
	it("formats position value with its settlement asset", () => {
		expect(formatTradingQuoteValue("1234.567", "USDT")).toBe("1,234.57 USDT");
		expect(formatTradingQuoteValue(undefined, "USDC")).toBe("-");
	});

	it("uses product exchange names instead of account labels", () => {
		expect(getTradingExchangeLabel("ethereal")).toBe("Ethereal");
		expect(getTradingExchangeLabel("hyperliquid")).toBe("Hyperliquid");
		expect(getTradingExchangeLabel("okx")).toBe("OKX");
	});

	it("does not paint a missing PnL as a loss", () => {
		expect(getTradingPnlClass(undefined)).toContain("muted");
		expect(getTradingPnlClass("0")).toContain("muted");
		expect(getTradingPnlClass("12.5")).toBe("text-emerald-500");
		expect(getTradingPnlClass("-0.5")).toBe("text-red-500");
	});

	it("marks only Nado cross-margin positions without fixed leverage as flexible", () => {
		expect(hasFlexibleLeverage({ exchange: "nado", marginMode: "cross" })).toBe(true);
		expect(hasFlexibleLeverage({ exchange: "nado", marginMode: "isolated" })).toBe(false);
		expect(hasFlexibleLeverage({ exchange: "okx", marginMode: "cross" })).toBe(false);
		expect(hasFlexibleLeverage({ exchange: "nado", marginMode: "cross", leverage: 5 })).toBe(false);
		expect(getFlexibleLeverageTooltip("nado")).toContain("exchange documentation");
	});

});
