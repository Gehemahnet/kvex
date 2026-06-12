import { describe, expect, it } from "vitest";
import { parseWalletBalancesQuery } from "../../src/server/http/portfolio/wallet-balances-query";

const ADDRESS = "0x1111111111111111111111111111111111111111";
const SOLANA_ADDRESS = "11111111111111111111111111111111";
const TOKEN = "0x2222222222222222222222222222222222222222";

describe("parseWalletBalancesQuery", () => {
	it("defaults to EVM native balance reads", () => {
		expect(
			parseWalletBalancesQuery(`/portfolio/wallet-balances?address=${ADDRESS}`),
		).toEqual({
			address: ADDRESS,
			addresses: [ADDRESS],
			addressesByNetwork: { evm: [ADDRESS] },
			network: "evm",
			networks: ["evm"],
			tokens: ["native"],
		});
	});

	it("accepts multiple wallet addresses", () => {
		const secondAddress = "0x3333333333333333333333333333333333333333";

		expect(
			parseWalletBalancesQuery(
				`/portfolio/wallet-balances?addresses=${ADDRESS},${secondAddress}&address=${ADDRESS}`,
			),
		).toEqual({
			address: ADDRESS,
			addresses: [ADDRESS, secondAddress],
			addressesByNetwork: { evm: [ADDRESS, secondAddress] },
			network: "evm",
			networks: ["evm"],
			tokens: ["native"],
		});
	});

	it("normalizes wallet address and de-duplicates requested tokens", () => {
		const upperAddress = `0x${ADDRESS.slice(2).toUpperCase()}`;
		const upperToken = `0x${TOKEN.slice(2).toUpperCase()}`;

		expect(
			parseWalletBalancesQuery(
				`/portfolio/wallet-balances?network=EVM&address=${upperAddress}&tokens=native,${upperToken},${TOKEN}`,
			),
		).toEqual({
			address: ADDRESS,
			addresses: [ADDRESS],
			addressesByNetwork: { evm: [ADDRESS] },
			network: "evm",
			networks: ["evm"],
			tokens: ["native", TOKEN],
		});
	});

	it("accepts all token discovery requests", () => {
		expect(
			parseWalletBalancesQuery(
				`/portfolio/wallet-balances?network=EVM&address=${ADDRESS}&tokens=all`,
			),
		).toEqual({
			address: ADDRESS,
			addresses: [ADDRESS],
			addressesByNetwork: { evm: [ADDRESS] },
			network: "evm",
			networks: ["evm"],
			tokens: ["all"],
		});
	});

	it("accepts one request with EVM and Solana address lists", () => {
		expect(
			parseWalletBalancesQuery(
				`/portfolio/wallet-balances?networks=evm,solana&evmAddresses=${ADDRESS}&solanaAddresses=${SOLANA_ADDRESS}&tokens=all`,
			),
		).toEqual({
			address: ADDRESS,
			addresses: [ADDRESS, SOLANA_ADDRESS],
			addressesByNetwork: {
				evm: [ADDRESS],
				solana: [SOLANA_ADDRESS],
			},
			network: "evm",
			networks: ["evm", "solana"],
			tokens: ["all"],
		});
	});

	it("rejects missing wallet address", () => {
		expect(() => parseWalletBalancesQuery("/portfolio/wallet-balances")).toThrow(
			"Query param `address` or `addresses` is required",
		);
	});

	it("accepts Solana native balance reads", () => {
		expect(
			parseWalletBalancesQuery(
				`/portfolio/wallet-balances?network=solana&address=${SOLANA_ADDRESS}`,
			),
		).toEqual({
			address: SOLANA_ADDRESS,
			addresses: [SOLANA_ADDRESS],
			addressesByNetwork: { solana: [SOLANA_ADDRESS] },
			network: "solana",
			networks: ["solana"],
			tokens: ["native"],
		});
	});

	it("rejects unsupported networks", () => {
		expect(() =>
			parseWalletBalancesQuery(
				`/portfolio/wallet-balances?network=bitcoin&address=${ADDRESS}`,
			),
		).toThrow("Query param `network` or `networks` must contain only `evm` or `solana`");
	});

	it("rejects invalid wallet addresses", () => {
		expect(() =>
			parseWalletBalancesQuery("/portfolio/wallet-balances?address=not-address"),
		).toThrow("Query param `address` must be an EVM address");
	});

	it("rejects invalid token identifiers", () => {
		expect(() =>
			parseWalletBalancesQuery(
				`/portfolio/wallet-balances?address=${ADDRESS}&tokens=USDC`,
			),
		).toThrow("Query param `tokens` must contain `all`, `native`, or EVM token addresses");
	});

	it("rejects non-native Solana token identifiers", () => {
		expect(() =>
			parseWalletBalancesQuery(
				`/portfolio/wallet-balances?network=solana&address=${SOLANA_ADDRESS}&tokens=USDC`,
			),
		).toThrow("Query param `tokens` must contain only `native` or `all` for Solana");
	});
});
