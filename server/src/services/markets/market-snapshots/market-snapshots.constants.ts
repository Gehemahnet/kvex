export const MARKET_CONTRACT_SUFFIXES = new Set(["PERP", "PERPETUAL", "SWAP"]);

export const MARKET_STABLE_QUOTES = ["USDT", "USDC", "USD"];

export const MARKET_BASE_ASSET_ALIASES = new Map([
	["XBT", "BTC"],
	["WBTC", "BTC"],
]);

export const MARKET_EQUITY_BASE_ASSETS = new Set([
	"AAPL",
	"AMZN",
	"COIN",
	"DIA",
	"GOOGL",
	"IWM",
	"META",
	"MSTR",
	"MSFT",
	"NVDA",
	"QQQ",
	"SPY",
	"TSLA",
]);

export const MARKET_SYNTHETIC_BASE_ASSETS = new Set([
	"ANTHROPIC",
	"CL",
	"NG",
	"OPENAI",
	"SPCX",
	"SPX",
	"XAG",
	"XAU",
]);

export const MARKET_SNAPSHOT_REDIS_KEY_PREFIX = "kvex:market-snapshot";

export const MARKET_SNAPSHOT_REDIS_TTL_SECONDS = 120;

export const MARKET_SNAPSHOT_BOOTSTRAP_FRESHNESS_MS =
	MARKET_SNAPSHOT_REDIS_TTL_SECONDS * 1000;

export const MARKET_TRADABLE_SYMBOL_PATTERN = /^[A-Z0-9]+$/;
