export type WalletBalanceNetwork = "evm" | "solana";
export type WalletBalanceTokenInput = "all" | "native" | string;

export type PortfolioSource = {
	type: "wallet";
	network: WalletBalanceNetwork;
	address: string;
	chainId?: number;
	chainKey?: string;
	chainName?: string;
	label?: string;
};

export type UserPortfolioSourceStatus = "active" | "disabled";

export type UserPortfolioSource = {
	id: string;
	userId: string;
	type: "wallet";
	network: WalletBalanceNetwork;
	address: string;
	label?: string;
	status: UserPortfolioSourceStatus;
	createdAt: string;
	updatedAt: string;
};

export type UserPortfolioSourcesResponse = {
	sources: UserPortfolioSource[];
};

export type UserPortfolioSourceResponse = {
	source: UserPortfolioSource;
};

export type CreateUserPortfolioSourceRequest = {
	network: WalletBalanceNetwork;
	address: string;
	label?: string;
};

export type CreateUserPortfolioSourcesRequest = {
	sources: CreateUserPortfolioSourceRequest[];
};

export type UpdateUserPortfolioSourceRequest = {
	label?: string;
	status?: UserPortfolioSourceStatus;
};

export type WalletTokenBalance = {
	token: WalletBalanceTokenInput;
	rawBalance: string;
	formattedBalance: string;
	decimals?: number;
	logoUrl?: string;
	priceUsd?: number;
	source: PortfolioSource;
	symbol?: string;
	tokenAddress?: string;
	valueUsd?: number;
};

export type WalletBalanceError = {
	address: string;
	chainId?: number;
	token: WalletBalanceTokenInput;
	code: string;
	message: string;
};

export type WalletBalanceSourceResult = {
	address: string;
	network: WalletBalanceNetwork;
	balancesCount: number;
	errorsCount: number;
	status: "success" | "partial" | "failed";
};

export type WalletBalancesResponse = {
	networks?: WalletBalanceNetwork[];
	tokens: WalletBalanceTokenInput[];
	balances: WalletTokenBalance[];
	errors: WalletBalanceError[];
	sourceResults: WalletBalanceSourceResult[];
};

export type AssetPrice = {
	symbol: string;
	priceUsd: number;
	source: string;
	updatedAt: string;
};

export type AssetPriceError = {
	symbol: string;
	code: string;
	message: string;
};

export type AssetPricesResponse = {
	symbols: string[];
	prices: AssetPrice[];
	errors: AssetPriceError[];
};

export type UserExchangeBalanceAsset = {
	asset: string;
	available?: string;
	equity?: string;
	hold?: string;
	total?: string;
	valueUsd?: number;
};

export type UserExchangeBalanceError = {
	accountId: string;
	code: string;
	exchange: string;
	message: string;
};

export type UserExchangeBalanceResult = {
	accountId: string;
	exchange: string;
	label: string;
	assets: UserExchangeBalanceAsset[];
	totalValueUsd?: number;
	updatedAt?: string;
};

export type UserExchangeBalancesResponse = {
	balances: UserExchangeBalanceResult[];
	errors: UserExchangeBalanceError[];
};

export type UserPortfolioBalancesResponse = {
	exchangeBalances: UserExchangeBalancesResponse;
	walletBalances: WalletBalancesResponse;
};

export type UserExchangePermission =
	| "balances"
	| "orders"
	| "trades";

export type UserExchangeCapability =
	| "balances"
	| "fees"
	| "orders"
	| "positions"
	| "trades";

export type UserExchangeTokenExchange =
	| "ethereal"
	| "hyperliquid"
	| "nado"
	| "okx"
	| "pacifica"
	| "variational";

export type UserExchangeTokenStatus = "active" | "disabled" | "error";

export type UserExchangeTokenPublicData = {
	accountAddress?: string;
	address?: string;
	apiKey?: string;
	apiSecret?: string;
	exchange: UserExchangeTokenExchange;
	expiresAt?: string;
	passphrase?: string;
	permissions?: UserExchangePermission[];
	subaccountName?: string;
};

export type UserExchangeToken = {
	id: string;
	userId: string;
	exchange: UserExchangeTokenExchange;
	label: string;
	status: UserExchangeTokenStatus;
	publicData: UserExchangeTokenPublicData;
	capabilities: Partial<Record<UserExchangeCapability, boolean>>;
	lastCheckedAt?: string;
	createdAt: string;
	updatedAt: string;
};

export type CreateUserExchangeTokenRequest = {
	accountAddress?: string;
	address?: string;
	apiKey?: string;
	apiSecret?: string;
	exchange: UserExchangeTokenExchange;
	expiresAt?: string;
	label?: string;
	passphrase?: string;
	permissions: UserExchangePermission[];
	subaccountName?: string;
};

export type CreateUserExchangeTokensRequest = {
	tokens: CreateUserExchangeTokenRequest[];
};

export type UpdateUserExchangeTokenRequest = {
	label: string;
};

export type UserExchangeTokenResponse = {
	token: UserExchangeToken;
};

export type UserExchangeTokensResponse = {
	tokens: UserExchangeToken[];
};
