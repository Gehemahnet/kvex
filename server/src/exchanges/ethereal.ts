import type { BBOUpdate, ConnectionStatus, OrderBookUpdate } from "../types";
import { createStatsLogger, createCallbackManager } from "../utils";

const REST_URL = "https://api.ethereal.trade/v1";
const MIN_VOLUME_24H = 500_000; // $500k minimum daily volume

// Funding rate update type
export interface FundingRateUpdate {
	exchange: "ethereal";
	symbol: string;
	fundingRate: number;
	nextFundingTime: number;
	markPrice: number;
	indexPrice: number;
	timestamp: number;
}

// Trade update type
export interface TradeUpdate {
	exchange: "ethereal";
	symbol: string;
	price: number;
	size: number;
	side: "buy" | "sell";
	timestamp: number;
}

interface ProductResponse {
	id: string;
	baseTokenName: string;
	engineType: number;
	volume24h: string;
	fundingRate?: string;
	markPrice?: string;
	indexPrice?: string;
	nextFundingAt?: number;
}

interface Product {
	id: string;
	baseTokenName: string;
	engineType: number;
}

interface MarketPrice {
	productId: string;
	bestBidPrice: string;
	bestAskPrice: string;
	markPrice?: string;
	indexPrice?: string;
	fundingRate?: string;
}

interface State {
	status: ConnectionStatus;
	products: Product[];
	bboCache: Map<string, BBOUpdate>;
	fundingCache: Map<string, FundingRateUpdate>;
	pollInterval: ReturnType<typeof setInterval> | null;
	fundingPollInterval: ReturnType<typeof setInterval> | null;
}

const state: State = {
	status: "disconnected",
	products: [],
	bboCache: new Map(),
	fundingCache: new Map(),
	pollInterval: null,
	fundingPollInterval: null,
};

const bboCallbacks = createCallbackManager<BBOUpdate>();
const orderBookCallbacks = createCallbackManager<OrderBookUpdate>();
const fundingCallbacks = createCallbackManager<FundingRateUpdate>();
const tradeCallbacks = createCallbackManager<TradeUpdate>();
const statusCallbacks = createCallbackManager<ConnectionStatus>();
const stats = createStatsLogger(
	"ethereal",
	() => `${state.bboCache.size} symbols cached, status: ${state.status}`
);

const setStatus = (status: ConnectionStatus) => {
	state.status = status;
	statusCallbacks.emit(status);
};

const pollPrices = async () => {
	if (state.products.length === 0) {
		await fetchProducts();
		if (state.products.length === 0) return;
	}

	try {
		stats.increment();
		const receivedAt = Date.now();
		const ids = state.products.map((p) => p.id).join(",");
		const res = await fetch(`${REST_URL}/product/market-price?productIds=${ids}`);
		const json = (await res.json()) as { data: MarketPrice[] };

		if (state.status !== "connected") {
			setStatus("connected");
		}

		const timestamp = Date.now();

		for (const price of json.data) {
			const product = state.products.find((p) => p.id === price.productId);
			if (!product) continue;

			const update: BBOUpdate = {
				exchange: "ethereal",
				symbol: product.baseTokenName,
				bid: price.bestBidPrice,
				bidSize: "0",
				ask: price.bestAskPrice,
				askSize: "0",
				timestamp,
			};

			state.bboCache.set(update.symbol, update);
			bboCallbacks.emit(update);

			// Emit order book (BBO only for Ethereal REST API)
			const orderBookUpdate: OrderBookUpdate = {
				exchange: "ethereal",
				symbol: product.baseTokenName,
				bids: [{ price: price.bestBidPrice, size: "0" }],
				asks: [{ price: price.bestAskPrice, size: "0" }],
				timestamp,
				receivedAt,
			};
			orderBookCallbacks.emit(orderBookUpdate);

			// Emit funding if available in price response
			if (price.fundingRate !== undefined) {
				const fundingUpdate: FundingRateUpdate = {
					exchange: "ethereal",
					symbol: product.baseTokenName,
					fundingRate: parseFloat(price.fundingRate || "0"),
					nextFundingTime: 0,
					markPrice: parseFloat(price.markPrice || "0"),
					indexPrice: parseFloat(price.indexPrice || "0"),
					timestamp,
				};
				state.fundingCache.set(product.baseTokenName, fundingUpdate);
				fundingCallbacks.emit(fundingUpdate);
			}
		}
	} catch (e) {
		console.error("[ethereal] Poll error:", e);
		if (state.status === "connected") {
			setStatus("error");
		}
	}
};

// Poll funding rates from REST API
const pollFundingRates = async () => {
	try {
		const res = await fetch(`${REST_URL}/product`);
		const json = (await res.json()) as { data: ProductResponse[] };
		const timestamp = Date.now();

		for (const product of json.data) {
			const symbol = product.baseTokenName;
			if (!state.products.some((p) => p.baseTokenName === symbol)) continue;

			if (product.fundingRate !== undefined) {
				const fundingUpdate: FundingRateUpdate = {
					exchange: "ethereal",
					symbol,
					fundingRate: parseFloat(product.fundingRate || "0"),
					nextFundingTime: product.nextFundingAt || 0,
					markPrice: parseFloat(product.markPrice || "0"),
					indexPrice: parseFloat(product.indexPrice || "0"),
					timestamp,
				};
				state.fundingCache.set(symbol, fundingUpdate);
				fundingCallbacks.emit(fundingUpdate);
			}
		}
	} catch {
		// Funding endpoint may not exist, silently fail
	}
};

const stopFundingPoll = () => {
	if (state.fundingPollInterval) {
		clearInterval(state.fundingPollInterval);
		state.fundingPollInterval = null;
	}
};

const startFundingPoll = () => {
	stopFundingPoll();
	pollFundingRates(); // Initial poll
	state.fundingPollInterval = setInterval(pollFundingRates, 10000); // Every 10s
};

export const fetchProducts = async () => {
	try {
		const res = await fetch(`${REST_URL}/product`);
		const json = (await res.json()) as { data: ProductResponse[] };
		const allProducts = json.data.filter((p) => p.engineType === 0);
		state.products = allProducts
			.filter((p) => parseFloat(p.volume24h) >= MIN_VOLUME_24H)
			.map((p) => ({ id: p.id, baseTokenName: p.baseTokenName, engineType: p.engineType }));
		console.log(`[ethereal] Fetched ${state.products.length}/${allProducts.length} products (>=$${MIN_VOLUME_24H / 1000}k vol)`);
	} catch (e) {
		console.error("[ethereal] Failed to fetch products:", e);
	}
};

export const connect = () => {
	if (state.status === "connected") return;

	console.log("[ethereal] Connecting (REST polling)...");
	stats.reset();
	setStatus("connecting");
	pollPrices();
	state.pollInterval = setInterval(pollPrices, 1000);
	startFundingPoll();
	stats.start();
};

export const disconnect = () => {
	stats.stop();
	stopFundingPoll();
	if (state.pollInterval) {
		clearInterval(state.pollInterval);
		state.pollInterval = null;
	}
	console.log("[ethereal] Disconnected");
	setStatus("disconnected");
};

export const onBBO = (cb: (update: BBOUpdate) => void) => bboCallbacks.add(cb);
export const onOrderBook = (cb: (update: OrderBookUpdate) => void) => orderBookCallbacks.add(cb);
export const onFunding = (cb: (update: FundingRateUpdate) => void) => fundingCallbacks.add(cb);
export const onTrade = (cb: (update: TradeUpdate) => void) => tradeCallbacks.add(cb);

export const onStatus = (cb: (status: ConnectionStatus) => void) => {
	const unsub = statusCallbacks.add(cb);
	cb(state.status);
	return unsub;
};

export const getStatus = () => state.status;
export const getAllBBO = () => Array.from(state.bboCache.values());
export const getAllFunding = () => Array.from(state.fundingCache.values());
export const getFunding = (symbol: string) => state.fundingCache.get(symbol);
