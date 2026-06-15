import type {
	UserExchangePermission,
	UserExchangeTokenExchange,
	WalletBalanceNetwork,
	WalletBalanceTokenInput,
} from "@api/portfolio";

export const PORTFOLIO_ASSET_FILTERS_INDEXED_DB_KEY = "kvex-portfolio-asset-filters";

export const DEFAULT_PORTFOLIO_HIDE_SMALL_ASSETS = true;
export const DEFAULT_PORTFOLIO_MIN_ASSET_VALUE_USD = 1;

export const DEFAULT_BALANCE_TOKENS: WalletBalanceTokenInput[] = ["all"];

export const WALLET_NETWORK_OPTIONS: { label: string; value: WalletBalanceNetwork }[] = [
	{ label: "EVM", value: "evm" },
	{ label: "Solana", value: "solana" },
];

export const EXCHANGE_TOKEN_OPTIONS: {
	label: string;
	value: UserExchangeTokenExchange;
}[] = [
	{ label: "Hyperliquid", value: "hyperliquid" },
	{ label: "OKX", value: "okx" },
	{ label: "Pacifica", value: "pacifica" },
	{ label: "Ethereal", value: "ethereal" },
	{ label: "Nado", value: "nado" },
];

export const EXCHANGE_TOKEN_PERMISSION_OPTIONS: {
	label: string;
	value: UserExchangePermission;
}[] = [
	{ label: "Balances", value: "balances" },
	{ label: "Trades", value: "trades" },
	{ label: "Orders", value: "orders" },
];

export const DEFAULT_EXCHANGE_TOKEN_PERMISSIONS: UserExchangePermission[] = [
	"balances",
];

export const PORTFOLIO_TAB_VALUES = {
	assets: "assets",
	sources: "sources",
} as const;

export const PORTFOLIO_TAB_TITLES = {
	[PORTFOLIO_TAB_VALUES.assets]: "Assets",
	[PORTFOLIO_TAB_VALUES.sources]: "Tracked Sources",
} as const;
