import BigNumber from "bignumber.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const nadoSdkMock = vi.hoisted(() => ({
	createNadoClient: vi.fn(),
	createPublicClient: vi.fn(),
	http: vi.fn(),
	sdkClient: {
		market: {
			getFundingRate: vi.fn(),
			getMarketLiquidity: vi.fn(),
			getMultiProductFundingRates: vi.fn(),
			getSymbols: vi.fn(),
		},
		perp: {
			getMultiProductPerpPrices: vi.fn(),
		},
		ws: {
			subscription: {
				buildSubscriptionMessage: vi.fn(),
				buildSubscriptionParams: vi.fn(),
			},
		},
	},
}));

vi.mock("@nadohq/client", () => ({
	CHAIN_ENV_TO_CHAIN: {
		inkMainnet: { id: 57073, name: "Ink" },
	},
	createNadoClient: nadoSdkMock.createNadoClient,
}));

vi.mock("viem", () => ({
	createPublicClient: nadoSdkMock.createPublicClient,
	http: nadoSdkMock.http,
}));

describe("nado sdk client adapter", () => {
	beforeEach(() => {
		nadoSdkMock.createNadoClient.mockReturnValue(nadoSdkMock.sdkClient);
		nadoSdkMock.createPublicClient.mockReturnValue({ transport: "public-client" });
		nadoSdkMock.http.mockReturnValue({ transport: "http" });
		vi.clearAllMocks();
		nadoSdkMock.sdkClient.ws.subscription.buildSubscriptionParams.mockImplementation(
			(stream: string, params: object) => ({
				stream: {
					type: stream,
					...params,
				},
			}),
		);
		nadoSdkMock.sdkClient.ws.subscription.buildSubscriptionMessage.mockImplementation(
			(id: number, method: string, params: object) => ({
				id,
				method,
				...params,
			}),
		);
	});

	it("maps sdk symbols into the existing Nado symbol contract", async () => {
		const { nadoClient } = await import("../../src/exchanges/nado/nado");
		nadoSdkMock.sdkClient.market.getSymbols.mockResolvedValue({
			symbols: {
				BTC: {
					type: 1,
					productId: 1,
					symbol: "BTC-USDC",
					makerFeeRate: new BigNumber("0.0001"),
					takerFeeRate: new BigNumber("0.0004"),
				},
			},
		});

		await expect(nadoClient.getSymbols()).resolves.toEqual([
			{
				type: "perp",
				product_id: 1,
				symbol: "BTC-USDC",
				maker_fee_rate_x18: "100000000000000",
				taker_fee_rate_x18: "400000000000000",
				trading_status: "live",
			},
		]);
	});

	it("maps sdk funding rates into x18 archive-compatible values", async () => {
		const { nadoClient } = await import("../../src/exchanges/nado/nado");
		nadoSdkMock.sdkClient.market.getMultiProductFundingRates.mockResolvedValue({
			1: {
				productId: 1,
				fundingRate: new BigNumber("0.024"),
				updateTime: new BigNumber("1710000000"),
			},
		});

		await expect(nadoClient.getFundingRates([1])).resolves.toEqual({
			"1": {
				product_id: 1,
				funding_rate_x18: "24000000000000000",
				update_time: "1710000000",
			},
		});
	});

	it("maps sdk perp prices and liquidity into x18 gateway-compatible values", async () => {
		const { nadoClient } = await import("../../src/exchanges/nado/nado");
		nadoSdkMock.sdkClient.perp.getMultiProductPerpPrices.mockResolvedValue({
			1: {
				productId: 1,
				indexPrice: new BigNumber("100"),
				markPrice: new BigNumber("101"),
				updateTime: new BigNumber("1710000001"),
			},
		});
		nadoSdkMock.sdkClient.market.getMarketLiquidity.mockResolvedValue({
			bids: [
				{ price: new BigNumber("100"), liquidity: new BigNumber("2") },
			],
			asks: [
				{ price: new BigNumber("101"), liquidity: new BigNumber("3") },
			],
		});

		await expect(nadoClient.getPerpPrices([1])).resolves.toEqual({
			"1": {
				product_id: 1,
				index_price_x18: "100000000000000000000",
				mark_price_x18: "101000000000000000000",
				update_time: "1710000001",
			},
		});
		await expect(nadoClient.getMarketLiquidity(1, 1)).resolves.toMatchObject({
			product_id: 1,
			bids: [["100000000000000000000", "2000000000000000000"]],
			asks: [["101000000000000000000", "3000000000000000000"]],
		});
	});

	it("builds market data subscription payloads with the SDK websocket builder", async () => {
		const { nadoClient } = await import("../../src/exchanges/nado/nado");

		expect(nadoClient.createMarketDataSubscriptionMessages([1])).toEqual([
			{
				method: "subscribe",
				stream: {
					type: "best_bid_offer",
					product_id: 1,
				},
				id: 1,
			},
			{
				method: "subscribe",
				stream: {
					type: "funding_rate",
					product_id: 1,
				},
				id: 2,
			},
			{
				method: "subscribe",
				stream: {
					type: "book_depth",
					product_id: 1,
				},
				id: 3,
			},
		]);
		expect(
			nadoSdkMock.sdkClient.ws.subscription.buildSubscriptionParams,
		).toHaveBeenCalledWith("best_bid_offer", { product_id: 1 });
		expect(
			nadoSdkMock.sdkClient.ws.subscription.buildSubscriptionMessage,
		).toHaveBeenCalledWith(1, "subscribe", {
			stream: {
				type: "best_bid_offer",
				product_id: 1,
			},
		});
	});
});
