import { describe, expect, it } from "vitest";
import type { HttpClient } from "../../src/common/http-client";
import { getAssetPrices } from "#services/portfolio/asset-prices/asset-prices.service";

describe("getAssetPrices", () => {
	it("returns stablecoin prices without upstream calls", async () => {
		const httpClient: HttpClient = {
			async get() {
				throw new Error("Unexpected upstream call");
			},
			async post() {
				throw new Error("Unexpected upstream call");
			},
		};

		await expect(
			getAssetPrices(
				{ symbols: ["usdc"] },
				{
					httpClient,
					now: () => new Date("2026-06-12T00:00:00.000Z"),
				},
			),
		).resolves.toEqual({
			symbols: ["USDC"],
			prices: [
				{
					symbol: "USDC",
					priceUsd: 1,
					source: "stablecoin",
					updatedAt: "2026-06-12T00:00:00.000Z",
				},
			],
			errors: [],
		});
	});

	it("fetches non-stable symbols from a USDT quote provider", async () => {
		const requestedUrls: string[] = [];
		const httpClient: HttpClient = {
			async get<Response>(url: string): Promise<Response> {
				requestedUrls.push(url);

				return {
					symbol: "SOLUSDT",
					price: "150.25",
				} as Response;
			},
			async post() {
				throw new Error("Unexpected upstream call");
			},
		};

		const result = await getAssetPrices(
			{ symbols: ["SOL"] },
			{
				httpClient,
				now: () => new Date("2026-06-12T00:00:00.000Z"),
			},
		);

		expect(result.prices).toEqual([
			{
				symbol: "SOL",
				priceUsd: 150.25,
				source: "binance",
				updatedAt: "2026-06-12T00:00:00.000Z",
			},
		]);
		expect(result.errors).toEqual([]);
		expect(requestedUrls[0]).toContain("symbol=SOLUSDT");
	});

	it("keeps partial price errors for supported symbols", async () => {
		const httpClient: HttpClient = {
			async get() {
				throw new Error("Missing quote");
			},
			async post() {
				throw new Error("Unexpected upstream call");
			},
		};

		const result = await getAssetPrices({ symbols: ["ETH"] }, { httpClient });

		expect(result.prices).toEqual([]);
		expect(result.errors).toEqual([
			{
				symbol: "ETH",
				code: "PRICE_FETCH_FAILED",
				message: "Missing quote",
			},
		]);
	});

	it("skips unsupported symbols before upstream calls", async () => {
		const requestedUrls: string[] = [];
		const httpClient: HttpClient = {
			async get<Response>(url: string): Promise<Response> {
				requestedUrls.push(url);

				return {
					symbol: "ETHUSDT",
					price: "2500",
				} as Response;
			},
			async post() {
				throw new Error("Unexpected upstream call");
			},
		};

		const result = await getAssetPrices(
			{ symbols: ["ETH", "VISITWEBSITE", "RUG"] },
			{
				httpClient,
				now: () => new Date("2026-06-12T00:00:00.000Z"),
			},
		);

		expect(result.symbols).toEqual(["ETH"]);
		expect(result.prices).toEqual([
			{
				symbol: "ETH",
				priceUsd: 2500,
				source: "binance",
				updatedAt: "2026-06-12T00:00:00.000Z",
			},
		]);
		expect(result.errors).toEqual([]);
		expect(requestedUrls).toHaveLength(1);
		expect(requestedUrls[0]).toContain("symbol=ETHUSDT");
	});
});
