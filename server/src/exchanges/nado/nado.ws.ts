import WebSocket from "ws";
import { upsertMarketSnapshot } from "#services/markets/market-snapshots/market-snapshot-store";
import { nadoClient } from "./nado";
import {
	NADO_BOOK_DEPTH_RESYNC_LOG_INTERVAL_MS,
	NADO_MARKET_DATA_WS_URL,
	NADO_WS_RECONNECT_DELAY_MS,
} from "./nado.ws.constants";
import {
	applyNadoBookDepthUpdate,
	createNadoBookDepthResyncMonitor,
	createNadoMarketDataSubscriptionMessage,
	createNadoSymbolMap,
	isNadoBestBidOfferEvent,
	isNadoBookDepthEvent,
	isNadoFundingRateEvent,
	mapNadoBestBidOfferToMarketSnapshot,
	mapNadoMarketLiquidityToMarketSnapshot,
	mapNadoFundingRateToMarketSnapshot,
} from "./nado.ws.utils";
import type {
	MarketOrderBookLevel,
	MarketSnapshot,
} from "#services/markets/market-snapshots/market-snapshots.types";
import type { NadoBookDepthEvent } from "./nado.ws.types";

const NADO_ORDER_BOOK_DEPTH = 10;

type NadoOrderBookState = {
	asks: MarketOrderBookLevel[];
	bids: MarketOrderBookLevel[];
	lastMaxTimestamp?: string;
};

class NadoMarketDataStream {
	private reconnect?: NodeJS.Timeout;
	private shouldReconnect = true;
	private socket?: WebSocket;
	private symbolMap = new Map<number, string>();
	private bootstrappingProductIds = new Set<number>();
	private orderBooks = new Map<number, NadoOrderBookState>();
	private pendingBookDepthEvents = new Map<number, NadoBookDepthEvent[]>();
	private resyncMonitor = createNadoBookDepthResyncMonitor({
		logIntervalMs: NADO_BOOK_DEPTH_RESYNC_LOG_INTERVAL_MS,
	});

	constructor(
		private readonly params: {
			getOrderBookDepth: () => number;
			getOrderBookSnapshot: (
				productId: number,
				depth: number,
				symbolMap: Map<number, string>,
			) => Promise<MarketSnapshot | undefined>;
			getSymbols: () => Promise<Map<number, string>>;
			reconnectDelayMs: number;
			url: string;
		},
	) {}

	connect(): void {
		if (
			this.socket &&
			(this.socket.readyState === WebSocket.OPEN ||
				this.socket.readyState === WebSocket.CONNECTING)
		) {
			return;
		}

		this.shouldReconnect = true;
		this.socket = new WebSocket(this.params.url);

		this.socket.on("open", () => {
			void this.subscribe();
		});

		this.socket.on("message", (data) => {
			this.handleMessage(data.toString());
		});

		this.socket.on("close", () => {
			this.cleanupConnection();
			this.scheduleReconnect();
		});

		this.socket.on("error", () => {
			this.socket?.close();
		});
	}

	disconnect(): void {
		this.shouldReconnect = false;
		this.cleanupConnection();
		this.socket?.close();
		this.socket = undefined;
	}

	private async subscribe(): Promise<void> {
		try {
			this.symbolMap = await this.params.getSymbols();
		} catch {
			this.socket?.close();
			return;
		}

		const productIds = [...this.symbolMap.keys()];
		this.orderBooks.clear();
		this.pendingBookDepthEvents.clear();
		this.bootstrappingProductIds = new Set(productIds);

		for (const message of createNadoMarketDataSubscriptionMessage(productIds)) {
			this.send(message);
		}

		void this.bootstrapOrderBooks(productIds);
	}

	private handleMessage(message: string): void {
		const parsedMessage = parseJson(message);

		if (isNadoBookDepthEvent(parsedMessage)) {
			this.handleBookDepthEvent(parsedMessage);
			return;
		}

		const snapshot = this.mapMessageToSnapshot(parsedMessage);

		if (snapshot) {
			upsertMarketSnapshot(snapshot);
		}
	}

	private mapMessageToSnapshot(message: unknown) {
		if (isNadoBestBidOfferEvent(message)) {
			return mapNadoBestBidOfferToMarketSnapshot(message, this.symbolMap);
		}

		if (isNadoFundingRateEvent(message)) {
			return mapNadoFundingRateToMarketSnapshot(message, this.symbolMap);
		}

		return undefined;
	}

	private async bootstrapOrderBooks(productIds: number[]): Promise<void> {
		const depth = this.params.getOrderBookDepth();
		const results = await Promise.allSettled(
			productIds.map(async (productId) => ({
				productId,
				snapshot: await this.params.getOrderBookSnapshot(
					productId,
					depth,
					this.symbolMap,
				),
			})),
		);

		for (const [index, result] of results.entries()) {
			if (result.status !== "fulfilled") {
				this.bootstrappingProductIds.delete(productIds[index]);
				this.pendingBookDepthEvents.delete(productIds[index]);
				continue;
			}

			this.hydrateOrderBook(result.value.productId, result.value.snapshot);
		}
	}

	private hydrateOrderBook(
		productId: number,
		snapshot: MarketSnapshot | undefined,
	): void {
		const initialState = {
			bids: snapshot?.orderBookBids ?? [],
			asks: snapshot?.orderBookAsks ?? [],
		};
		const pendingEvents = this.pendingBookDepthEvents.get(productId) ?? [];
		const snapshotTimestamp = snapshot?.timestamp ?? 0;
		let nextState: NadoOrderBookState = initialState;

		for (const event of pendingEvents) {
			const eventTimestamp = normalizeTimestampValue(event.max_timestamp);

			if (eventTimestamp !== undefined && eventTimestamp <= snapshotTimestamp) {
				continue;
			}

			nextState = {
				...applyNadoBookDepthUpdate(nextState, event),
				lastMaxTimestamp: event.max_timestamp,
			};
		}

		this.orderBooks.set(productId, nextState);
		this.pendingBookDepthEvents.delete(productId);
		this.bootstrappingProductIds.delete(productId);

		if (snapshot || nextState.bids.length || nextState.asks.length) {
			const symbol = this.symbolMap.get(productId);

			if (!symbol) {
				return;
			}

			upsertMarketSnapshot({
				exchange: "nado",
				symbol,
				sourceSymbol: symbol,
				...(nextState.bids[0] !== undefined
					? {
							bidPrice: nextState.bids[0].price,
							bidSize: nextState.bids[0].size,
					  }
					: {}),
				...(nextState.asks[0] !== undefined
					? {
							askPrice: nextState.asks[0].price,
							askSize: nextState.asks[0].size,
					  }
					: {}),
				...(nextState.bids[0] !== undefined && nextState.asks[0] !== undefined
					? {
							midPrice:
								(nextState.bids[0].price + nextState.asks[0].price) / 2,
					  }
					: {}),
				...(nextState.bids.length ? { orderBookBids: nextState.bids } : {}),
				...(nextState.asks.length ? { orderBookAsks: nextState.asks } : {}),
				...(snapshot?.timestamp !== undefined ? { timestamp: snapshot.timestamp } : {}),
			});
		}
	}

	private handleBookDepthEvent(event: NadoBookDepthEvent): void {
		if (this.bootstrappingProductIds.has(event.product_id)) {
			const pendingEvents = this.pendingBookDepthEvents.get(event.product_id) ?? [];
			pendingEvents.push(event);
			this.pendingBookDepthEvents.set(event.product_id, pendingEvents);
			return;
		}

		const currentState = this.orderBooks.get(event.product_id);

		if (
			currentState?.lastMaxTimestamp !== undefined &&
			event.last_max_timestamp !== currentState.lastMaxTimestamp
		) {
			this.reportBookDepthGap(event.product_id, {
				actualLastMaxTimestamp: event.last_max_timestamp,
				expectedLastMaxTimestamp: currentState.lastMaxTimestamp,
				maxTimestamp: event.max_timestamp,
			});
			void this.resyncOrderBook(event.product_id);
			return;
		}

		const nextState = {
			...applyNadoBookDepthUpdate(
				currentState ?? {
					bids: [],
					asks: [],
				},
				event,
			),
			lastMaxTimestamp: event.max_timestamp,
		};

		this.orderBooks.set(event.product_id, nextState);

		const symbol = this.symbolMap.get(event.product_id);

		if (!symbol) {
			return;
		}

		upsertMarketSnapshot({
			exchange: "nado",
			symbol,
			sourceSymbol: symbol,
			...(nextState.bids[0] !== undefined
				? {
						bidPrice: nextState.bids[0].price,
						bidSize: nextState.bids[0].size,
				  }
				: {}),
			...(nextState.asks[0] !== undefined
				? {
						askPrice: nextState.asks[0].price,
						askSize: nextState.asks[0].size,
				  }
				: {}),
			...(nextState.bids[0] !== undefined && nextState.asks[0] !== undefined
				? {
						midPrice: (nextState.bids[0].price + nextState.asks[0].price) / 2,
				  }
				: {}),
			...(nextState.bids.length ? { orderBookBids: nextState.bids } : {}),
			...(nextState.asks.length ? { orderBookAsks: nextState.asks } : {}),
			...(normalizeTimestampValue(event.max_timestamp) !== undefined
				? { timestamp: normalizeTimestampValue(event.max_timestamp) }
				: {}),
		});
	}

	private async resyncOrderBook(productId: number): Promise<void> {
		if (this.bootstrappingProductIds.has(productId)) {
			return;
		}

		this.bootstrappingProductIds.add(productId);
		this.pendingBookDepthEvents.delete(productId);

		try {
			const snapshot = await this.params.getOrderBookSnapshot(
				productId,
				this.params.getOrderBookDepth(),
				this.symbolMap,
			);
			this.hydrateOrderBook(productId, snapshot);
		} catch {
			this.reportBookDepthResyncFailure(productId);
			this.bootstrappingProductIds.delete(productId);
		}
	}

	private reportBookDepthGap(
		productId: number,
		event: {
			actualLastMaxTimestamp?: string;
			expectedLastMaxTimestamp?: string;
			maxTimestamp?: string;
		},
	): void {
		const summary = this.resyncMonitor.recordGap({
			productId,
			symbol: this.symbolMap.get(productId),
			...event,
		});

		if (!summary) {
			return;
		}

		console.warn(
			`Nado book_depth gap detected for ${summary.symbol ?? summary.productId}: ` +
				`${summary.productGapCount} product gaps, ${summary.totalGapCount} total gaps`,
			{
				actualLastMaxTimestamp: summary.actualLastMaxTimestamp,
				expectedLastMaxTimestamp: summary.expectedLastMaxTimestamp,
				maxTimestamp: summary.maxTimestamp,
			},
		);
	}

	private reportBookDepthResyncFailure(productId: number): void {
		const summary = this.resyncMonitor.recordFailure({
			productId,
			symbol: this.symbolMap.get(productId),
		});

		if (!summary) {
			return;
		}

		console.warn(
			`Nado book_depth resync failed for ${summary.symbol ?? summary.productId}: ` +
				`${summary.productGapCount} product gaps, ${summary.totalGapCount} total gaps`,
		);
	}

	private send(message: unknown): void {
		if (this.socket?.readyState !== WebSocket.OPEN) {
			return;
		}

		this.socket.send(JSON.stringify(message));
	}

	private cleanupConnection(): void {
		this.bootstrappingProductIds.clear();
		this.orderBooks.clear();
		this.pendingBookDepthEvents.clear();

		if (this.reconnect) {
			clearTimeout(this.reconnect);
			this.reconnect = undefined;
		}
	}

	private scheduleReconnect(): void {
		if (!this.shouldReconnect || this.reconnect) {
			return;
		}

		this.reconnect = setTimeout(() => {
			this.reconnect = undefined;
			this.connect();
		}, this.params.reconnectDelayMs);
	}
}

const parseJson = (value: string): unknown => {
	try {
		return JSON.parse(value) as unknown;
	} catch {
		return undefined;
	}
};

export const nadoMarketDataStream = new NadoMarketDataStream({
	getOrderBookDepth: () => NADO_ORDER_BOOK_DEPTH,
	getOrderBookSnapshot: async (productId, depth, symbolMap) => {
		const liquidity = await nadoClient.getMarketLiquidity(productId, depth);

		return liquidity
			? mapNadoMarketLiquidityToMarketSnapshot(liquidity, symbolMap)
			: undefined;
	},
	getSymbols: async () => createNadoSymbolMap(await nadoClient.getSymbols()),
	reconnectDelayMs: NADO_WS_RECONNECT_DELAY_MS,
	url: NADO_MARKET_DATA_WS_URL,
});

const normalizeTimestampValue = (value?: string): number | undefined => {
	if (!value) {
		return undefined;
	}

	const parsed = Number(value);

	if (Number.isNaN(parsed)) {
		return undefined;
	}

	return parsed > 1_000_000_000_000_000 ? Math.floor(parsed / 1_000_000) : parsed;
};
