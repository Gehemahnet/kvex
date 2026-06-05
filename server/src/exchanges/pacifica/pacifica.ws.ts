import WebSocket from "ws";
import { upsertMarketSnapshots } from "../../services/markets/market-snapshot-store";
import { pacificaRestClient } from "./pacifica";
import {
	PACIFICA_MARKET_DATA_WS_URL,
	PACIFICA_WS_HEARTBEAT_INTERVAL_MS,
	PACIFICA_WS_RECONNECT_DELAY_MS,
} from "./pacifica.ws.constants";
import {
	createPacificaBookSubscriptionMessage,
	createPacificaDepthSymbols,
	createPacificaPingMessage,
	createPacificaPricesSubscriptionMessage,
	isPacificaBookMessage,
	isPacificaPricesMessage,
	mapPacificaBookToMarketSnapshot,
	mapPacificaPriceToMarketSnapshot,
} from "./pacifica.ws.utils";

class PacificaMarketDataStream {
	private heartbeat?: NodeJS.Timeout;
	private reconnect?: NodeJS.Timeout;
	private shouldReconnect = true;
	private socket?: WebSocket;

	constructor(
		private readonly params: {
			getDepthSymbols: () => Promise<string[]>;
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

	private handleMessage(message: string): void {
		const parsedMessage = parseJson(message);

		if (!isPacificaPricesMessage(parsedMessage)) {
			if (isPacificaBookMessage(parsedMessage)) {
				upsertMarketSnapshots([mapPacificaBookToMarketSnapshot(parsedMessage.data)]);
			}

			return;
		}

		upsertMarketSnapshots(
			parsedMessage.data.map(mapPacificaPriceToMarketSnapshot),
		);
	}

	private async subscribe(): Promise<void> {
		this.send(createPacificaPricesSubscriptionMessage());

		try {
			const symbols = await this.params.getDepthSymbols();

			for (const symbol of symbols) {
				this.send(createPacificaBookSubscriptionMessage(symbol));
			}
		} catch {
			// Keep the prices feed alive even if depth bootstrap fails.
		}
	}

	private startHeartbeat(): void {
		this.stopHeartbeat();
		this.heartbeat = setInterval(() => {
			this.send(createPacificaPingMessage());
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

		this.socket.send(JSON.stringify(message));
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

export const pacificaMarketDataStream = new PacificaMarketDataStream({
	getDepthSymbols: async () =>
		createPacificaDepthSymbols((await pacificaRestClient.getMarkets()) ?? []),
	heartbeatIntervalMs: PACIFICA_WS_HEARTBEAT_INTERVAL_MS,
	reconnectDelayMs: PACIFICA_WS_RECONNECT_DELAY_MS,
	url: PACIFICA_MARKET_DATA_WS_URL,
});
