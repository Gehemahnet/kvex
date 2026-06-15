import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { getMarketSnapshots } from "#services/markets/market-snapshots/market-snapshots.service";
import { getSpreads } from "#services/spreads/spreads-core/spreads.service";
import {
	MARKET_DATA_SOCKET_EVENTS,
	MARKET_DATA_SOCKET_PATH,
	MARKET_DATA_SOCKET_REFRESH_INTERVAL_MS,
} from "./realtime.constants";
import type {
	MarketDataClientToServerEvents,
	MarketDataServerToClientEvents,
	MarketDataSocketError,
	MarketSnapshotsSubscribePayload,
	SpreadsSubscribePayload,
} from "./market-data-socket.types";
import {
	parseMarketSnapshotsSocketPayload,
	parseSpreadsSocketPayload,
} from "./market-data-socket.utils";

type MarketDataSocketServer = Server<
	MarketDataClientToServerEvents,
	MarketDataServerToClientEvents
>;

type Subscription = {
	refresh: () => Promise<void>;
	timer: NodeJS.Timeout;
};

/**
 * Attaches the Socket.IO market-data transport to the HTTP server and manages
 * per-client snapshot/spread subscriptions.
 */
export const attachMarketDataSocket = (
	server: HttpServer,
): MarketDataSocketServer => {
	const io = new Server<
		MarketDataClientToServerEvents,
		MarketDataServerToClientEvents
	>(server, {
		path: MARKET_DATA_SOCKET_PATH,
		cors: {
			origin: "*",
		},
	});

	io.on("connection", (socket) => {
		const subscriptions = new Map<string, Subscription>();

		const replaceSubscription = (
			key: string,
			refresh: () => Promise<void>,
		): void => {
			clearSubscription(subscriptions.get(key));

			const timer = setInterval(
				() => void refresh(),
				MARKET_DATA_SOCKET_REFRESH_INTERVAL_MS,
			);

			subscriptions.set(key, { refresh, timer });
			void refresh();
		};

		socket.on(
			MARKET_DATA_SOCKET_EVENTS.MARKET_SNAPSHOTS_SUBSCRIBE,
			(payload?: MarketSnapshotsSubscribePayload) => {
				replaceSubscription("market:snapshots", async () => {
					try {
						const query = parseMarketSnapshotsSocketPayload(payload);
						const data = await getMarketSnapshots(query);

						socket.emit(MARKET_DATA_SOCKET_EVENTS.MARKET_SNAPSHOTS_UPDATE, data);
					} catch (error) {
						socket.emit(
							MARKET_DATA_SOCKET_EVENTS.ERROR,
							normalizeSocketError(error),
						);
					}
				});
			},
		);

		socket.on(MARKET_DATA_SOCKET_EVENTS.MARKET_SNAPSHOTS_UNSUBSCRIBE, () => {
			const subscription = subscriptions.get("market:snapshots");

			clearSubscription(subscription);
			subscriptions.delete("market:snapshots");
		});

		socket.on(
			MARKET_DATA_SOCKET_EVENTS.SPREADS_SUBSCRIBE,
			(payload?: SpreadsSubscribePayload) => {
				replaceSubscription("spreads", async () => {
					try {
						const query = parseSpreadsSocketPayload(payload);
						const data = await getSpreads(query);

						socket.emit(MARKET_DATA_SOCKET_EVENTS.SPREADS_UPDATE, data);
					} catch (error) {
						socket.emit(
							MARKET_DATA_SOCKET_EVENTS.ERROR,
							normalizeSocketError(error),
						);
					}
				});
			},
		);

		socket.on(MARKET_DATA_SOCKET_EVENTS.SPREADS_UNSUBSCRIBE, () => {
			const subscription = subscriptions.get("spreads");

			clearSubscription(subscription);
			subscriptions.delete("spreads");
		});

		socket.on("disconnect", () => {
			for (const subscription of subscriptions.values()) {
				clearSubscription(subscription);
			}

			subscriptions.clear();
		});
	});

	return io;
};

const clearSubscription = (subscription?: Subscription): void => {
	if (!subscription) {
		return;
	}

	clearInterval(subscription.timer);
};

const normalizeSocketError = (error: unknown): MarketDataSocketError => {
	if (error instanceof Error) {
		return {
			code: "MARKET_DATA_SOCKET_ERROR",
			message: error.message,
		};
	}

	return {
		code: "MARKET_DATA_SOCKET_ERROR",
		message: "Unknown market data socket error",
	};
};
