import { describe, expect, it } from "vitest";
import {
	getWalletBalances,
	resolveEvmRpcUrl,
	resolveSolanaRpcUrl,
} from "../../src/services/portfolio/wallet-balances.service";
import {
	DEV_EVM_RPC_URL,
	DEV_SOLANA_RPC_URL,
	GOLDRUSH_PORTFOLIO_CHAIN_IDS,
} from "../../src/services/portfolio/wallet-balances.constants";
import type { EvmJsonRpcClient } from "../../src/services/portfolio/evm-json-rpc.client";
import type { SolanaJsonRpcClient } from "../../src/services/portfolio/solana-json-rpc.client";
import type { AlchemyEvmChainConfig } from "../../src/services/portfolio/wallet-balances.constants";

const ADDRESS = "0x1111111111111111111111111111111111111111";
const SECOND_ADDRESS = "0x3333333333333333333333333333333333333333";
const THIRD_ADDRESS = "0x4444444444444444444444444444444444444444";
const FOURTH_ADDRESS = "0x5555555555555555555555555555555555555555";
const SOLANA_ADDRESS = "11111111111111111111111111111111";
const TOKEN = "0x2222222222222222222222222222222222222222";

describe("getWalletBalances", () => {
	it("uses an explicit EVM RPC URL before the dev fallback", () => {
		expect(resolveEvmRpcUrl({
			nodeEnv: "development",
			rpcUrl: " https://rpc.example ",
		})).toBe("https://rpc.example");
	});

	it("uses a public EVM RPC URL only outside production", () => {
		expect(resolveEvmRpcUrl({ nodeEnv: "development" })).toBe(DEV_EVM_RPC_URL);
		expect(resolveEvmRpcUrl({ nodeEnv: undefined })).toBe(DEV_EVM_RPC_URL);
		expect(resolveEvmRpcUrl({ nodeEnv: "production" })).toBeUndefined();
	});

	it("uses a public Solana RPC URL only outside production", () => {
		expect(resolveSolanaRpcUrl({ nodeEnv: "development" })).toBe(DEV_SOLANA_RPC_URL);
		expect(resolveSolanaRpcUrl({ nodeEnv: undefined })).toBe(DEV_SOLANA_RPC_URL);
		expect(resolveSolanaRpcUrl({ nodeEnv: "production" })).toBeUndefined();
	});

	it("returns native and ERC-20 balances from an EVM JSON-RPC client", async () => {
		const calls: string[] = [];
		const evmRpcClient: EvmJsonRpcClient = {
			async call<Result = string>(method: string, params: unknown[]): Promise<Result> {
				calls.push(`${method}:${JSON.stringify(params)}`);

				if (method === "eth_getBalance") {
					return "0xde0b6b3a7640000" as Result;
				}

				const [request] = params as [{ data: string }];

				if (request.data.startsWith("0x70a08231")) {
					return "0x000000000000000000000000000000000000000000000000000000000012d687" as Result;
				}

				if (request.data === "0x313ce567") {
					return "0x06" as Result;
				}

				if (request.data === "0x95d89b41") {
					return (
						"0x0000000000000000000000000000000000000000000000000000000000000020" +
						"0000000000000000000000000000000000000000000000000000000000000004" +
						"5553444300000000000000000000000000000000000000000000000000000000"
					) as Result;
				}

				throw new Error("Unexpected call");
			},
		};

		const result = await getWalletBalances(
			{
				address: ADDRESS,
				addresses: [ADDRESS],
				network: "evm",
				tokens: ["native", TOKEN],
			},
			{ evmRpcClient },
		);

		expect(result).toEqual({
			address: ADDRESS,
			addresses: [ADDRESS],
			network: "evm",
			tokens: ["native", TOKEN],
			balances: [
				{
					token: "native",
					rawBalance: "1000000000000000000",
					formattedBalance: "1",
					decimals: 18,
					source: {
						type: "wallet",
						network: "evm",
						address: ADDRESS,
						chainId: 1,
						chainKey: "ethereum",
						chainName: "Ethereum",
					},
					symbol: "ETH",
				},
				{
					token: TOKEN,
					tokenAddress: TOKEN,
					rawBalance: "1234567",
					formattedBalance: "1.234567",
					decimals: 6,
					source: {
						type: "wallet",
						network: "evm",
						address: ADDRESS,
						chainId: 1,
						chainKey: "ethereum",
						chainName: "Ethereum",
					},
					symbol: "USDC",
				},
			],
			errors: [],
			sourceResults: [
				{
					address: ADDRESS,
					balancesCount: 2,
					errorsCount: 0,
					network: "evm",
					status: "success",
				},
			],
		});
		expect(calls).toHaveLength(4);
	});

	it("keeps successful balances when another token fails", async () => {
		const evmRpcClient: EvmJsonRpcClient = {
			async call<Result = string>(method: string): Promise<Result> {
				if (method === "eth_getBalance") {
					return "0x1" as Result;
				}

				throw new Error("RPC rejected token");
			},
		};

		const result = await getWalletBalances(
			{
				address: ADDRESS,
				addresses: [ADDRESS],
				network: "evm",
				tokens: ["native", TOKEN],
			},
			{ evmRpcClient },
		);

		expect(result.balances).toEqual([
			{
				token: "native",
				rawBalance: "1",
				formattedBalance: "0.000000000000000001",
				decimals: 18,
				source: {
					type: "wallet",
					network: "evm",
					address: ADDRESS,
					chainId: 1,
					chainKey: "ethereum",
					chainName: "Ethereum",
				},
				symbol: "ETH",
			},
		]);
		expect(result.errors).toEqual([
			{
				address: ADDRESS,
				token: TOKEN,
				code: "BALANCE_FETCH_FAILED",
				message: "RPC rejected token",
			},
		]);
	});

	it("reads every requested token for every requested wallet address", async () => {
		const secondAddress = "0x3333333333333333333333333333333333333333";
		const evmRpcClient: EvmJsonRpcClient = {
			async call<Result = string>(method: string): Promise<Result> {
				if (method === "eth_getBalance") {
					return "0x1" as Result;
				}

				throw new Error("Unexpected call");
			},
		};

		const result = await getWalletBalances(
			{
				address: ADDRESS,
				addresses: [ADDRESS, secondAddress],
				network: "evm",
				tokens: ["native"],
			},
			{ evmRpcClient },
		);

		expect(result.balances.map((balance) => balance.source.address)).toEqual([
			ADDRESS,
			secondAddress,
		]);
	});

	it("discovers all EVM ERC-20 balances through Alchemy", async () => {
		const evmRpcClient: EvmJsonRpcClient = {
			async call<Result = string>(method: string, params: unknown[]): Promise<Result> {
				if (method === "eth_getBalance") {
					return "0x1" as Result;
				}

				if (method === "alchemy_getTokenBalances") {
					expect(params).toEqual([ADDRESS, "erc20"]);

					return {
						address: ADDRESS,
						tokenBalances: [
							{
								contractAddress: TOKEN,
								tokenBalance: "0x0f4240",
							},
							{
								contractAddress: "0x4444444444444444444444444444444444444444",
								tokenBalance: "0x0",
							},
						],
					} as Result;
				}

				if (method === "alchemy_getTokenMetadata") {
					expect(params).toEqual([TOKEN]);

					return {
						decimals: 6,
						symbol: "USDC",
					} as Result;
				}

				throw new Error("Unexpected call");
			},
		};

		const result = await getWalletBalances(
			{
				address: ADDRESS,
				addresses: [ADDRESS],
				network: "evm",
				tokens: ["all"],
			},
			{ evmRpcClient },
		);

		expect(result.balances).toEqual([
			{
				token: "native",
				rawBalance: "1",
				formattedBalance: "0.000000000000000001",
				decimals: 18,
				source: {
					type: "wallet",
					network: "evm",
					address: ADDRESS,
					chainId: 1,
					chainKey: "ethereum",
					chainName: "Ethereum",
				},
				symbol: "ETH",
			},
			{
				token: TOKEN,
				tokenAddress: TOKEN,
				rawBalance: "1000000",
				formattedBalance: "1",
				decimals: 6,
				source: {
					type: "wallet",
					network: "evm",
					address: ADDRESS,
					chainId: 1,
					chainKey: "ethereum",
					chainName: "Ethereum",
				},
				symbol: "USDC",
			},
		]);
	});

	it("keeps EVM all-token results when one chain fails", async () => {
		const successfulClient: EvmJsonRpcClient = {
			async call<Result = string>(method: string): Promise<Result> {
				if (method === "eth_getBalance") {
					return "0x1" as Result;
				}

				if (method === "alchemy_getTokenBalances") {
					return {
						address: ADDRESS,
						tokenBalances: [],
					} as Result;
				}

				throw new Error("Unexpected call");
			},
		};
		const failingClient: EvmJsonRpcClient = {
			async call(): Promise<never> {
				throw new Error("HTTP 403");
			},
		};
		const ethereumChain: AlchemyEvmChainConfig = {
			chainId: 1,
			key: "ethereum",
			name: "Ethereum",
			nativeSymbol: "ETH",
			rpcUrlPrefix: "https://eth-mainnet.example",
		};
		const polygonChain: AlchemyEvmChainConfig = {
			chainId: 137,
			key: "polygon",
			name: "Polygon",
			nativeSymbol: "MATIC",
			rpcUrlPrefix: "https://polygon-mainnet.example",
		};

		const result = await getWalletBalances(
			{
				address: ADDRESS,
				addresses: [ADDRESS],
				network: "evm",
				tokens: ["all"],
			},
			{
				evmRpcClients: [
					{ chain: ethereumChain, client: successfulClient },
					{ chain: polygonChain, client: failingClient },
				],
			},
		);

		expect(result.balances).toHaveLength(1);
		expect(result.balances[0]?.source.chainName).toBe("Ethereum");
		expect(result.errors).toEqual([
			{
				address: ADDRESS,
				token: "all",
				code: "CHAIN_BALANCE_FETCH_FAILED",
				message: "Polygon: HTTP 403",
			},
		]);
	});

	it("drops GoldRush spam tokens at source", async () => {
		const fetcher = async (url: string): Promise<Response> => {
			const chainId = Number(new URL(url).searchParams.get("chains"));

			return new Response(JSON.stringify({
				items: chainId === 1
					? [
						{
							balance: "1000000",
							chain_display_name: "Ethereum",
							chain_id: 1,
							chain_name: "eth-mainnet",
							contract_address: TOKEN,
							contract_decimals: 6,
							contract_ticker_symbol: "DROP",
							is_spam: true,
							quote: 1,
							quote_rate: 1,
						},
					]
					: [],
			}));
		};

		const result = await getWalletBalances(
			{
				address: FOURTH_ADDRESS,
				addresses: [FOURTH_ADDRESS],
				network: "evm",
				tokens: ["all"],
			},
			{
				fetch: fetcher,
				goldRushApiKey: "test-key",
			},
		);

		expect(result.balances).toEqual([]);
		expect(result.errors).toEqual([]);
	});

	it("skips malformed GoldRush priced items instead of failing the whole chain", async () => {
		const fetcher = async (): Promise<Response> =>
			new Response(JSON.stringify({
				items: [
					{
						balance: "1000000",
						chain_display_name: "Ethereum",
						chain_id: 1,
						chain_name: "eth-mainnet",
						contract_decimals: 6,
						contract_ticker_symbol: "BROKEN",
						is_native_token: false,
						quote: 1,
						quote_rate: 1,
					},
				],
			}));

		const result = await getWalletBalances(
			{
				address: SECOND_ADDRESS,
				addresses: [SECOND_ADDRESS],
				network: "evm",
				tokens: ["all"],
			},
			{
				fetch: fetcher,
				goldRushApiKey: "test-key",
			},
		);

		expect(result.balances).toEqual([]);
		expect(result.errors).toEqual([]);
	});

	it("falls back to Alchemy only for GoldRush chains that failed", async () => {
		const fetcher = async (url: string): Promise<Response> => {
			const chainId = Number(new URL(url).searchParams.get("chains"));

			return chainId === 1
				? new Response("{}", { status: 500 })
				: new Response(JSON.stringify({ items: [] }));
		};
		const calledChains: string[] = [];
		const ethereumClient: EvmJsonRpcClient = {
			async call<Result = string>(method: string): Promise<Result> {
				calledChains.push(`ethereum:${method}`);

				if (method === "eth_getBalance") {
					return "0x1" as Result;
				}

				if (method === "alchemy_getTokenBalances") {
					return {
						address: THIRD_ADDRESS,
						tokenBalances: [],
					} as Result;
				}

				throw new Error("Unexpected Ethereum fallback call");
			},
		};
		const polygonClient: EvmJsonRpcClient = {
			async call(): Promise<never> {
				throw new Error("Polygon fallback should not be called");
			},
		};
		const ethereumChain: AlchemyEvmChainConfig = {
			chainId: 1,
			key: "ethereum",
			name: "Ethereum",
			nativeSymbol: "ETH",
			rpcUrlPrefix: "https://eth-mainnet.example",
		};
		const polygonChain: AlchemyEvmChainConfig = {
			chainId: 137,
			key: "polygon",
			name: "Polygon",
			nativeSymbol: "MATIC",
			rpcUrlPrefix: "https://polygon-mainnet.example",
		};

		const result = await getWalletBalances(
			{
				address: THIRD_ADDRESS,
				addresses: [THIRD_ADDRESS],
				network: "evm",
				tokens: ["all"],
			},
			{
				evmRpcClients: [
					{ chain: ethereumChain, client: ethereumClient },
					{ chain: polygonChain, client: polygonClient },
				],
				fetch: fetcher,
				goldRushApiKey: "test-key",
			},
		);

		expect(calledChains).toEqual([
			"ethereum:eth_getBalance",
			"ethereum:alchemy_getTokenBalances",
		]);
		expect(result.balances).toEqual([
			expect.objectContaining({
				source: expect.objectContaining({
					chainId: 1,
					chainName: "Ethereum",
				}),
				symbol: "ETH",
			}),
		]);
		expect(result.errors).toEqual([
			{
				address: THIRD_ADDRESS,
				chainId: 1,
				token: "all",
				code: "GOLDRUSH_BALANCE_FETCH_FAILED",
				message: "GoldRush HTTP 500",
			},
		]);
		expect(GOLDRUSH_PORTFOLIO_CHAIN_IDS).toContain(1);
	});

	it("returns native SOL balances from a Solana JSON-RPC client", async () => {
		const solanaRpcClient: SolanaJsonRpcClient = {
			async call<Result>(method: string, params: unknown[]): Promise<Result> {
				expect(method).toBe("getBalance");
				expect(params).toEqual([SOLANA_ADDRESS]);

				return {
					context: { slot: 1 },
					value: 1_500_000_000,
				} as Result;
			},
		};

		const result = await getWalletBalances(
			{
				address: SOLANA_ADDRESS,
				addresses: [SOLANA_ADDRESS],
				network: "solana",
				tokens: ["native"],
			},
			{ solanaRpcClient },
		);

		expect(result.balances).toEqual([
			{
				token: "native",
				rawBalance: "1500000000",
				formattedBalance: "1.5",
				decimals: 9,
				source: {
					type: "wallet",
					network: "solana",
					address: SOLANA_ADDRESS,
				},
				symbol: "SOL",
			},
		]);
		expect(result.errors).toEqual([]);
	});

	it("discovers all Solana SPL token accounts", async () => {
		const mint = "So11111111111111111111111111111111111111112";
		const solanaRpcClient: SolanaJsonRpcClient = {
			async call<Result>(method: string, params: unknown[]): Promise<Result> {
				if (method === "getBalance") {
					return {
						context: { slot: 1 },
						value: 2_000_000_000,
					} as Result;
				}

				if (method === "getTokenAccountsByOwner") {
					expect(params).toEqual([
						SOLANA_ADDRESS,
						{ programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" },
						{ encoding: "jsonParsed" },
					]);

					return {
						context: { slot: 1 },
						value: [
							{
								pubkey: "token-account",
								account: {
									data: {
										parsed: {
											info: {
												mint,
												tokenAmount: {
													amount: "1234500",
													decimals: 6,
													uiAmountString: "1.2345",
												},
											},
										},
									},
								},
							},
						],
					} as Result;
				}

				throw new Error("Unexpected call");
			},
		};

		const result = await getWalletBalances(
			{
				address: SOLANA_ADDRESS,
				addresses: [SOLANA_ADDRESS],
				network: "solana",
				tokens: ["all"],
			},
			{ solanaRpcClient },
		);

		expect(result.balances).toEqual([
			{
				token: "native",
				rawBalance: "2000000000",
				formattedBalance: "2",
				decimals: 9,
				source: {
					type: "wallet",
					network: "solana",
					address: SOLANA_ADDRESS,
				},
				symbol: "SOL",
			},
		]);
	});
});
