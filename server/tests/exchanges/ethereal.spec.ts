import { describe, expect, it } from "vitest";
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
});
