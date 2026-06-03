import { describe, expect, it } from "vitest";
import { ServiceError } from "../../src/common/errors/service-errors";
import { normalizeHyperliquidError } from "../../src/exchanges/hyperliquid/hyperliquid.error-handler";
import { hyperliquidRestClient } from "../../src/exchanges/hyperliquid/hyperliquid";

describe("Hyperliquid API check", () => {
	it("Fetch short markets info and get BTC ", async () => {
		const markets = await hyperliquidRestClient.getMarketsMetadata();
		const btcMarket = markets.universe.find(
			(marketMetaUniverse) => marketMetaUniverse.name === "BTC",
		);

		expect(btcMarket.name).toBe("BTC");
	});

	it("Fetch full markets info and get BTC ", async () => {
		const markets = await hyperliquidRestClient.getFullMarketsMetadata();
		const btcMarket = markets.universe.find(
			(marketMetaUniverse) => marketMetaUniverse.name === "BTC",
		);

		expect(btcMarket.name).toBe("BTC");
	});

	it("Fetch day funding data for BTC ", async () => {
		const fundingData = await hyperliquidRestClient.getHistoricalFunding(
			"DAY",
			"BTC",
		);

		expect(fundingData.length).toBe(24);
	});

	it("Fetch week funding data for BTC ", async () => {
		const fundingData = await hyperliquidRestClient.getHistoricalFunding(
			"WEEK",
			"BTC",
		);

		expect(fundingData.length).toBe(168);
	});

	it("Fetch month funding data for BTC ", async () => {
		const fundingData = await hyperliquidRestClient.getHistoricalFunding(
			"MONTH",
			"BTC",
		);

		expect(fundingData.length).toBe(720);
	});

	it("maps TypeError to NETWORK_ERROR", () => {
		const error = normalizeHyperliquidError(new TypeError("fetch failed"));

		expect(error).toBeInstanceOf(ServiceError);
		expect(error.service).toBe("hyperliquid");
		expect(error.code).toBe("NETWORK_ERROR");
		expect(error.message).toBe("fetch failed");
	});

	it("passes through ServiceError", () => {
		const original = new ServiceError({
			service: "hyperliquid",
			code: "CUSTOM_ERROR",
			message: "custom",
		});

		expect(normalizeHyperliquidError(original)).toBe(original);
	});
});
