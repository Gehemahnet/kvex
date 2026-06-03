import { describe, expect, it } from "vitest";
import { normalizePacificaError } from "../../src/exchanges/pacifica/pacifica.error-handler";
import { pacificaRestClient } from "../../src/exchanges/pacifica/pacifica";

describe("Pacifica API check", () => {
	it("Fetch markets info and get BTC ", async () => {
		const markets = await pacificaRestClient.getMarkets();
		const btcMarket = markets.find((market) => market.symbol === "BTC");

		expect(btcMarket.symbol).toBe("BTC");
	});

	it("Fetch price info and get BTC ", async () => {
		const prices = await pacificaRestClient.getPrices();
		const btcMarket = prices.find((market) => market.symbol === "BTC");

		expect(btcMarket.symbol).toBe("BTC");
	});

	it("Fetch daily funding history for btc", async () => {
		const markets = await pacificaRestClient.getMarkets();
		const btcMarket = markets.find((market) => market.symbol === "BTC");

		const fundingHistory = await pacificaRestClient.getFundingRateHistory(
			"DAY",
			{ symbol: btcMarket.symbol },
		);

		expect(fundingHistory.length).toBe(24);
	});

	it("Fetch weekly funding history for btc", async () => {
		const markets = await pacificaRestClient.getMarkets();
		const btcMarket = markets.find((market) => market.symbol === "BTC");

		const fundingHistory = await pacificaRestClient.getFundingRateHistory(
			"WEEK",
			{ symbol: btcMarket.symbol },
		);

		expect(fundingHistory.length).toBe(168);
	});

	it("Fetch monthly funding history for btc", async () => {
		const markets = await pacificaRestClient.getMarkets();
		const btcMarket = markets.find((market) => market.symbol === "BTC");

		const fundingHistory = await pacificaRestClient.getFundingRateHistory(
			"MONTH",
			{ symbol: btcMarket.symbol },
		);

		expect(fundingHistory.length).toBe(720);
	});

	// FIRST DATA IS 2025-06-02
	// it("Fetch yearly funding history for btc", async () => {
	// 	const markets = await pacificaRestClient.getMarkets();
	// 	const btcMarket = markets.find((market) => market.symbol === "BTC");
	//
	// 	const fundingHistory = await pacificaRestClient.getFundingRateHistory(
	// 		"YEAR",
	// 		{ symbol: btcMarket.symbol },
	// 	);
	//
	// 	// expect(fundingHistory.length).toBe(8640);
	// });

	it("maps not found message to SYMBOL_NOT_FOUND", () => {
		const error = normalizePacificaError(
			new Error("Symbol BTC was not found on pacifica"),
		);

		expect(error.service).toBe("pacifica");
		expect(error.code).toBe("SYMBOL_NOT_FOUND");
	});

	it("maps TypeError to NETWORK_ERROR", () => {
		const error = normalizePacificaError(new TypeError("fetch failed"));

		expect(error.service).toBe("pacifica");
		expect(error.code).toBe("NETWORK_ERROR");
	});
});
