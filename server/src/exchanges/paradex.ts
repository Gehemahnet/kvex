import WebSocket from "ws";
import type { BBOUpdate, ConnectionStatus, OrderBookUpdate } from "../types";
import { createStatsLogger, createCallbackManager, createReconnectManager } from "../utils";

const WS_URL = "wss://ws.api.prod.paradex.trade/v1";
const REST_URL = "https://api.prod.paradex.trade/v1";

// Funding rate update type
export interface FundingRateUpdate {
	exchange: "paradex";
	symbol: string;
	fundingRate: number;
	nextFundingTime: number;
	markPrice: number;
	indexPrice: number;
	timestamp: number;
}

// Trade update type
export interface TradeUpdate {
	exchange: "paradex";
	symbol: string;
	price: number;
	size: number;
	side: "buy" | "sell";
	timestamp: number;
}

interface MarketSummary {
	symbol: string;
	volume_24h: string;
	funding_rate?: string;
	mark_price?: string;
	index_price?: string;
	next_funding_at?: number;
}

interface State {
	ws: WebSocket | null;
	status: ConnectionStatus;
	markets: string[];
	marketInfo: Map<string, MarketSummary>;
	bboCache: Map<string, BBOUpdate>;
	orderbookCache: Map<string, OrderBookUpdate>;
	fundingCache: Map<string, FundingRateUpdate>;
	messageId: number;
	pingInterval: ReturnType<typeof setInterval> | null;
	fundingPollInterval: ReturnType<typeof setInterval> | null;
	lastMessageTime: number;
}

const state: State = {
	ws: null,
	status: "disconnected",
	markets: [],
	marketInfo: new Map(),
	bboCache: new Map(),
	orderbookCache: new Map(),
	fundingCache: new Map(),
	messageId: 1,
	pingInterval: null,
	fundingPollInterval: null,
	lastMessageTime: 0,
};

const bboCallbacks = createCallbackManager<BBOUpdate>();
const orderBookCallbacks = createCallbackManager<OrderBookUpdate>();
const fundingCallbacks = createCallbackManager<FundingRateUpdate>();
const tradeCallbacks = createCallbackManager<TradeUpdate>();
const statusCallbacks = createCallbackManager<ConnectionStatus>();
const reconnect = createReconnectManager("paradex");
const stats = createStatsLogger(
	"paradex",
	() => `${state.bboCache.size} symbols cached, status: ${state.status}`
);

const setStatus = (status: ConnectionStatus) => {
	state.status = status;
	statusCallbacks.emit(status);
};

const subscribeToMarkets = () => {
	if (!state.ws || state.ws.readyState !== WebSocket.OPEN) return;

	for (const market of state.markets) {
		// Subscribe to BBO
		state.ws.send(JSON.stringify({
			jsonrpc: "2.0",
			id: state.messageId++,
			method: "subscribe",
			params: { channel: `bbo.${market}` },
		}));

		// Subscribe to orderbook (top 10 levels)
		state.ws.send(JSON.stringify({
			jsonrpc: "2.0",
			id: state.messageId++,
			method: "subscribe",
			params: { channel: `order_book.${market}` },
		}));

		// Subscribe to trades
		state.ws.send(JSON.stringify({
			jsonrpc: "2.0",
			id: state.messageId++,
			method: "subscribe",
			params: { channel: `trades.${market}` },
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
			console.warn("[paradex] No messages for 30s, reconnecting...");
			state.ws?.close();
			return;
		}

		if (state.ws?.readyState === WebSocket.OPEN) {
			state.ws.send(JSON.stringify({
				jsonrpc: "2.0",
				id: state.messageId++,
				method: "heartbeat",
			}));
		}
	}, 15000);
};

const handleMessage = (data: string) => {
	const receivedAt = Date.now();
	state.lastMessageTime = receivedAt;
	stats.increment();
	try {
		const msg = JSON.parse(data);
		const channel = msg.params?.channel;
		const d = msg.params?.data;

		if (!channel || !d) return;

		// Handle BBO updates
		if (channel.startsWith("bbo.")) {
			const update: BBOUpdate = {
				exchange: "paradex",
				symbol: d.market,
				bid: d.bid,
				bidSize: d.bid_size,
				ask: d.ask,
				askSize: d.ask_size,
				timestamp: d.last_updated_at,
			};
			state.bboCache.set(update.symbol, update);
			bboCallbacks.emit(update);
		}

		// Handle orderbook updates
		if (channel.startsWith("order_book.")) {
			const bids = (d.bids || []).map((b: [string, string]) => ({
				price: b[0],
				size: b[1],
			}));
			const asks = (d.asks || []).map((a: [string, string]) => ({
				price: a[0],
				size: a[1],
			}));

			const orderBookUpdate: OrderBookUpdate = {
				exchange: "paradex",
				symbol: d.market,
				bids,
				asks,
				timestamp: d.last_updated_at || receivedAt,
				receivedAt,
			};
			state.orderbookCache.set(d.market, orderBookUpdate);
			orderBookCallbacks.emit(orderBookUpdate);
		}

		// Handle trade updates
		if (channel.startsWith("trades.")) {
			const trades = Array.isArray(d) ? d : [d];
			for (const trade of trades) {
				const tradeUpdate: TradeUpdate = {
					exchange: "paradex",
					symbol: trade.market,
					price: parseFloat(trade.price),
					size: parseFloat(trade.size),
					side: trade.side?.toLowerCase() as "buy" | "sell",
					timestamp: trade.created_at || receivedAt,
				};
				tradeCallbacks.emit(tradeUpdate);
			}
		}
	} catch {}
};

const MIN_VOLUME_24H = 500_000; // $500k minimum daily volume

// Poll funding rates from REST API (not available via WS)
const pollFundingRates = async () => {
	try {
		const res = await fetch(`${REST_URL}/markets/summary?market=ALL`);
		const data = await res.json() as { results: MarketSummary[] };
		const timestamp = Date.now();

		for (const market of data.results) {
			if (!state.markets.includes(market.symbol)) continue;

			state.marketInfo.set(market.symbol, market);

			if (market.funding_rate !== undefined) {
				const fundingUpdate: FundingRateUpdate = {
					exchange: "paradex",
					symbol: market.symbol,
					fundingRate: parseFloat(market.funding_rate || "0"),
					nextFundingTime: market.next_funding_at || 0,
					markPrice: parseFloat(market.mark_price || "0"),
					indexPrice: parseFloat(market.index_price || "0"),
					timestamp,
				};
				state.fundingCache.set(market.symbol, fundingUpdate);
				fundingCallbacks.emit(fundingUpdate);
			}
		}
	} catch (e) {
		console.error("[paradex] Failed to poll funding rates:", e);
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

export const fetchMarkets = async () => {
	try {
		const res = await fetch(`${REST_URL}/markets/summary?market=ALL`);
		const data = await res.json() as { results: MarketSummary[] };
		const allMarkets = data.results.filter((m) => m.symbol.endsWith("-USD-PERP"));

		// Store market info
		for (const market of allMarkets) {
			state.marketInfo.set(market.symbol, market);
		}

		state.markets = allMarkets
			.filter((m) => parseFloat(m.volume_24h) >= MIN_VOLUME_24H)
			.map((m) => m.symbol);
		console.log(`[paradex] Fetched ${state.markets.length}/${allMarkets.length} markets (>=$${MIN_VOLUME_24H / 1000}k vol)`);
	} catch (e) {
		console.error("[paradex] Failed to fetch markets:", e);
	}
};

export const connect = () => {
	if (state.ws?.readyState === WebSocket.OPEN) return;

	setStatus("connecting");
	state.ws = new WebSocket(WS_URL);

	state.ws.on("open", () => {
		console.log(`[paradex] Connected, subscribing to ${state.markets.length} markets (BBO + orderbook + trades)`);
		reconnect.reset();
		state.lastMessageTime = Date.now();
		stats.reset();
		setStatus("connected");
		subscribeToMarkets();
		startPing();
		startFundingPoll();
		stats.start();
	});

	state.ws.on("message", (data) => handleMessage(data.toString()));

	state.ws.on("error", (e) => {
		console.error("[paradex] Error:", e);
		setStatus("error");
	});

	state.ws.on("close", () => {
		console.log("[paradex] Disconnected");
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
