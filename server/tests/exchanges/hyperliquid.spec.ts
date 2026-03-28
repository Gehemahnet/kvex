import { describe, expect, it } from "vitest";
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
});
