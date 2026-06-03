import { describe, expect, it } from "vitest";
import { normalizeEtherealError } from "../../src/exchanges/ethereal/ethereal.error-handler";
import { etherealRestClient } from "../../src/exchanges/ethereal/ethereal";

describe("Ethereal API check", () => {
	it("Fetch markets info and get BTC ", async () => {
		const markets = await etherealRestClient.getMarkets();
		const btcMarket = markets.data.find((product) =>
			product.ticker.startsWith("BTC"),
		);
		expect(btcMarket).toBeDefined();
	});

	it("Fetch markets and then funding for BTC", async () => {
		const markets = await etherealRestClient.getMarkets();

		const btcMarket = markets.data.find((product) =>
			product.ticker.startsWith("BTC"),
		);

		const fundingData = await etherealRestClient.getFundingHistory({
			productId: btcMarket.id,
			range: "DAY",
		});

		expect(fundingData).toBeDefined();
	});

	it("maps unsupported timeframe to UNSUPPORTED_TIMEFRAME", () => {
		const error = normalizeEtherealError(
			new Error("Timeframe YEAR is not supported on ethereal"),
		);

		expect(error.service).toBe("ethereal");
		expect(error.code).toBe("UNSUPPORTED_TIMEFRAME");
	});

	it("maps not found message to SYMBOL_NOT_FOUND", () => {
		const error = normalizeEtherealError(
			new Error("Symbol BTC was not found on ethereal"),
		);

		expect(error.service).toBe("ethereal");
		expect(error.code).toBe("SYMBOL_NOT_FOUND");
	});
});
