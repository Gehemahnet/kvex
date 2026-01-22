import { WebSocketManager } from "../WebSocketManager";
import type { BBOUpdate, WebSocketAdapter, WebSocketStatus } from "../types";

const PACIFICA_WS_URL = "wss://ws.pacifica.fi/ws";

interface PacificaOrderbookLevel {
	/** Price */
	p: string;
	/** Amount */
	a: string;
	/** Number of orders */
	n: number;
}

interface PacificaOrderbookUpdate {
	/** Symbol */
	s: string;
	/** Levels: [bids[], asks[]] */
	l: [PacificaOrderbookLevel[], PacificaOrderbookLevel[]];
	/** Timestamp */
	t: number;
}

interface PacificaSubscription {
	method: "subscribe" | "unsubscribe";
	params: {
		source: "book";
		symbol: string;
	};
}

export class PacificaWSAdapter implements WebSocketAdapter {
	private manager: WebSocketManager;
	private bboHandlers: Set<(update: BBOUpdate) => void> = new Set();
	private statusHandlers: Set<(status: WebSocketStatus) => void> = new Set();
	private pingInterval: ReturnType<typeof setInterval> | null = null;

	constructor() {
		this.manager = new WebSocketManager({
			url: PACIFICA_WS_URL,
			exchange: "pacifica",
		});

		this.manager.onMessage((data) => this.handleMessage(data));
		this.manager.onStatusChange((status) => {
			this.notifyStatusHandlers(status);

			if (status === "connected") {
				// Start ping to keep connection alive (60s timeout)
				this.startPing();
			} else {
				this.stopPing();
			}
		});
	}

	connect(): void {
		this.manager.connect();
	}

	disconnect(): void {
		this.stopPing();
		this.manager.disconnect();
	}

	subscribe(symbols: string[]): void {
		for (const symbol of symbols) {
			const subscription: PacificaSubscription = {
				method: "subscribe",
				params: {
					source: "book",
					symbol: this.normalizeSymbol(symbol),
				},
			};
			this.manager.send(subscription);
		}
	}

	unsubscribe(symbols: string[]): void {
		for (const symbol of symbols) {
			const subscription: PacificaSubscription = {
				method: "unsubscribe",
				params: {
					source: "book",
					symbol: this.normalizeSymbol(symbol),
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

	private normalizeSymbol(symbol: string): string {
		// Pacifica uses simple symbols like "BTC", "ETH"
		return symbol.replace(/-USD.*$/i, "").replace(/USDC?$/i, "").toUpperCase();
	}

	private handleMessage(data: unknown): void {
		const message = data as { data?: PacificaOrderbookUpdate; source?: string };

		// Check if this is an orderbook update
		if (message.source === "book" && message.data) {
			const orderbook = message.data;
			const [bids, asks] = orderbook.l;

			const bestBid = bids[0];
			const bestAsk = asks[0];

			if (bestBid && bestAsk) {
				const update: BBOUpdate = {
					exchange: "pacifica",
					symbol: orderbook.s,
					bid: bestBid.p,
					bidSize: bestBid.a,
					ask: bestAsk.p,
					askSize: bestAsk.a,
					timestamp: orderbook.t,
				};

				this.notifyBBOHandlers(update);
			}
		}
	}

	private startPing(): void {
		this.stopPing();
		// Send ping every 30 seconds to keep connection alive
		this.pingInterval = setInterval(() => {
			this.manager.send({ method: "ping" });
		}, 30000);
	}

	private stopPing(): void {
		if (this.pingInterval) {
			clearInterval(this.pingInterval);
			this.pingInterval = null;
		}
	}

	private notifyBBOHandlers(update: BBOUpdate): void {
		for (const handler of this.bboHandlers) {
			try {
				handler(update);
			} catch (e) {
				console.error("[Pacifica] BBO handler error:", e);
			}
		}
	}

	private notifyStatusHandlers(status: WebSocketStatus): void {
		for (const handler of this.statusHandlers) {
			try {
				handler(status);
			} catch (e) {
				console.error("[Pacifica] Status handler error:", e);
			}
		}
	}
}
