import { WebSocketManager } from "../WebSocketManager";
import type { BBOUpdate, WebSocketAdapter, WebSocketStatus } from "../types";

const PARADEX_WS_URL = "wss://ws.api.prod.paradex.trade/v1";

interface ParadexBBOUpdate {
	channel: "bbo";
	data: {
		market: string;
		ask: string;
		ask_size: string;
		bid: string;
		bid_size: string;
		last_updated_at: number;
		seq_no: number;
	};
}

interface ParadexSubscription {
	jsonrpc: "2.0";
	id: number;
	method: "subscribe";
	params: {
		channel: "bbo";
		market: string;
	};
}

interface ParadexUnsubscription {
	jsonrpc: "2.0";
	id: number;
	method: "unsubscribe";
	params: {
		channel: "bbo";
		market: string;
	};
}

export class ParadexWSAdapter implements WebSocketAdapter {
	private manager: WebSocketManager;
	private bboHandlers: Set<(update: BBOUpdate) => void> = new Set();
	private statusHandlers: Set<(status: WebSocketStatus) => void> = new Set();
	private messageId = 1;

	constructor() {
		this.manager = new WebSocketManager({
			url: PARADEX_WS_URL,
			exchange: "paradex",
		});

		this.manager.onMessage((data) => this.handleMessage(data));
		this.manager.onStatusChange((status) => this.notifyStatusHandlers(status));
	}

	connect(): void {
		this.manager.connect();
	}

	disconnect(): void {
		this.manager.disconnect();
	}

	subscribe(symbols: string[]): void {
		for (const symbol of symbols) {
			const subscription: ParadexSubscription = {
				jsonrpc: "2.0",
				id: this.messageId++,
				method: "subscribe",
				params: {
					channel: "bbo",
					market: symbol,
				},
			};
			this.manager.send(subscription);
		}
	}

	unsubscribe(symbols: string[]): void {
		for (const symbol of symbols) {
			const unsubscription: ParadexUnsubscription = {
				jsonrpc: "2.0",
				id: this.messageId++,
				method: "unsubscribe",
				params: {
					channel: "bbo",
					market: symbol,
				},
			};
			this.manager.send(unsubscription);
		}
	}

	onBBOUpdate(callback: (update: BBOUpdate) => void): () => void {
		this.bboHandlers.add(callback);
		return () => {
			this.bboHandlers.delete(callback);
		};
	}

	onStatusChange(callback: (status: WebSocketStatus) => void): () => void {
		this.statusHandlers.add(callback);
		return () => {
			this.statusHandlers.delete(callback);
		};
	}

	getStatus(): WebSocketStatus {
		return this.manager.getStatus();
	}

	private handleMessage(data: unknown): void {
		const message = data as { channel?: string; params?: ParadexBBOUpdate["data"] };

		if (message.channel === "bbo" && message.params) {
			const params = message.params;
			const update: BBOUpdate = {
				exchange: "paradex",
				symbol: params.market,
				bid: params.bid,
				bidSize: params.bid_size,
				ask: params.ask,
				askSize: params.ask_size,
				timestamp: params.last_updated_at,
			};

			this.notifyBBOHandlers(update);
		}
	}

	private notifyBBOHandlers(update: BBOUpdate): void {
		for (const handler of this.bboHandlers) {
			try {
				handler(update);
			} catch (e) {
				console.error("[Paradex] BBO handler error:", e);
			}
		}
	}

	private notifyStatusHandlers(status: WebSocketStatus): void {
		for (const handler of this.statusHandlers) {
			try {
				handler(status);
			} catch (e) {
				console.error("[Paradex] Status handler error:", e);
			}
		}
	}
}
