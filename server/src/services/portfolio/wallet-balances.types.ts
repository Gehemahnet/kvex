export type WalletBalanceNetwork = "evm" | "solana";

export type WalletBalanceTokenInput = "all" | "native" | string;

export type WalletBalancesQuery = {
	address: string;
	addresses: string[];
	addressesByNetwork?: Partial<Record<WalletBalanceNetwork, string[]>>;
	network: WalletBalanceNetwork;
	networks?: WalletBalanceNetwork[];
	tokens: WalletBalanceTokenInput[];
};

export type WalletBalanceSource = {
	type: "wallet";
	network: WalletBalanceNetwork;
	address: string;
	chainId?: number;
	chainKey?: string;
	chainName?: string;
	label?: string;
};

export type WalletTokenBalance = {
	token: WalletBalanceTokenInput;
	rawBalance: string;
	formattedBalance: string;
	decimals?: number;
	logoUrl?: string;
	priceUsd?: number;
	source: WalletBalanceSource;
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

export type WalletBalancesResponse = WalletBalancesQuery & {
	balances: WalletTokenBalance[];
	errors: WalletBalanceError[];
	sourceResults: WalletBalanceSourceResult[];
};

export type EvmJsonRpcRequest = {
	id: number;
	jsonrpc: "2.0";
	method: string;
	params: unknown[];
};

export type EvmJsonRpcResponse<Result = string> = {
	id: number;
	jsonrpc: "2.0";
	result?: Result;
	error?: {
		code: number;
		message: string;
	};
};

export type SolanaJsonRpcRequest = EvmJsonRpcRequest;

export type SolanaJsonRpcResponse<Result> = EvmJsonRpcResponse<Result>;

export type AlchemyTokenBalance = {
	contractAddress: string;
	tokenBalance: string | null;
	error?: string | null;
};

export type AlchemyTokenBalancesResponse = {
	address: string;
	tokenBalances: AlchemyTokenBalance[];
};

export type AlchemyTokenMetadataResponse = {
	decimals?: number | null;
	logo?: string | null;
	name?: string | null;
	symbol?: string | null;
};

export type SolanaTokenAccountsByOwnerResponse = {
	context: {
		slot: number;
	};
	value: {
		account: {
			data: {
				parsed?: {
					info?: {
						mint?: string;
						tokenAmount?: {
							amount?: string;
							decimals?: number;
							uiAmountString?: string;
						};
					};
				};
			};
		};
		pubkey: string;
	}[];
};

export type GoldRushTokenBalanceItem = {
	balance?: string;
	chain_display_name?: string;
	chain_id: number;
	chain_name?: string;
	contract_address?: string | null;
	contract_decimals?: number | null;
	contract_display_name?: string;
	contract_name?: string;
	contract_ticker_symbol?: string;
	is_native_token?: boolean;
	is_spam?: boolean;
	logo_urls?: {
		chain_logo_url?: string;
		protocol_logo_url?: string;
		token_logo_url?: string;
	};
	quote?: number | null;
	quote_rate?: number | null;
};

export type GoldRushMultichainBalancesResponse = {
	data?: {
		items?: GoldRushTokenBalanceItem[];
	};
	items?: GoldRushTokenBalanceItem[];
	quote_currency?: string;
	updated_at?: string;
};
