import { WebSocketManager } from "../WebSocketManager";
import type { BBOUpdate, WebSocketAdapter, WebSocketStatus } from "../types";

const HYPERLIQUID_WS_URL = "wss://api.hyperliquid.xyz/ws";

interface HyperliquidL2BookUpdate {
	channel: "l2Book";
	data: {
		coin: string;
		levels: [[{ px: string; sz: string; n: number }[], { px: string; sz: string; n: number }[]]];
		time: number;
	};
}

interface HyperliquidSubscription {
	method: "subscribe" | "unsubscribe";
	subscription: {
		type: "l2Book";
		coin: string;
	};
}

export class HyperliquidWSAdapter implements WebSocketAdapter {
	private manager: WebSocketManager;
	private bboHandlers: Set<(update: BBOUpdate) => void> = new Set();
	private statusHandlers: Set<(status: WebSocketStatus) => void> = new Set();

	constructor() {
		this.manager = new WebSocketManager({
			url: HYPERLIQUID_WS_URL,
			exchange: "hyperliquid",
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
			const subscription: HyperliquidSubscription = {
				method: "subscribe",
				subscription: {
					type: "l2Book",
					coin: symbol,
				},
			};
			this.manager.send(subscription);
		}
	}

	unsubscribe(symbols: string[]): void {
		for (const symbol of symbols) {
			const subscription: HyperliquidSubscription = {
				method: "unsubscribe",
				subscription: {
					type: "l2Book",
					coin: symbol,
				},
			};
			this.manager.send(subscription);
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
		const message = data as HyperliquidL2BookUpdate;

		if (message.channel === "l2Book" && message.data?.levels) {
			const [bids, asks] = message.data.levels[0];
			const bestBid = bids[0];
			const bestAsk = asks[0];

			if (bestBid && bestAsk) {
				const update: BBOUpdate = {
					exchange: "hyperliquid",
					symbol: message.data.coin,
					bid: bestBid.px,
					bidSize: bestBid.sz,
					ask: bestAsk.px,
					askSize: bestAsk.sz,
					timestamp: message.data.time,
				};

				this.notifyBBOHandlers(update);
			}
		}
	}

	private notifyBBOHandlers(update: BBOUpdate): void {
		for (const handler of this.bboHandlers) {
			try {
				handler(update);
			} catch (e) {
				console.error("[Hyperliquid] BBO handler error:", e);
			}
		}
	}

	private notifyStatusHandlers(status: WebSocketStatus): void {
		for (const handler of this.statusHandlers) {
			try {
				handler(status);
			} catch (e) {
				console.error("[Hyperliquid] Status handler error:", e);
			}
		}
	}
}
