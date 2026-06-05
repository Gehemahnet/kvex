import { io, type Socket } from "socket.io-client";
import { MARKET_DATA_SOCKET_PATH } from "./market-data-socket.constants";

let marketDataSocket: Socket | undefined;

/**
 * Returns the singleton Socket.IO client used by live market-data features.
 * The socket is lazy and starts disconnected so composables can control when
 * subscriptions begin.
 */
export const getMarketDataSocket = (): Socket => {
	marketDataSocket ??= io({
		path: MARKET_DATA_SOCKET_PATH,
		autoConnect: false,
		transports: ["websocket", "polling"],
	});

	return marketDataSocket;
};
