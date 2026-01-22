import type { WebSocketConfig, WebSocketStatus } from "./types";

export class WebSocketManager {
	private ws: WebSocket | null = null;
	private config: WebSocketConfig;
	private status: WebSocketStatus = "disconnected";
	private reconnectAttempts = 0;
	private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
	private messageHandlers: Set<(data: unknown) => void> = new Set();
	private statusHandlers: Set<(status: WebSocketStatus) => void> = new Set();
	private subscribedSymbols: Set<string> = new Set();

	constructor(config: WebSocketConfig) {
		this.config = {
			reconnectInterval: 3000,
			maxReconnectAttempts: 10,
			...config,
		};
	}

	connect(): void {
		if (this.ws?.readyState === WebSocket.OPEN) {
			return;
		}

		this.setStatus("connecting");

		try {
			this.ws = new WebSocket(this.config.url);

			this.ws.onopen = () => {
				console.log(`[${this.config.exchange}] WebSocket connected`);
				this.reconnectAttempts = 0;
				this.setStatus("connected");

				// Re-subscribe to previously subscribed symbols
				if (this.subscribedSymbols.size > 0) {
					this.sendSubscription([...this.subscribedSymbols]);
				}
			};

			this.ws.onmessage = (event) => {
				try {
					const data = JSON.parse(event.data);
					this.notifyMessageHandlers(data);
				} catch (e) {
					console.error(`[${this.config.exchange}] Failed to parse message:`, e);
				}
			};

			this.ws.onerror = (error) => {
				console.error(`[${this.config.exchange}] WebSocket error:`, error);
				this.setStatus("error");
			};

			this.ws.onclose = () => {
				console.log(`[${this.config.exchange}] WebSocket disconnected`);
				this.setStatus("disconnected");
				this.attemptReconnect();
			};
		} catch (e) {
			console.error(`[${this.config.exchange}] Failed to create WebSocket:`, e);
			this.setStatus("error");
			this.attemptReconnect();
		}
	}

	disconnect(): void {
		if (this.reconnectTimeout) {
			clearTimeout(this.reconnectTimeout);
			this.reconnectTimeout = null;
		}

		this.reconnectAttempts = this.config.maxReconnectAttempts!; // Prevent reconnect

		if (this.ws) {
			this.ws.close();
			this.ws = null;
		}

		this.setStatus("disconnected");
	}

	subscribe(symbols: string[]): void {
		for (const symbol of symbols) {
			this.subscribedSymbols.add(symbol);
		}

		if (this.ws?.readyState === WebSocket.OPEN) {
			this.sendSubscription(symbols);
		}
	}

	unsubscribe(symbols: string[]): void {
		for (const symbol of symbols) {
			this.subscribedSymbols.delete(symbol);
		}

		if (this.ws?.readyState === WebSocket.OPEN) {
			this.sendUnsubscription(symbols);
		}
	}

	send(data: unknown): void {
		if (this.ws?.readyState === WebSocket.OPEN) {
			this.ws.send(JSON.stringify(data));
		}
	}

	onMessage(handler: (data: unknown) => void): () => void {
		this.messageHandlers.add(handler);
		return () => {
			this.messageHandlers.delete(handler);
		};
	}

	onStatusChange(handler: (status: WebSocketStatus) => void): () => void {
		this.statusHandlers.add(handler);
		// Immediately notify current status
		handler(this.status);
		return () => {
			this.statusHandlers.delete(handler);
		};
	}

	getStatus(): WebSocketStatus {
		return this.status;
	}

	protected sendSubscription(_symbols: string[]): void {
		// Override in subclass
	}

	protected sendUnsubscription(_symbols: string[]): void {
		// Override in subclass
	}

	private setStatus(status: WebSocketStatus): void {
		this.status = status;
		this.notifyStatusHandlers(status);
	}

	private notifyMessageHandlers(data: unknown): void {
		for (const handler of this.messageHandlers) {
			try {
				handler(data);
			} catch (e) {
				console.error(`[${this.config.exchange}] Message handler error:`, e);
			}
		}
	}

	private notifyStatusHandlers(status: WebSocketStatus): void {
		for (const handler of this.statusHandlers) {
			try {
				handler(status);
			} catch (e) {
				console.error(`[${this.config.exchange}] Status handler error:`, e);
			}
		}
	}

	private attemptReconnect(): void {
		if (this.reconnectAttempts >= this.config.maxReconnectAttempts!) {
			console.log(`[${this.config.exchange}] Max reconnect attempts reached`);
			return;
		}

		this.reconnectAttempts++;
		console.log(
			`[${this.config.exchange}] Reconnecting (attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts})...`
		);

		this.reconnectTimeout = setTimeout(() => {
			this.connect();
		}, this.config.reconnectInterval);
	}
}
