import { describe, expect, it } from "vitest";
import { parseAssetPricesQuery } from "../../src/server/http/portfolio/asset-prices-query";

describe("parseAssetPricesQuery", () => {
	it("normalizes and de-duplicates symbols", () => {
		expect(
			parseAssetPricesQuery("/portfolio/prices?symbols=eth,SOL,eth"),
		).toEqual({
			symbols: ["ETH", "SOL"],
		});
	});

	it("rejects missing symbols", () => {
		expect(() => parseAssetPricesQuery("/portfolio/prices")).toThrow(
			"Query param `symbols` is required",
		);
	});

	it("rejects invalid symbols", () => {
		expect(() => parseAssetPricesQuery("/portfolio/prices?symbols=ETH/USD")).toThrow(
			"Query param `symbols` must contain comma-separated asset symbols",
		);
	});
});
