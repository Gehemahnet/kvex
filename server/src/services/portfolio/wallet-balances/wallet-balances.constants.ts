import type {
	WalletBalanceNetwork,
	WalletBalanceTokenInput,
} from "#services/portfolio/wallet-balances/wallet-balances.types";

export const DEFAULT_WALLET_BALANCE_NETWORK: WalletBalanceNetwork = "evm";
export const ALL_WALLET_TOKENS: WalletBalanceTokenInput = "all";
export const NATIVE_WALLET_TOKEN: WalletBalanceTokenInput = "native";
export const DEV_EVM_RPC_URL = "https://ethereum-rpc.publicnode.com";
export const DEV_SOLANA_RPC_URL = "https://api.mainnet-beta.solana.com";
export const ALCHEMY_API_KEY_ENV = "ALCHEMY_API_KEY";
export const GOLDRUSH_API_KEY_ENV = "GOLDRUSH_API_KEY";
export const GOLDRUSH_PORTFOLIO_BALANCES_CACHE_TTL_MS = 180_000;
export const GOLDRUSH_PORTFOLIO_CHAIN_IDS = [
	1,
	10,
	137,
	8453,
	42161,
	999,
];
export const ALCHEMY_SOLANA_MAINNET_RPC_URL_PREFIX =
	"https://solana-mainnet.g.alchemy.com/v2";
export const SOLANA_TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";

export type AlchemyEvmChainConfig = {
	chainId: number;
	key: string;
	name: string;
	nativeSymbol: string;
	rpcUrlPrefix: string;
};

export const ALCHEMY_EVM_CHAINS: AlchemyEvmChainConfig[] = [
	{
		chainId: 1,
		key: "ethereum",
		name: "Ethereum",
		nativeSymbol: "ETH",
		rpcUrlPrefix: "https://eth-mainnet.g.alchemy.com/v2",
	},
	{
		chainId: 137,
		key: "polygon",
		name: "Polygon",
		nativeSymbol: "MATIC",
		rpcUrlPrefix: "https://polygon-mainnet.g.alchemy.com/v2",
	},
	{
		chainId: 42161,
		key: "arbitrum",
		name: "Arbitrum",
		nativeSymbol: "ETH",
		rpcUrlPrefix: "https://arb-mainnet.g.alchemy.com/v2",
	},
	{
		chainId: 10,
		key: "optimism",
		name: "Optimism",
		nativeSymbol: "ETH",
		rpcUrlPrefix: "https://opt-mainnet.g.alchemy.com/v2",
	},
	{
		chainId: 8453,
		key: "base",
		name: "Base",
		nativeSymbol: "ETH",
		rpcUrlPrefix: "https://base-mainnet.g.alchemy.com/v2",
	},
];

export const DEFAULT_ALCHEMY_EVM_CHAIN = ALCHEMY_EVM_CHAINS[0] as AlchemyEvmChainConfig;
