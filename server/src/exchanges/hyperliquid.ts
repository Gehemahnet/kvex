import WebSocket from "ws";
import type { BBOUpdate, ConnectionStatus, OrderBookUpdate } from "../types";
import { createStatsLogger, createCallbackManager, createReconnectManager } from "../utils";

const WS_URL = "wss://api.hyperliquid.xyz/ws";
const REST_URL = "https://api.hyperliquid.xyz";

// Funding rate update type
export interface FundingRateUpdate {
	exchange: "hyperliquid";
	symbol: string;
	fundingRate: number;
	nextFundingTime: number;
	markPrice: number;
	indexPrice: number;
	openInterest: number;
	timestamp: number;
}

// Trade update type
export interface TradeUpdate {
	exchange: "hyperliquid";
	symbol: string;
	price: number;
	size: number;
	side: "buy" | "sell";
	timestamp: number;
}

interface AssetCtx {
	dayNtlVlm: string;
	funding: string;
	openInterest: string;
	markPx: string;
	oraclePx: string;
	prevDayPx: string;
}

interface State {
	ws: WebSocket | null;
	status: ConnectionStatus;
	coins: string[];
	coinIndexMap: Map<string, number>; // coin name -> index
	bboCache: Map<string, BBOUpdate>;
	orderbookCache: Map<string, OrderBookUpdate>;
	fundingCache: Map<string, FundingRateUpdate>;
	pingInterval: ReturnType<typeof setInterval> | null;
	fundingPollInterval: ReturnType<typeof setInterval> | null;
	lastMessageTime: number;
}

const state: State = {
	ws: null,
	status: "disconnected",
	coins: [],
	coinIndexMap: new Map(),
	bboCache: new Map(),
	orderbookCache: new Map(),
	fundingCache: new Map(),
	pingInterval: null,
	fundingPollInterval: null,
	lastMessageTime: 0,
};

const bboCallbacks = createCallbackManager<BBOUpdate>();
const orderBookCallbacks = createCallbackManager<OrderBookUpdate>();
const fundingCallbacks = createCallbackManager<FundingRateUpdate>();
const tradeCallbacks = createCallbackManager<TradeUpdate>();
const statusCallbacks = createCallbackManager<ConnectionStatus>();
const reconnect = createReconnectManager("hyperliquid");
const stats = createStatsLogger(
	"hyperliquid",
	() => `${state.bboCache.size} symbols cached, status: ${state.status}`
);

const setStatus = (status: ConnectionStatus) => {
	state.status = status;
	statusCallbacks.emit(status);
};

const subscribeToCoins = () => {
	if (!state.ws || state.ws.readyState !== WebSocket.OPEN) return;

	for (const coin of state.coins) {
		// Subscribe to L2 orderbook
		state.ws.send(JSON.stringify({
			method: "subscribe",
			subscription: { type: "l2Book", coin },
		}));

		// Subscribe to trades
		state.ws.send(JSON.stringify({
			method: "subscribe",
			subscription: { type: "trades", coin },
		}));
	}
};

const stopPing = () => {
	if (state.pingInterval) {
		clearInterval(state.pingInterval);
		state.pingInterval = null;
	}
};

const startPing = () => {
	stopPing();
	state.pingInterval = setInterval(() => {
		const now = Date.now();
		if (state.lastMessageTime > 0 && now - state.lastMessageTime > 30000) {
			console.warn("[hyperliquid] No messages for 30s, reconnecting...");
			state.ws?.close();
			return;
		}

		if (state.ws?.readyState === WebSocket.OPEN) {
			state.ws.send(JSON.stringify({ method: "ping" }));
		}
	}, 15000);
};

const handleMessage = (data: string) => {
	const receivedAt = Date.now();
	state.lastMessageTime = receivedAt;
	stats.increment();
	try {
		const msg = JSON.parse(data);

		// Handle L2 orderbook updates
		if (msg.channel === "l2Book" && msg.data?.levels) {
			const [bids, asks] = msg.data.levels;
			const bestBid = bids?.[0];
			const bestAsk = asks?.[0];

			if (bestBid && bestAsk) {
				const update: BBOUpdate = {
					exchange: "hyperliquid",
					symbol: msg.data.coin,
					bid: bestBid.px,
					bidSize: bestBid.sz,
					ask: bestAsk.px,
					askSize: bestAsk.sz,
					timestamp: msg.data.time,
				};
				state.bboCache.set(update.symbol, update);
				bboCallbacks.emit(update);

				// Emit full order book
				const orderBookUpdate: OrderBookUpdate = {
					exchange: "hyperliquid",
					symbol: msg.data.coin,
					bids: bids.map((b: { px: string; sz: string }) => ({ price: b.px, size: b.sz })),
					asks: asks.map((a: { px: string; sz: string }) => ({ price: a.px, size: a.sz })),
					timestamp: msg.data.time,
					receivedAt,
				};
				state.orderbookCache.set(msg.data.coin, orderBookUpdate);
				orderBookCallbacks.emit(orderBookUpdate);
			}
		}

		// Handle trade updates
		if (msg.channel === "trades" && msg.data) {
			const trades = Array.isArray(msg.data) ? msg.data : [msg.data];
			for (const trade of trades) {
				const tradeUpdate: TradeUpdate = {
					exchange: "hyperliquid",
					symbol: trade.coin,
					price: parseFloat(trade.px),
					size: parseFloat(trade.sz),
					side: trade.side === "B" ? "buy" : "sell",
					timestamp: trade.time || receivedAt,
				};
				tradeCallbacks.emit(tradeUpdate);
			}
		}
	} catch {}
};

const MIN_VOLUME_24H = 500_000; // $500k minimum daily volume

// Poll funding rates from REST API
const pollFundingRates = async () => {
	try {
		const res = await fetch(REST_URL + "/info", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ type: "metaAndAssetCtxs" }),
		});
		const [meta, assetCtxs] = await res.json() as [
			{ universe: Array<{ name: string; isDelisted?: boolean }> },
			AssetCtx[]
		];

		const timestamp = Date.now();

		for (let i = 0; i < meta.universe.length; i++) {
			const coin = meta.universe[i];
			const ctx = assetCtxs[i];
			if (!ctx || !state.coins.includes(coin.name)) continue;

			const fundingUpdate: FundingRateUpdate = {
				exchange: "hyperliquid",
				symbol: coin.name,
				fundingRate: parseFloat(ctx.funding || "0"),
				nextFundingTime: 0, // Hyperliquid has continuous funding
				markPrice: parseFloat(ctx.markPx || "0"),
				indexPrice: parseFloat(ctx.oraclePx || "0"),
				openInterest: parseFloat(ctx.openInterest || "0"),
				timestamp,
			};
			state.fundingCache.set(coin.name, fundingUpdate);
			fundingCallbacks.emit(fundingUpdate);
		}
	} catch (e) {
		console.error("[hyperliquid] Failed to poll funding rates:", e);
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

export const fetchCoins = async () => {
	try {
		const res = await fetch(REST_URL + "/info", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ type: "metaAndAssetCtxs" }),
		});
		const [meta, assetCtxs] = await res.json() as [
			{ universe: Array<{ name: string; isDelisted?: boolean }> },
			AssetCtx[]
		];

		const allCoins = meta.universe;

		// Build coin index map
		state.coinIndexMap.clear();
		for (let i = 0; i < allCoins.length; i++) {
			state.coinIndexMap.set(allCoins[i].name, i);
		}

		state.coins = allCoins
			.map((u, i) => ({ name: u.name, volume: parseFloat(assetCtxs[i]?.dayNtlVlm || "0"), isDelisted: u.isDelisted }))
			.filter((c) => !c.isDelisted && c.volume >= MIN_VOLUME_24H)
			.map((c) => c.name);

		console.log(`[hyperliquid] Fetched ${state.coins.length}/${allCoins.length} coins (>=$${MIN_VOLUME_24H / 1000}k vol)`);
	} catch (e) {
		console.error("[hyperliquid] Failed to fetch coins:", e);
	}
};

export const connect = () => {
	if (state.ws?.readyState === WebSocket.OPEN) return;

	setStatus("connecting");
	state.ws = new WebSocket(WS_URL);

	state.ws.on("open", () => {
		console.log(`[hyperliquid] Connected, subscribing to ${state.coins.length} coins (L2 + trades)`);
		reconnect.reset();
		state.lastMessageTime = Date.now();
		stats.reset();
		setStatus("connected");
		subscribeToCoins();
		startPing();
		startFundingPoll();
		stats.start();
	});

	state.ws.on("message", (data) => handleMessage(data.toString()));

	state.ws.on("error", (e) => {
		console.error("[hyperliquid] Error:", e.message);
		setStatus("error");
	});

	state.ws.on("close", () => {
		console.log("[hyperliquid] Disconnected");
		stopPing();
		stopFundingPoll();
		stats.stop();
		setStatus("disconnected");
		reconnect.attempt(connect);
	});
};

export const disconnect = () => {
	stopPing();
	stopFundingPoll();
	stats.stop();
	reconnect.cancel();
	reconnect.setMaxAttempts();
	state.ws?.close();
	state.ws = null;
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
export const getAllOrderBooks = () => Array.from(state.orderbookCache.values());
export const getAllFunding = () => Array.from(state.fundingCache.values());
export const getFunding = (symbol: string) => state.fundingCache.get(symbol);
