import { FetchHttpClient } from "../../common/http-client";
import { DexRestClient } from "../../common/rest-client";
import type { BBOUpdate, OrderBookUpdate } from "../../types";
import { FundingRateUpdate } from "../paradex/paradex";
import {
	EtherealFundingRange,
	GetFundingQueryParams,
	GetFundingResponse,
	GetProductResponse,
	GetProductsQueryParams,
	MarketPrice,
} from "./ethereal.types";

class EtherealDexClient extends DexRestClient {
	endpoints = {
		product: "product",
		fundingRate: "funding",
	};

	async getProducts(query: GetProductsQueryParams) {
		return this.fetchData<GetProductResponse, GetProductsQueryParams>(
			this.endpoints.product,
			{ query },
		);
	}

	async getFundingHistory(query: GetFundingQueryParams) {
		return this.fetchData<GetFundingResponse, GetFundingQueryParams>(
			this.endpoints.fundingRate,
			{
				query,
			},
		);
	}
}

export const etherealRestClient = new EtherealDexClient({
	baseUrl: "https://api.ethereal.trade/v1",
	httpClient: new FetchHttpClient(),
});

// const pollPrices = async () => {
// 	if (state.products.length === 0) {
// 		await fetchProducts();
// 		if (state.products.length === 0) return;
// 	}
//
// 	try {
// 		const ids = state.products.map((p) => p.id).join(",");
// 		const res = await fetch(
// 			`${REST_URL}/product/market-price?productIds=${ids}`,
// 		);
// 		const json = (await res.json()) as { data: MarketPrice[] };
//
// 		const timestamp = Date.now();
//
// 		for (const price of json.data) {
// 			const product = state.products.find((p) => p.id === price.productId);
// 			if (!product) continue;
//
// 			const update: BBOUpdate = {
// 				exchange: "ethereal",
// 				symbol: product.baseTokenName,
// 				bid: price.bestBidPrice,
// 				bidSize: "0",
// 				ask: price.bestAskPrice,
// 				askSize: "0",
// 				timestamp,
// 			};
//
// 			state.bboCache.set(update.symbol, update);
// 			bboCallbacks.emit(update);
//
// 			// Emit order book (BBO only for Ethereal REST API)
// 			const orderBookUpdate: OrderBookUpdate = {
// 				exchange: "ethereal",
// 				symbol: product.baseTokenName,
// 				bids: [{ price: parseFloat(price.bestBidPrice), size: 0 }],
// 				asks: [{ price: parseFloat(price.bestAskPrice), size: 0 }],
// 				timestamp,
// 				receivedAt,
// 			};
// 			orderBookCallbacks.emit(orderBookUpdate);
// 		}
// 	} catch (e) {}
// };
//
// // Poll funding rates from REST API
// const pollFundingRates = async () => {
// 	try {
// 		// FIXED: Ethereal returns funding rates in the /product endpoint directly
// 		const res = await fetch(`${REST_URL}/product`);
// 		const json = (await res.json()) as PageOfProductDtos;
// 		const timestamp = Date.now();
//
// 		let count = 0;
// 		for (const product of json.data) {
// 			// Only care about perps
// 			if (product.engineType !== 0) continue;
//
// 			const symbol = product.baseTokenName;
// 			const fundingRate = parseFloat(product.fundingRate1h || "0");
//
// 			// Ethereal doesn't easily expose mark price in /product, so we use 0 or fetch it from prices.
// 			// For now, funding rate is the priority.
// 			const fundingUpdate: FundingRateUpdate = {
// 				exchange: "ethereal",
// 				symbol,
// 				fundingRate: fundingRate,
// 				nextFundingTime: 0,
// 				markPrice: 0,
// 				indexPrice: 0,
// 				timestamp,
// 			};
// 			state.fundingCache.set(symbol, fundingUpdate);
// 			fundingCallbacks.emit(fundingUpdate);
// 			count++;
// 		}
// 		// console.log(`[ethereal] Fetched funding for ${count} products`);
// 	} catch (e) {
// 		console.error("[ethereal] Error fetching funding:", e);
// 	}
// };
//
// export const stopFundingPoll = () => {
// 	if (state.fundingPollInterval) {
// 		clearInterval(state.fundingPollInterval);
// 		state.fundingPollInterval = null;
// 	}
// };
//
// export const startFundingPoll = () => {
// 	stopFundingPoll();
// 	pollFundingRates(); // Initial poll
// 	state.fundingPollInterval = setInterval(pollFundingRates, 10000); // Every 10s
// };
//
// export const fetchProducts = async () => {
// 	try {
// 		const res = await fetch(`${REST_URL}/product`);
// 		const json = (await res.json()) as PageOfProductDtos;
// 		state.products = json.data.filter((p) => p.engineType === 0);
// 		console.log(`[ethereal] Fetched ${state.products.length} products`);
// 	} catch (e) {
// 		console.error("[ethereal] Failed to fetch products:", e);
// 	}
// };
//
// export const connect = () => {
// 	pollPrices();
// 	state.pollInterval = setInterval(pollPrices, 1000);
// 	startFundingPoll();
// 	stats.start();
// };
//
// export const disconnect = () => {
// 	stats.stop();
// 	stopFundingPoll();
// 	if (state.pollInterval) {
// 		clearInterval(state.pollInterval);
// 		state.pollInterval = null;
// 	}
// 	console.log("[ethereal] Disconnected");
// 	setStatus("disconnected");
// };
