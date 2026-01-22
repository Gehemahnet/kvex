import type { LowercaseExchange } from "../../common/types";

export type WebSocketStatus = "connecting" | "connected" | "disconnected" | "error";

export interface WebSocketConfig {
	url: string;
	exchange: LowercaseExchange;
	reconnectInterval?: number;
	maxReconnectAttempts?: number;
}

export interface BBOUpdate {
	exchange: LowercaseExchange;
	symbol: string;
	bid: string;
	bidSize: string;
	ask: string;
	askSize: string;
	timestamp: number;
}

export interface WebSocketAdapter {
	connect(): void;
	disconnect(): void;
	subscribe(symbols: string[]): void;
	unsubscribe(symbols: string[]): void;
	onBBOUpdate(callback: (update: BBOUpdate) => void): void;
	onStatusChange(callback: (status: WebSocketStatus) => void): void;
	getStatus(): WebSocketStatus;
}
