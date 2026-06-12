export const BINANCE_TICKER_PRICE_URL = "https://api.binance.com/api/v3/ticker/price";
export const ASSET_PRICE_CACHE_TTL_MS = 180_000;
export const USD_STABLECOIN_SYMBOLS = new Set(["USD", "USDT", "USDC", "DAI"]);
export const PRICE_SYMBOL_ALIASES: Record<string, string> = {
	WBTC: "BTC",
	WETH: "ETH",
	WMATIC: "MATIC",
};
