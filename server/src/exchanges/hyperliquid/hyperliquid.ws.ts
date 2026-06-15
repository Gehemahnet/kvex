import WebSocket from "ws";
import { upsertMarketSnapshots } from "#services/markets/market-snapshots/market-snapshot-store";
import { hyperliquidRestClient } from "./hyperliquid";
import type { AdapterPerpFullMetadata } from "./hyperliquid.types";
import {
	HYPERLIQUID_MARKET_DATA_WS_URL,
	HYPERLIQUID_WS_HEARTBEAT_INTERVAL_MS,
	HYPERLIQUID_WS_RECONNECT_DELAY_MS,
} from "./hyperliquid.ws.constants";
import {
	createHyperliquidActiveAssetCtxSubscriptionMessage,
	createHyperliquidAllMidsSubscriptionMessage,
	createHyperliquidBboSubscriptionMessage,
	createHyperliquidL2BookSubscriptionMessage,
	createHyperliquidPingMessage,
	isHyperliquidActiveAssetCtxMessage,
	isHyperliquidAllMidsMessage,
	isHyperliquidBboMessage,
	isHyperliquidL2BookMessage,
	mapHyperliquidActiveAssetCtxToMarketSnapshot,
	mapHyperliquidAllMidsToMarketSnapshots,
	mapHyperliquidBboToMarketSnapshot,
	mapHyperliquidL2BookToMarketSnapshot,
} from "./hyperliquid.ws.utils";

class HyperliquidMarketDataStream {
	private heartbeat?: NodeJS.Timeout;
	private reconnect?: NodeJS.Timeout;
	private shouldReconnect = true;
	private socket?: WebSocket;

	constructor(
		private readonly params: {
			getFullMarketsMetadata: () => Promise<AdapterPerpFullMetadata>;
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
			this.send(createHyperliquidAllMidsSubscriptionMessage());
			void this.subscribeToBbo();
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

		if (isHyperliquidBboMessage(parsedMessage)) {
			upsertMarketSnapshots([
				mapHyperliquidBboToMarketSnapshot(parsedMessage.data),
			]);
			return;
		}

		if (isHyperliquidActiveAssetCtxMessage(parsedMessage)) {
			upsertMarketSnapshots([
				mapHyperliquidActiveAssetCtxToMarketSnapshot(parsedMessage.data),
			]);
			return;
		}

		if (isHyperliquidL2BookMessage(parsedMessage)) {
			upsertMarketSnapshots([
				mapHyperliquidL2BookToMarketSnapshot(parsedMessage.data),
			]);
			return;
		}

		if (isHyperliquidAllMidsMessage(parsedMessage)) {
			upsertMarketSnapshots(
				mapHyperliquidAllMidsToMarketSnapshots(parsedMessage.data.mids),
			);
		}
	}

	private async subscribeToBbo(): Promise<void> {
		let markets: AdapterPerpFullMetadata;

		try {
			markets = await this.params.getFullMarketsMetadata();
		} catch {
			return;
		}

		for (const market of markets.universe) {
			if (!market.isDelisted) {
				this.send(createHyperliquidBboSubscriptionMessage(market.name));
				this.send(createHyperliquidL2BookSubscriptionMessage(market.name));
				this.send(createHyperliquidActiveAssetCtxSubscriptionMessage(market.name));
			}
		}
	}

	private startHeartbeat(): void {
		this.stopHeartbeat();
		this.heartbeat = setInterval(() => {
			this.send(createHyperliquidPingMessage());
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

export const hyperliquidMarketDataStream = new HyperliquidMarketDataStream({
	getFullMarketsMetadata: () => hyperliquidRestClient.getFullMarketsMetadata(),
	heartbeatIntervalMs: HYPERLIQUID_WS_HEARTBEAT_INTERVAL_MS,
	reconnectDelayMs: HYPERLIQUID_WS_RECONNECT_DELAY_MS,
	url: HYPERLIQUID_MARKET_DATA_WS_URL,
});
