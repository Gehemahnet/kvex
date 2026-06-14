export const BINANCE_TICKER_PRICE_URL = "https://api.binance.com/api/v3/ticker/price";
export const ASSET_PRICE_CACHE_TTL_MS = 180_000;
export const USD_STABLECOIN_SYMBOLS = new Set(["USD", "USDT", "USDC", "DAI"]);
export const SUPPORTED_ASSET_PRICE_SYMBOLS = new Set([
	"AAVE",
	"BTC",
	"DAI",
	"ETH",
	"HYPE",
	"LINK",
	"MATIC",
	"ONDO",
	"PENDLE",
	"SOL",
	"UNI",
	"USDC",
	"USDE",
	"USDT",
	"WBTC",
	"WETH",
	"WMATIC",
]);
export const PRICE_SYMBOL_ALIASES: Record<string, string> = {
	WBTC: "BTC",
	WETH: "ETH",
	WMATIC: "MATIC",
};
