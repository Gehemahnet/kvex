import { getCachedValue } from "../../common/cache.utils";
import { log } from "../../common/logger";
import { InternalServerError } from "../../server/http/http-errors";
import { createEvmJsonRpcClient, type EvmJsonRpcClient } from "./evm-json-rpc.client";
import {
	createSolanaJsonRpcClient,
	type SolanaJsonRpcClient,
} from "./solana-json-rpc.client";
import {
	decodeErc20Decimals,
	decodeErc20Symbol,
	decodeEvmUint256,
	encodeErc20BalanceOfCall,
	formatTokenUnits,
	normalizeEvmAddress,
} from "./evm-wallet-balances.utils";
import {
	ALCHEMY_API_KEY_ENV,
	ALCHEMY_EVM_CHAINS,
	type AlchemyEvmChainConfig,
	ALCHEMY_SOLANA_MAINNET_RPC_URL_PREFIX,
	ALL_WALLET_TOKENS,
	DEFAULT_ALCHEMY_EVM_CHAIN,
	DEV_EVM_RPC_URL,
	DEV_SOLANA_RPC_URL,
	GOLDRUSH_ALLCHAINS_BALANCES_URL,
	GOLDRUSH_API_KEY_ENV,
	GOLDRUSH_PORTFOLIO_BALANCES_CACHE_TTL_MS,
	GOLDRUSH_PORTFOLIO_CHAIN_IDS,
	GOLDRUSH_PORTFOLIO_REQUEST_TIMEOUT_MS,
	NATIVE_WALLET_TOKEN,
	SOLANA_TOKEN_PROGRAM_ID,
} from "./wallet-balances.constants";
import type {
	AlchemyTokenBalancesResponse,
	AlchemyTokenMetadataResponse,
	GoldRushMultichainBalancesResponse,
	GoldRushTokenBalanceItem,
	SolanaTokenAccountsByOwnerResponse,
	WalletBalanceError,
	WalletBalancesQuery,
	WalletBalancesResponse,
	WalletBalanceTokenInput,
	WalletTokenBalance,
} from "./wallet-balances.types";

const NATIVE_EVM_DECIMALS = 18;
const ERC20_DECIMALS_SELECTOR = "0x313ce567";
const ERC20_SYMBOL_SELECTOR = "0x95d89b41";

/** Returns wallet balances for requested public wallet tokens. */
export const getWalletBalances = async (
	query: WalletBalancesQuery,
	dependencies: {
		alchemyApiKey?: string;
		evmRpcClient?: EvmJsonRpcClient;
		evmRpcClients?: AlchemyEvmRpcClient[];
		evmRpcUrl?: string;
		fetch?: typeof fetch;
		goldRushApiKey?: string;
		solanaRpcClient?: SolanaJsonRpcClient;
		solanaRpcUrl?: string;
	} = {},
): Promise<WalletBalancesResponse> => {
	const startedAt = performance.now();
	const alchemyApiKey = resolveAlchemyApiKey(dependencies.alchemyApiKey);
	const goldRushApiKey = resolveGoldRushApiKey(dependencies.goldRushApiKey);
	const shouldReadAllTokens = query.tokens.includes(ALL_WALLET_TOKENS);
	const networks = query.networks ?? [query.network];
	const addressesByNetwork = query.addressesByNetwork ?? {
		[query.network]: query.addresses,
	};
	const shouldReadEvm = networks.includes("evm") &&
		(addressesByNetwork.evm?.length ?? 0) > 0;
	const shouldReadSolana = networks.includes("solana") &&
		(addressesByNetwork.solana?.length ?? 0) > 0;
	const alchemyEvmClients = shouldReadAllTokens && shouldReadEvm
		? dependencies.evmRpcClients ??
			createAlchemyEvmRpcClients(alchemyApiKey, dependencies.evmRpcClient)
		: [];
	const evmRpcClient = shouldReadEvm
		? dependencies.evmRpcClient ??
			createEvmRpcClientFromEnvironment(
				shouldReadAllTokens
					? alchemyEvmClients[0]?.rpcUrl
					: dependencies.evmRpcUrl,
			)
		: undefined;
	const solanaRpcClient = shouldReadSolana
		? dependencies.solanaRpcClient ??
			createSolanaRpcClientFromEnvironment(
				shouldReadAllTokens
					? createAlchemySolanaRpcUrl(alchemyApiKey)
					: dependencies.solanaRpcUrl,
			)
		: undefined;
	const balances: WalletTokenBalance[] = [];
	const errors: WalletBalanceError[] = [];
	const results = await Promise.all(
		networks.flatMap((network) =>
			(addressesByNetwork[network] ?? []).map((address) =>
				readWalletBalancesForAddress({
					address,
					alchemyEvmClients,
					evmRpcClient,
					fetcher: dependencies.fetch,
					goldRushApiKey,
					network,
					shouldReadAllTokens,
					solanaRpcClient,
					tokens: query.tokens,
				}),
			),
		),
	);

	balances.push(...results.flatMap((result) => result.balances));
	errors.push(...results.flatMap((result) => result.errors));

	log("info", "wallet_balances_completed", {
		addressesCount: query.addresses.length,
		balancesCount: balances.length,
		durationMs: roundDurationMs(performance.now() - startedAt),
		errorsCount: errors.length,
		networks: networks.join(","),
		tokens: query.tokens.join(","),
	});

	return {
		...query,
		balances,
		errors,
	};
};

type WalletBalanceDiscoveryResult = {
	balances: WalletTokenBalance[];
	errors: WalletBalanceError[];
};

type WalletAddressBalanceParams = {
	address: string;
	alchemyEvmClients: AlchemyEvmRpcClient[];
	evmRpcClient?: EvmJsonRpcClient;
	fetcher?: typeof fetch;
	goldRushApiKey?: string;
	network: WalletBalancesQuery["network"];
	shouldReadAllTokens: boolean;
	solanaRpcClient?: SolanaJsonRpcClient;
	tokens: WalletBalanceTokenInput[];
};

const readWalletBalancesForAddress = async ({
	address,
	alchemyEvmClients,
	evmRpcClient,
	fetcher,
	goldRushApiKey,
	network,
	shouldReadAllTokens,
	solanaRpcClient,
	tokens,
}: WalletAddressBalanceParams): Promise<WalletBalanceDiscoveryResult> => {
	const startedAt = performance.now();

	if (shouldReadAllTokens) {
		try {
			if (network === "evm") {
				const discoveryResult = goldRushApiKey
					? await getGoldRushEvmTokenBalances({
						address,
						apiKey: goldRushApiKey,
						fetcher,
					})
					: await getAllAlchemyEvmTokenBalances(
						alchemyEvmClients,
						assertEvmRpcClient(evmRpcClient),
						address,
					);

				if (
					!goldRushApiKey ||
					discoveryResult.errors.length === 0 ||
					!shouldFallbackToAlchemy(discoveryResult)
				) {
					logWalletProviderTiming({
						address,
						durationMs: performance.now() - startedAt,
						network,
						provider: goldRushApiKey ? "goldrush" : "alchemy",
						result: discoveryResult,
					});
					return discoveryResult;
				}

				const fallbackClients = getGoldRushFallbackAlchemyClients(
					discoveryResult,
					alchemyEvmClients,
				);

				if (fallbackClients.length === 0) {
					logWalletProviderTiming({
						address,
						durationMs: performance.now() - startedAt,
						network,
						provider: "goldrush",
						result: discoveryResult,
					});
					return discoveryResult;
				}

				const fallbackStartedAt = performance.now();
				const fallbackResult = await getAllAlchemyEvmTokenBalances(
					fallbackClients,
					assertEvmRpcClient(evmRpcClient),
					address,
				);
				logWalletProviderTiming({
					address,
					durationMs: performance.now() - fallbackStartedAt,
					network,
					provider: "alchemy_fallback",
					result: fallbackResult,
				});

				const result = {
					balances: [...discoveryResult.balances, ...fallbackResult.balances],
					errors: [...discoveryResult.errors, ...fallbackResult.errors],
				};

				logWalletProviderTiming({
					address,
					durationMs: performance.now() - startedAt,
					network,
					provider: "goldrush_with_fallback",
					result,
				});

				return result;
			}

			const result = {
				balances: await getAllSolanaTokenBalances(
					assertSolanaRpcClient(solanaRpcClient),
					address,
				),
				errors: [],
			};

			logWalletProviderTiming({
				address,
				durationMs: performance.now() - startedAt,
				network,
				provider: "solana",
				result,
			});

			return result;
		} catch (error) {
			const result = {
				balances: [],
				errors: [{
					address,
					token: ALL_WALLET_TOKENS,
					code: "BALANCE_FETCH_FAILED",
					message: error instanceof Error ? error.message : "Unable to fetch balances",
				}],
			};

			logWalletProviderTiming({
				address,
				durationMs: performance.now() - startedAt,
				network,
				provider: network,
				result,
			});

			return result;
		}
	}

	const tokenResults = await Promise.all(
		tokens.map(async (token): Promise<WalletBalanceDiscoveryResult> => {
			try {
				return {
					balances: [
						network === "evm"
							? await getEvmTokenBalance(assertEvmRpcClient(evmRpcClient), address, token)
							: await getSolanaTokenBalance(
								assertSolanaRpcClient(solanaRpcClient),
								address,
								token,
							),
					],
					errors: [],
				};
			} catch (error) {
				return {
					balances: [],
					errors: [{
						address,
						token,
						code: "BALANCE_FETCH_FAILED",
						message: error instanceof Error ? error.message : "Unable to fetch balance",
					}],
				};
			}
		}),
	);

	const result = {
		balances: tokenResults.flatMap((result) => result.balances),
		errors: tokenResults.flatMap((result) => result.errors),
	};

	logWalletProviderTiming({
		address,
		durationMs: performance.now() - startedAt,
		network,
		provider: `${network}_tokens`,
		result,
	});

	return result;
};

const shouldFallbackToAlchemy = (result: WalletBalanceDiscoveryResult): boolean =>
	result.errors.some((error) =>
		error.code === "GOLDRUSH_BALANCE_FETCH_FAILED"
	);

const getGoldRushFallbackAlchemyClients = (
	result: WalletBalanceDiscoveryResult,
	alchemyEvmClients: AlchemyEvmRpcClient[],
): AlchemyEvmRpcClient[] => {
	const failedChainIds = new Set(
		result.errors
			.filter((error) => error.code === "GOLDRUSH_BALANCE_FETCH_FAILED")
			.map((error) => error.chainId)
			.filter((chainId): chainId is number => typeof chainId === "number"),
	);

	if (failedChainIds.size === 0) {
		return alchemyEvmClients;
	}

	return alchemyEvmClients.filter(({ chain }) => failedChainIds.has(chain.chainId));
};

const logWalletProviderTiming = ({
	address,
	durationMs,
	network,
	provider,
	result,
}: {
	address: string;
	durationMs: number;
	network: WalletBalancesQuery["network"];
	provider: string;
	result: WalletBalanceDiscoveryResult;
}): void => {
	log("info", "wallet_balances_provider_completed", {
		address: maskWalletAddress(address),
		balancesCount: result.balances.length,
		durationMs: roundDurationMs(durationMs),
		errorsCount: result.errors.length,
		network,
		provider,
	});
};

const maskWalletAddress = (address: string): string =>
	address.length > 14 ? `${address.slice(0, 6)}...${address.slice(-4)}` : address;

const roundDurationMs = (durationMs: number): number =>
	Math.round(durationMs * 100) / 100;

const createEvmRpcClientFromEnvironment = (
	rpcUrl = resolveEvmRpcUrl(),
): EvmJsonRpcClient => {
	if (!rpcUrl) {
		throw new InternalServerError("EVM RPC URL is not configured");
	}

	return createEvmJsonRpcClient(rpcUrl);
};

const createSolanaRpcClientFromEnvironment = (
	rpcUrl = resolveSolanaRpcUrl(),
): SolanaJsonRpcClient => {
	if (!rpcUrl) {
		throw new InternalServerError("Solana RPC URL is not configured");
	}

	return createSolanaJsonRpcClient(rpcUrl);
};

/** Resolves the Alchemy API key without exposing or reading secret files directly. */
export const resolveAlchemyApiKey = (apiKey = process.env[ALCHEMY_API_KEY_ENV]): string | undefined => {
	const normalizedApiKey = apiKey?.trim();

	return normalizedApiKey || undefined;
};

/** Resolves the GoldRush API key without reading secret files directly. */
export const resolveGoldRushApiKey = (
	apiKey = process.env[GOLDRUSH_API_KEY_ENV],
): string | undefined => {
	const normalizedApiKey = apiKey?.trim();

	return normalizedApiKey || undefined;
};

export type AlchemyEvmRpcClient = {
	chain: AlchemyEvmChainConfig;
	client: EvmJsonRpcClient;
	rpcUrl?: string;
};

type GoldRushEvmBalancesParams = {
	address: string;
	apiKey: string;
	fetcher?: typeof fetch;
};

const getGoldRushEvmTokenBalances = async (
	params: GoldRushEvmBalancesParams,
): Promise<WalletBalanceDiscoveryResult> => {
	const settledResults = await Promise.allSettled(
		GOLDRUSH_PORTFOLIO_CHAIN_IDS.map((chainId) =>
			getCachedValue(
				createGoldRushPortfolioCacheKey(params.address, chainId),
				GOLDRUSH_PORTFOLIO_BALANCES_CACHE_TTL_MS,
				() => fetchGoldRushEvmTokenBalances({
					...params,
					chainId,
				}),
			),
		),
	);

	return settledResults.reduce<WalletBalanceDiscoveryResult>(
		(result, settledResult, index) => {
			if (settledResult.status === "fulfilled") {
				result.balances.push(...settledResult.value.balances);
				result.errors.push(...settledResult.value.errors);
				return result;
			}

			result.errors.push({
				address: params.address,
				chainId: GOLDRUSH_PORTFOLIO_CHAIN_IDS[index],
				token: ALL_WALLET_TOKENS,
				code: "GOLDRUSH_BALANCE_FETCH_FAILED",
				message: `GoldRush chain ${GOLDRUSH_PORTFOLIO_CHAIN_IDS[index]} failed: ${settledResult.reason instanceof Error ? settledResult.reason.message : "Unknown error"}`,
			});

			return result;
		},
		{ balances: [], errors: [] },
	);
};

/** Reads priced, anti-spam-filtered multichain EVM balances from GoldRush. */
const fetchGoldRushEvmTokenBalances = async ({
	address,
	apiKey,
	chainId,
	fetcher = fetch,
}: GoldRushEvmBalancesParams & { chainId: number }): Promise<WalletBalanceDiscoveryResult> => {
	const startedAt = performance.now();
	try {
		const url = createGoldRushBalancesUrl(address, chainId);
		const response = await fetchWithTimeout(fetcher, url, {
			headers: {
				Authorization: `Bearer ${apiKey}`,
			},
			timeoutMs: GOLDRUSH_PORTFOLIO_REQUEST_TIMEOUT_MS,
		});
		const durationMs = performance.now() - startedAt;

		if (!response.ok) {
			log("warn", "goldrush_allchains_completed", {
				address: maskWalletAddress(address),
				chainIds: String(chainId),
				durationMs: roundDurationMs(durationMs),
				status: response.status,
			});
			throw new Error(`GoldRush HTTP ${response.status}`);
		}

		const body = await response.json() as GoldRushMultichainBalancesResponse;
		const items = getGoldRushBalanceItems(body);
		log("info", "goldrush_allchains_completed", {
			address: maskWalletAddress(address),
			chainIds: String(chainId),
			durationMs: roundDurationMs(durationMs),
			itemsCount: items.length,
			status: response.status,
		});

		return {
			balances: items.flatMap((item) =>
				mapGoldRushTokenBalance(address, item),
			),
			errors: [],
		};
	} catch (error) {
		return {
			balances: [],
			errors: [
				{
					address,
					chainId,
					token: ALL_WALLET_TOKENS,
					code: "GOLDRUSH_BALANCE_FETCH_FAILED",
					message: error instanceof Error ? error.message : "Unable to fetch GoldRush balances",
				},
			],
		};
	}
};

const fetchWithTimeout = async (
	fetcher: typeof fetch,
	url: string,
	options: {
		headers: Record<string, string>;
		timeoutMs: number;
	},
): Promise<Response> => {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), options.timeoutMs);

	try {
		return await fetcher(url, {
			headers: options.headers,
			signal: controller.signal,
		});
	} catch (error) {
		if (error instanceof Error && error.name === "AbortError") {
			throw new Error(`GoldRush request timed out after ${options.timeoutMs}ms`);
		}

		throw error;
	} finally {
		clearTimeout(timeout);
	}
};

const createGoldRushPortfolioCacheKey = (address: string, chainId: number): string =>
	`portfolio:goldrush:${address.toLowerCase()}:${chainId}`;

const createGoldRushBalancesUrl = (address: string, chainId: number): string => {
	const url = new URL(
		`${GOLDRUSH_ALLCHAINS_BALANCES_URL}/${encodeURIComponent(address)}/balances/`,
	);

	url.searchParams.set("chains", String(chainId));
	url.searchParams.set("quote-currency", "USD");

	return url.toString();
};

const getGoldRushBalanceItems = (
	body: GoldRushMultichainBalancesResponse,
): GoldRushTokenBalanceItem[] =>
	body.items ?? body.data?.items ?? [];

const mapGoldRushTokenBalance = (
	address: string,
	item: GoldRushTokenBalanceItem,
): WalletTokenBalance[] => {
	if (!item.quote || item.quote <= 0 || !item.quote_rate || item.quote_rate <= 0) {
		return [];
	}

	const decimals = item.contract_decimals ?? 18;
	const token = item.is_native_token ? NATIVE_WALLET_TOKEN : item.contract_address.toLowerCase();
	const symbol = item.contract_ticker_symbol?.trim();

	return [{
		token,
		...(item.is_native_token ? {} : { tokenAddress: item.contract_address.toLowerCase() }),
		rawBalance: item.balance,
		formattedBalance: formatTokenUnits(item.balance, decimals),
		decimals,
		...(item.is_spam ? { isSpam: true } : {}),
		...(item.logo_urls?.token_logo_url ? { logoUrl: item.logo_urls.token_logo_url } : {}),
		source: {
			type: "wallet",
			network: "evm",
			address,
			chainId: item.chain_id,
			...(item.chain_name ? { chainKey: item.chain_name } : {}),
			...(item.chain_display_name ? { chainName: item.chain_display_name } : {}),
		},
		...(symbol ? { symbol } : {}),
		valueUsd: item.quote,
		priceUsd: item.quote_rate,
	}];
};

const createAlchemyEvmRpcClients = (
	apiKey: string | undefined,
	fallbackClient?: EvmJsonRpcClient,
): AlchemyEvmRpcClient[] => {
	if (fallbackClient) {
		return [{
			chain: DEFAULT_ALCHEMY_EVM_CHAIN,
			client: fallbackClient,
		}];
	}

	return ALCHEMY_EVM_CHAINS
		.map((chain) => {
			const rpcUrl = createAlchemyEvmRpcUrl(apiKey, chain);

			return rpcUrl
				? {
					chain,
					client: createEvmJsonRpcClient(rpcUrl),
					rpcUrl,
				}
				: undefined;
		})
		.filter((client): client is AlchemyEvmRpcClient => client !== undefined);
};

const createAlchemyEvmRpcUrl = (
	apiKey: string | undefined,
	chain: AlchemyEvmChainConfig,
): string | undefined =>
	apiKey ? `${chain.rpcUrlPrefix}/${apiKey}` : undefined;

const createAlchemySolanaRpcUrl = (apiKey: string | undefined): string | undefined =>
	apiKey ? `${ALCHEMY_SOLANA_MAINNET_RPC_URL_PREFIX}/${apiKey}` : undefined;

/** Resolves the EVM RPC URL, using a public node only in local dev mode. */
export const resolveEvmRpcUrl = (
	params: {
		nodeEnv?: string;
		rpcUrl?: string;
	} = {},
): string | undefined => {
	const rpcUrl = params.rpcUrl ?? process.env.EVM_RPC_URL;
	const normalizedRpcUrl = rpcUrl?.trim();

	if (normalizedRpcUrl) {
		return normalizedRpcUrl;
	}

	const nodeEnv = params.nodeEnv ?? process.env.NODE_ENV;

	return nodeEnv === "production" ? undefined : DEV_EVM_RPC_URL;
};

/** Resolves the Solana RPC URL, using a public node only in local dev mode. */
export const resolveSolanaRpcUrl = (
	params: {
		nodeEnv?: string;
		rpcUrl?: string;
	} = {},
): string | undefined => {
	const rpcUrl = params.rpcUrl ?? process.env.SOLANA_RPC_URL;
	const normalizedRpcUrl = rpcUrl?.trim();

	if (normalizedRpcUrl) {
		return normalizedRpcUrl;
	}

	const nodeEnv = params.nodeEnv ?? process.env.NODE_ENV;

	return nodeEnv === "production" ? undefined : DEV_SOLANA_RPC_URL;
};

const assertEvmRpcClient = (
	evmRpcClient: EvmJsonRpcClient | undefined,
): EvmJsonRpcClient => {
	if (!evmRpcClient) {
		throw new InternalServerError("EVM RPC client is not configured");
	}

	return evmRpcClient;
};

const assertSolanaRpcClient = (
	solanaRpcClient: SolanaJsonRpcClient | undefined,
): SolanaJsonRpcClient => {
	if (!solanaRpcClient) {
		throw new InternalServerError("Solana RPC client is not configured");
	}

	return solanaRpcClient;
};

const getEvmTokenBalance = async (
	evmRpcClient: EvmJsonRpcClient,
	address: string,
	token: WalletBalanceTokenInput,
): Promise<WalletTokenBalance> =>
	token === NATIVE_WALLET_TOKEN
		? getNativeBalance(evmRpcClient, "evm", address)
		: getErc20Balance(evmRpcClient, "evm", address, token, DEFAULT_ALCHEMY_EVM_CHAIN);

const getAllAlchemyEvmTokenBalances = async (
	alchemyEvmClients: AlchemyEvmRpcClient[],
	fallbackClient: EvmJsonRpcClient,
	address: string,
): Promise<WalletBalanceDiscoveryResult> => {
	const clients = alchemyEvmClients.length
		? alchemyEvmClients
		: [{
			chain: DEFAULT_ALCHEMY_EVM_CHAIN,
			client: fallbackClient,
		}];
	const results = await Promise.all(
		clients.map(({ chain, client }) => getAllEvmTokenBalancesForChain(
			client,
			address,
			chain,
		)),
	);

	return {
		balances: results.flatMap((result) => result.balances),
		errors: results.flatMap((result) => result.errors),
	};
};

const getAllEvmTokenBalancesForChain = async (
	evmRpcClient: EvmJsonRpcClient,
	address: string,
	chain: AlchemyEvmChainConfig,
): Promise<WalletBalanceDiscoveryResult> => {
	try {
		return {
			balances: await getAllEvmTokenBalances(evmRpcClient, address, chain),
			errors: [],
		};
	} catch (error) {
		return {
			balances: [],
			errors: [
				{
					address,
					token: ALL_WALLET_TOKENS,
					code: "CHAIN_BALANCE_FETCH_FAILED",
					message: `${chain.name}: ${
						error instanceof Error ? error.message : "Unable to fetch balances"
					}`,
				},
			],
		};
	}
};

const getAllEvmTokenBalances = async (
	evmRpcClient: EvmJsonRpcClient,
	address: string,
	chain: AlchemyEvmChainConfig = DEFAULT_ALCHEMY_EVM_CHAIN,
): Promise<WalletTokenBalance[]> => {
	const [nativeBalance, tokenBalancesResponse] = await Promise.all([
		getNativeBalance(evmRpcClient, "evm", address, chain),
		evmRpcClient.call<AlchemyTokenBalancesResponse>(
			"alchemy_getTokenBalances",
			[address, "erc20"],
		),
	]);
	const tokenBalances = await Promise.all(
		tokenBalancesResponse.tokenBalances
			.filter((balance) => isNonZeroAlchemyTokenBalance(balance.tokenBalance))
			.map((balance) =>
				createAlchemyEvmTokenBalance(
					evmRpcClient,
					address,
					normalizeEvmAddress(balance.contractAddress),
					balance.tokenBalance ?? "0x0",
					chain,
				),
			),
	);

	return [nativeBalance, ...tokenBalances];
};

const createAlchemyEvmTokenBalance = async (
	evmRpcClient: EvmJsonRpcClient,
	address: string,
	tokenAddress: string,
	rawHexBalance: string,
	chain: AlchemyEvmChainConfig,
): Promise<WalletTokenBalance> => {
	const metadata = await evmRpcClient.call<AlchemyTokenMetadataResponse>(
		"alchemy_getTokenMetadata",
		[tokenAddress],
	);
	const rawBalance = decodeEvmUint256(rawHexBalance);
	const decimals = metadata.decimals ?? 18;

	return {
		token: tokenAddress,
		tokenAddress,
		rawBalance,
		formattedBalance: formatTokenUnits(rawBalance, decimals),
		decimals,
		...(metadata.logo ? { logoUrl: metadata.logo } : {}),
		source: createWalletBalanceSource("evm", address, chain),
		...(metadata.symbol ? { symbol: metadata.symbol } : {}),
	};
};

const isNonZeroAlchemyTokenBalance = (tokenBalance: string | null): boolean => {
	if (!tokenBalance) {
		return false;
	}

	return BigInt(tokenBalance) > 0n;
};

type SolanaGetBalanceResult = {
	context: {
		slot: number;
	};
	value: number;
};

const getSolanaTokenBalance = async (
	solanaRpcClient: SolanaJsonRpcClient,
	address: string,
	token: WalletBalanceTokenInput,
): Promise<WalletTokenBalance> => {
	if (token !== NATIVE_WALLET_TOKEN) {
		throw new Error("Solana wallet balances currently support only native SOL");
	}

	const result = await solanaRpcClient.call<SolanaGetBalanceResult>(
		"getBalance",
		[address],
	);
	const rawBalance = String(result.value);

	return {
		token: NATIVE_WALLET_TOKEN,
		rawBalance,
		formattedBalance: formatTokenUnits(rawBalance, 9),
		decimals: 9,
		source: createWalletBalanceSource("solana", address),
		symbol: "SOL",
	};
};

const getAllSolanaTokenBalances = async (
	solanaRpcClient: SolanaJsonRpcClient,
	address: string,
): Promise<WalletTokenBalance[]> => {
	const [nativeBalance, tokenAccounts] = await Promise.all([
		getSolanaTokenBalance(solanaRpcClient, address, NATIVE_WALLET_TOKEN),
		solanaRpcClient.call<SolanaTokenAccountsByOwnerResponse>(
			"getTokenAccountsByOwner",
			[
				address,
				{ programId: SOLANA_TOKEN_PROGRAM_ID },
				{ encoding: "jsonParsed" },
			],
		),
	]);
	const splBalances = tokenAccounts.value
		.map((account) => createSolanaSplTokenBalance(address, account))
		.filter((balance): balance is WalletTokenBalance => balance !== undefined);

	return [nativeBalance, ...splBalances];
};

const createSolanaSplTokenBalance = (
	address: string,
	account: SolanaTokenAccountsByOwnerResponse["value"][number],
): WalletTokenBalance | undefined => {
	const info = account.account.data.parsed?.info;
	const mint = info?.mint;
	const tokenAmount = info?.tokenAmount;
	const rawBalance = tokenAmount?.amount;
	const decimals = tokenAmount?.decimals;

	if (!mint || !rawBalance || decimals === undefined || BigInt(rawBalance) <= 0n) {
		return undefined;
	}

	return {
		token: mint,
		tokenAddress: mint,
		rawBalance,
		formattedBalance: tokenAmount.uiAmountString ?? formatTokenUnits(rawBalance, decimals),
		decimals,
		source: createWalletBalanceSource("solana", address),
	};
};

const getNativeBalance = async (
	evmRpcClient: EvmJsonRpcClient,
	network: WalletBalancesQuery["network"],
	address: string,
	chain: AlchemyEvmChainConfig = DEFAULT_ALCHEMY_EVM_CHAIN,
): Promise<WalletTokenBalance> => {
	const rawBalance = decodeEvmUint256(
		await evmRpcClient.call("eth_getBalance", [address, "latest"]),
	);

	return {
		token: NATIVE_WALLET_TOKEN,
		rawBalance,
		formattedBalance: formatTokenUnits(rawBalance, NATIVE_EVM_DECIMALS),
		decimals: NATIVE_EVM_DECIMALS,
		source: createWalletBalanceSource(network, address, chain),
		symbol: chain.nativeSymbol,
	};
};

const getErc20Balance = async (
	evmRpcClient: EvmJsonRpcClient,
	network: WalletBalancesQuery["network"],
	address: string,
	tokenAddress: string,
	chain?: AlchemyEvmChainConfig,
): Promise<WalletTokenBalance> => {
	const normalizedTokenAddress = normalizeEvmAddress(tokenAddress);
	const [rawBalance, decimals, symbol] = await Promise.all([
		getErc20RawBalance(evmRpcClient, address, normalizedTokenAddress),
		getErc20Decimals(evmRpcClient, normalizedTokenAddress),
		getErc20Symbol(evmRpcClient, normalizedTokenAddress),
	]);

	return {
		token: normalizedTokenAddress,
		tokenAddress: normalizedTokenAddress,
		rawBalance,
		formattedBalance: formatTokenUnits(rawBalance, decimals),
		decimals,
		source: createWalletBalanceSource(network, address, chain),
		...(symbol ? { symbol } : {}),
	};
};

const createWalletBalanceSource = (
	network: WalletBalancesQuery["network"],
	address: string,
	chain?: AlchemyEvmChainConfig,
) => ({
	type: "wallet" as const,
	network,
	address,
	...(chain
		? {
			chainId: chain.chainId,
			chainKey: chain.key,
			chainName: chain.name,
		}
		: {}),
});

const getErc20RawBalance = async (
	evmRpcClient: EvmJsonRpcClient,
	address: string,
	tokenAddress: string,
): Promise<string> =>
	decodeEvmUint256(
		await evmRpcClient.call("eth_call", [
			{
				to: tokenAddress,
				data: encodeErc20BalanceOfCall(address),
			},
			"latest",
		]),
	);

const getErc20Decimals = async (
	evmRpcClient: EvmJsonRpcClient,
	tokenAddress: string,
): Promise<number> =>
	decodeErc20Decimals(
		await evmRpcClient.call("eth_call", [
			{
				to: tokenAddress,
				data: ERC20_DECIMALS_SELECTOR,
			},
			"latest",
		]),
	);

const getErc20Symbol = async (
	evmRpcClient: EvmJsonRpcClient,
	tokenAddress: string,
): Promise<string | undefined> => {
	try {
		return decodeErc20Symbol(
			await evmRpcClient.call("eth_call", [
				{
					to: tokenAddress,
					data: ERC20_SYMBOL_SELECTOR,
				},
				"latest",
			]),
		);
	} catch {
		return undefined;
	}
};
