import WebSocket from "ws";
import type { BBOUpdate, ConnectionStatus, OrderBookUpdate } from "../types";
import { createStatsLogger, createCallbackManager, createReconnectManager } from "../utils";

const WS_URL = "wss://ws.pacifica.fi/ws";
const REST_URL = "https://api.pacifica.fi/api/v1";

// Funding rate update type
export interface FundingRateUpdate {
	exchange: "pacifica";
	symbol: string;
	fundingRate: number;
	nextFundingTime: number;
	markPrice: number;
	indexPrice: number;
	timestamp: number;
}

// Trade update type
export interface TradeUpdate {
	exchange: "pacifica";
	symbol: string;
	price: number;
	size: number;
	side: "buy" | "sell";
	timestamp: number;
}

interface MarketInfo {
	symbol: string;
	fundingRate?: string;
	markPrice?: string;
	indexPrice?: string;
	nextFundingAt?: number;
}

interface State {
	ws: WebSocket | null;
	status: ConnectionStatus;
	symbols: string[];
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
	symbols: [],
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
const reconnect = createReconnectManager("pacifica");
const stats = createStatsLogger(
	"pacifica",
	() => `${state.bboCache.size} symbols cached, status: ${state.status}`
);

const setStatus = (status: ConnectionStatus) => {
	state.status = status;
	statusCallbacks.emit(status);
};

const subscribeToSymbols = () => {
	if (!state.ws || state.ws.readyState !== WebSocket.OPEN) return;

	for (const symbol of state.symbols) {
		// Subscribe to BBO
		state.ws.send(JSON.stringify({
			method: "subscribe",
			params: { source: "bbo", symbol },
		}));

		// Subscribe to orderbook
		state.ws.send(JSON.stringify({
			method: "subscribe",
			params: { source: "orderbook", symbol },
		}));

		// Subscribe to trades
		state.ws.send(JSON.stringify({
			method: "subscribe",
			params: { source: "trades", symbol },
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
		if (state.lastMessageTime > 0 && now - state.lastMessageTime > 60000) {
			console.warn("[pacifica] No messages for 60s, reconnecting...");
			state.ws?.close();
			return;
		}

		if (state.ws?.readyState === WebSocket.OPEN) {
			state.ws.send(JSON.stringify({ method: "ping" }));
		}
	}, 30000);
};

const handleMessage = (data: string) => {
	const receivedAt = Date.now();
	state.lastMessageTime = receivedAt;
	stats.increment();
	try {
		const msg = JSON.parse(data);
		const channel = msg.channel;
		const d = msg.data;

		if (!channel || !d) return;

		// Handle BBO updates
		if (channel === "bbo") {
			const update: BBOUpdate = {
				exchange: "pacifica",
				symbol: d.s,
				bid: d.b,
				bidSize: d.B,
				ask: d.a,
				askSize: d.A,
				timestamp: d.t,
			};
			state.bboCache.set(update.symbol, update);
			bboCallbacks.emit(update);
		}

		// Handle orderbook updates
		if (channel === "orderbook") {
			const bids = (d.bids || []).map((b: [string, string]) => ({
				price: b[0],
				size: b[1],
			}));
			const asks = (d.asks || []).map((a: [string, string]) => ({
				price: a[0],
				size: a[1],
			}));

			const orderBookUpdate: OrderBookUpdate = {
				exchange: "pacifica",
				symbol: d.s || d.symbol,
				bids,
				asks,
				timestamp: d.t || receivedAt,
				receivedAt,
			};
			state.orderbookCache.set(orderBookUpdate.symbol, orderBookUpdate);
			orderBookCallbacks.emit(orderBookUpdate);
		}

		// Handle trade updates
		if (channel === "trades") {
			const trades = Array.isArray(d) ? d : [d];
			for (const trade of trades) {
				const tradeUpdate: TradeUpdate = {
					exchange: "pacifica",
					symbol: trade.s || trade.symbol,
					price: parseFloat(trade.p || trade.price),
					size: parseFloat(trade.q || trade.size),
					side: (trade.m || trade.side === "buy") ? "sell" : "buy",
					timestamp: trade.t || trade.timestamp || receivedAt,
				};
				tradeCallbacks.emit(tradeUpdate);
			}
		}
	} catch {}
};

// Poll funding rates from REST API
const pollFundingRates = async () => {
	try {
		const res = await fetch(`${REST_URL}/funding`);
		const json = (await res.json()) as { data: MarketInfo[] };
		const timestamp = Date.now();

		for (const market of json.data) {
			if (!state.symbols.includes(market.symbol.toUpperCase())) continue;

			const fundingUpdate: FundingRateUpdate = {
				exchange: "pacifica",
				symbol: market.symbol.toUpperCase(),
				fundingRate: parseFloat(market.fundingRate || "0"),
				nextFundingTime: market.nextFundingAt || 0,
				markPrice: parseFloat(market.markPrice || "0"),
				indexPrice: parseFloat(market.indexPrice || "0"),
				timestamp,
			};
			state.fundingCache.set(fundingUpdate.symbol, fundingUpdate);
			fundingCallbacks.emit(fundingUpdate);
		}
	} catch (e) {
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

export const fetchSymbols = async () => {
	try {
		const res = await fetch(`${REST_URL}/info`);
		const json = (await res.json()) as { data: Array<{ symbol: string }> };
		state.symbols = json.data.map((m) => m.symbol.toUpperCase());
		console.log(`[pacifica] Fetched ${state.symbols.length} symbols`);
	} catch (e) {
		console.error("[pacifica] Failed to fetch symbols:", e);
	}
};

export const connect = () => {
	if (state.ws?.readyState === WebSocket.OPEN) return;

	setStatus("connecting");
	state.ws = new WebSocket(WS_URL);

	state.ws.on("open", () => {
		console.log(`[pacifica] Connected, subscribing to ${state.symbols.length} symbols (BBO + orderbook + trades)`);
		reconnect.reset();
		state.lastMessageTime = Date.now();
		stats.reset();
		setStatus("connected");
		subscribeToSymbols();
		startPing();
		startFundingPoll();
		stats.start();
	});

	state.ws.on("message", (data) => handleMessage(data.toString()));

	state.ws.on("error", (e) => {
		console.error("[pacifica] Error:", e);
		setStatus("error");
	});

	state.ws.on("close", () => {
		console.log("[pacifica] Disconnected");
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
