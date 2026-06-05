import WebSocket from "ws";
import { upsertMarketSnapshot } from "../../services/markets/market-snapshot-store";
import { okxClient } from "./okx";
import type { OkxInstrument } from "./okx.types";
import {
	OKX_MARKET_DATA_WS_URL,
	OKX_WS_HEARTBEAT_INTERVAL_MS,
	OKX_WS_RECONNECT_DELAY_MS,
	OKX_WS_SUBSCRIPTION_CHUNK_SIZE,
} from "./okx.ws.constants";
import {
	createOkxMarketDataSubscriptionMessage,
	isOkxBookMessage,
	isOkxFundingRateMessage,
	isOkxTickerMessage,
	mapOkxBookToMarketSnapshot,
	mapOkxFundingRateToMarketSnapshot,
	mapOkxTickerToMarketSnapshot,
} from "./okx.ws.utils";

class OkxMarketDataStream {
	private heartbeat?: NodeJS.Timeout;
	private reconnect?: NodeJS.Timeout;
	private shouldReconnect = true;
	private socket?: WebSocket;

	constructor(
		private readonly params: {
			getInstruments: () => Promise<OkxInstrument[]>;
			heartbeatIntervalMs: number;
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
			this.startHeartbeat();
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
		let instIds: string[];

		try {
			const instruments = await this.params.getInstruments();

			instIds = instruments
				.filter((instrument) => instrument.state === "live")
				.map((instrument) => instrument.instId);
		} catch {
			this.socket?.close();
			return;
		}

		for (const chunk of chunkValues(instIds, OKX_WS_SUBSCRIPTION_CHUNK_SIZE)) {
			this.send(createOkxMarketDataSubscriptionMessage(chunk));
		}
	}

	private handleMessage(message: string): void {
		const parsedMessage = parseJson(message);

		if (isOkxTickerMessage(parsedMessage)) {
			for (const ticker of parsedMessage.data) {
				upsertMarketSnapshot(mapOkxTickerToMarketSnapshot(ticker));
			}
			return;
		}

		if (isOkxFundingRateMessage(parsedMessage)) {
			for (const fundingRate of parsedMessage.data) {
				upsertMarketSnapshot(mapOkxFundingRateToMarketSnapshot(fundingRate));
			}
			return;
		}

		if (isOkxBookMessage(parsedMessage)) {
			for (const book of parsedMessage.data) {
				upsertMarketSnapshot(mapOkxBookToMarketSnapshot(book));
			}
		}
	}

	private startHeartbeat(): void {
		this.stopHeartbeat();
		this.heartbeat = setInterval(() => {
			this.send("ping");
		}, this.params.heartbeatIntervalMs);
	}

	private stopHeartbeat(): void {
		if (!this.heartbeat) {
			return;
		}

		clearInterval(this.heartbeat);
		this.heartbeat = undefined;
	}

	private send(message: unknown): void {
		if (this.socket?.readyState !== WebSocket.OPEN) {
			return;
		}

		this.socket.send(typeof message === "string" ? message : JSON.stringify(message));
	}

	private cleanupConnection(): void {
		this.stopHeartbeat();

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

const chunkValues = <Value>(values: Value[], size: number): Value[][] => {
	const chunks: Value[][] = [];

	for (let index = 0; index < values.length; index += size) {
		chunks.push(values.slice(index, index + size));
	}

	return chunks;
};

export const okxMarketDataStream = new OkxMarketDataStream({
	getInstruments: () => okxClient.getSwapInstruments(),
	heartbeatIntervalMs: OKX_WS_HEARTBEAT_INTERVAL_MS,
	reconnectDelayMs: OKX_WS_RECONNECT_DELAY_MS,
	url: OKX_MARKET_DATA_WS_URL,
});
