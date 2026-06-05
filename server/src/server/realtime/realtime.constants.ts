export const MARKET_DATA_SOCKET_PATH = "/market-data";

export const MARKET_DATA_SOCKET_EVENTS = {
	MARKET_SNAPSHOTS_SUBSCRIBE: "market:snapshots:subscribe",
	MARKET_SNAPSHOTS_UNSUBSCRIBE: "market:snapshots:unsubscribe",
	MARKET_SNAPSHOTS_UPDATE: "market:snapshots:update",
	SPREADS_SUBSCRIBE: "spreads:subscribe",
	SPREADS_UNSUBSCRIBE: "spreads:unsubscribe",
	SPREADS_UPDATE: "spreads:update",
	ERROR: "market-data:error",
} as const;

export const MARKET_DATA_SOCKET_REFRESH_INTERVAL_MS = 3_000;
