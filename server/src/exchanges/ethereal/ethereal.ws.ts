import WebSocket from "ws";
import { upsertMarketSnapshot } from "#services/markets/market-snapshots/market-snapshot-store";
import { etherealRestClient } from "./ethereal";
import type { ProductData } from "./ethereal.types";
import {
	appendEtherealAccountFills,
	invalidateEtherealAccountPositionSnapshots,
	updateEtherealAccountPositionMarks,
	upsertEtherealAccountPositions,
} from "./ethereal-account-state.store";
import {
	ETHEREAL_MARKET_DATA_WS_URL,
	ETHEREAL_WS_HEARTBEAT_INTERVAL_MS,
	ETHEREAL_WS_RECONNECT_DELAY_MS,
} from "./ethereal.ws.constants";
import {
	createEtherealAccountSubscriptionMessage,
	createEtherealL2BookSubscriptionMessage,
	createEtherealTickerSubscriptionMessage,
	isEtherealL2BookMessage,
	isEtherealOrderFillMessage,
	isEtherealPositionUpdateMessage,
	isEtherealTickerMessage,
	mapEtherealL2BookToMarketSnapshot,
	mapEtherealOrderFill,
	mapEtherealPositionUpdate,
	mapEtherealTickerToMarketSnapshot,
} from "./ethereal.ws.utils";

class EtherealMarketDataStream {
	private accountSubaccounts = new Set<string>();
	private heartbeat?: NodeJS.Timeout;
	private reconnect?: NodeJS.Timeout;
	private shouldReconnect = true;
	private socket?: WebSocket;

	constructor(
		private readonly params: {
			getProducts: () => Promise<ProductData[]>;
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
			void this.subscribeToTickers();
			this.subscribeToAccounts();
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

	subscribeToSubaccount(subaccountId: string): void {
		this.accountSubaccounts.add(subaccountId);
		this.sendAccountSubscriptions(subaccountId);
	}

	private subscribeToAccounts(): void {
		for (const subaccountId of this.accountSubaccounts) {
			this.sendAccountSubscriptions(subaccountId);
		}
	}

	private sendAccountSubscriptions(subaccountId: string): void {
		if (this.socket?.readyState !== WebSocket.OPEN) return;

		for (const type of ["PositionUpdate", "OrderFill"] as const) {
			this.socket.send(JSON.stringify(
				createEtherealAccountSubscriptionMessage(type, subaccountId),
			));
		}
	}

	private async subscribeToTickers(): Promise<void> {
		const socket = this.socket;

		if (!socket || socket.readyState !== WebSocket.OPEN) {
			return;
		}

		let activeTickers: string[];

		try {
			const products = await this.params.getProducts();

			activeTickers = products
				.filter((product) => product.status === "ACTIVE")
				.map((product) => product.ticker)
				.filter(Boolean);
		} catch {
			socket.close();
			return;
		}

		for (const ticker of activeTickers) {
			socket.send(
				JSON.stringify(createEtherealTickerSubscriptionMessage(ticker)),
			);
			socket.send(
				JSON.stringify(createEtherealL2BookSubscriptionMessage(ticker)),
			);
		}
	}

	private handleMessage(message: string): void {
		const parsedMessage = parseJson(message);

		if (isEtherealTickerMessage(parsedMessage)) {
			if (parsedMessage.data.markPx) {
				updateEtherealAccountPositionMarks(
					parsedMessage.data.s,
					parsedMessage.data.markPx,
					parsedMessage.data.t ?? parsedMessage.t,
				);
			}
			upsertMarketSnapshot(
				mapEtherealTickerToMarketSnapshot(
					parsedMessage.data,
					parsedMessage.t,
				),
			);
			return;
		}

		if (isEtherealL2BookMessage(parsedMessage)) {
			upsertMarketSnapshot(
				mapEtherealL2BookToMarketSnapshot(
					parsedMessage.data,
					parsedMessage.t,
				),
			);
			return;
		}

		if (isEtherealPositionUpdateMessage(parsedMessage)) {
			for (const position of mapEtherealPositionUpdate(parsedMessage)) {
				upsertEtherealAccountPositions(position.subaccountId, [position]);
			}
			return;
		}

		if (isEtherealOrderFillMessage(parsedMessage)) {
			for (const fill of mapEtherealOrderFill(parsedMessage)) {
				appendEtherealAccountFills(fill.subaccountId, [fill]);
			}
		}
	}

	private startHeartbeat(): void {
		this.stopHeartbeat();
		this.heartbeat = setInterval(() => {
			if (this.socket?.readyState === WebSocket.OPEN) {
				this.socket.ping();
			}
		}, this.params.heartbeatIntervalMs);
	}

	private stopHeartbeat(): void {
		if (!this.heartbeat) {
			return;
		}

		clearInterval(this.heartbeat);
		this.heartbeat = undefined;
	}

	private cleanupConnection(): void {
		this.stopHeartbeat();
		invalidateEtherealAccountPositionSnapshots();

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

export const etherealMarketDataStream = new EtherealMarketDataStream({
	getProducts: async () => (await etherealRestClient.getMarkets())?.data ?? [],
	heartbeatIntervalMs: ETHEREAL_WS_HEARTBEAT_INTERVAL_MS,
	reconnectDelayMs: ETHEREAL_WS_RECONNECT_DELAY_MS,
	url: ETHEREAL_MARKET_DATA_WS_URL,
});
