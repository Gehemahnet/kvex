export const MARKET_DATA_SOCKET_PATH = "/market-data";

export const MARKET_DATA_SOCKET_EVENTS = {
	SPREADS_SUBSCRIBE: "spreads:subscribe",
	SPREADS_UNSUBSCRIBE: "spreads:unsubscribe",
	SPREADS_UPDATE: "spreads:update",
	ERROR: "market-data:error",
} as const;
