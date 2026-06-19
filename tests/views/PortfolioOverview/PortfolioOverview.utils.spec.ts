import { describe, expect, it } from "vitest";
import { portfolioApi } from "@api/portfolio";
import { TOKENS } from "@shared/constants/currencies";
import {
	createPortfolioAssetRows,
	formatPortfolioAssetAmount,
	formatUsdValue,
	getPortfolioPriceSymbols,
	getTotalPortfolioValueUsd,
	parseWalletAddressesInput,
	parseSolanaWalletAddressesInput,
	shortenAddress,
} from "@views/PortfolioOverview/Portfolio.utils";

const ADDRESS = "0x1111111111111111111111111111111111111111";
const SECOND_ADDRESS = "0x2222222222222222222222222222222222222222";
const SOLANA_ADDRESS = "11111111111111111111111111111111";
const TOKEN = "0x3333333333333333333333333333333333333333";
const UPPER_ADDRESS = `0x${ADDRESS.slice(2).toUpperCase()}`;

describe("PortfolioOverview utils", () => {
	it("parses comma and newline separated wallet addresses", () => {
		expect(
			parseWalletAddressesInput(`${UPPER_ADDRESS}, invalid\n${SECOND_ADDRESS}`),
		).toEqual([ADDRESS, SECOND_ADDRESS]);
	});

	it("parses comma and newline separated Solana wallet addresses", () => {
		expect(
			parseSolanaWalletAddressesInput(`${SOLANA_ADDRESS}, invalid\n${SOLANA_ADDRESS}`),
		).toEqual([SOLANA_ADDRESS]);
	});

	it("creates table rows with wallet source labels", () => {
		expect(
			createPortfolioAssetRows(
				[
					{
						token: TOKEN,
						tokenAddress: TOKEN,
						rawBalance: "1000000",
						formattedBalance: "1",
						decimals: 6,
						symbol: TOKENS.usdc,
						source: {
							type: "wallet",
							network: "evm",
							address: ADDRESS,
						},
					},
				],
				[
					{
						symbol: TOKENS.usdc,
						priceUsd: 1,
						source: "test",
						updatedAt: "2026-06-12T00:00:00.000Z",
					},
				],
			),
		).toEqual([
			{
				id: `wallet-evm-default-${ADDRESS}-${TOKEN}`,
				amount: "1",
				chainName: "EVM",
				name: shortenAddress(TOKEN),
				priceUsd: 1,
				sourceLabel: shortenAddress(ADDRESS),
				sourceNetwork: "evm",
				sourceType: "Wallet",
				symbol: TOKENS.usdc,
				token: TOKEN,
				valueUsd: 1,
			},
		]);
	});

	it("adds USD row values when prices are available", () => {
		const rows = createPortfolioAssetRows(
			[
				{
					token: "native",
					rawBalance: "1500000000",
					formattedBalance: "1.5",
					decimals: 9,
					symbol: "SOL",
					source: {
						type: "wallet",
						network: "solana",
						address: SOLANA_ADDRESS,
					},
				},
			],
			[
				{
					symbol: "SOL",
					priceUsd: 150,
					source: "test",
					updatedAt: "2026-06-12T00:00:00.000Z",
				},
			],
		);

		expect(rows[0]?.valueUsd).toBe(225);
		expect(getTotalPortfolioValueUsd(rows)).toBe(225);
		expect(formatUsdValue(225)).toBe("$225.00");
	});

	it("hides rows without USD value and sorts priced rows by value", () => {
		const rows = createPortfolioAssetRows(
			[
				{
					token: "native",
					rawBalance: "1000000000",
					formattedBalance: "1",
					decimals: 9,
					symbol: "SOL",
					source: {
						type: "wallet",
						network: "solana",
						address: SOLANA_ADDRESS,
					},
				},
				{
					token: TOKEN,
					rawBalance: "1000000000000000000",
					formattedBalance: "1",
					decimals: 18,
					symbol: "SCAM",
					source: {
						type: "wallet",
						network: "evm",
						address: ADDRESS,
					},
				},
				{
					token: SECOND_ADDRESS,
					rawBalance: "2000000",
					formattedBalance: "2",
					decimals: 6,
					symbol: TOKENS.usdc,
					source: {
						type: "wallet",
						network: "evm",
						address: ADDRESS,
					},
				},
			],
			[
				{
					symbol: "SOL",
					priceUsd: 150,
					source: "test",
					updatedAt: "2026-06-12T00:00:00.000Z",
				},
				{
					symbol: TOKENS.usdc,
					priceUsd: 1,
					source: "test",
					updatedAt: "2026-06-12T00:00:00.000Z",
				},
			],
		);

		expect(rows.map((row) => row.symbol)).toEqual(["SOL", TOKENS.usdc]);
	});

	it("returns price symbols only for trusted assets", () => {
		expect(
			getPortfolioPriceSymbols([
				{
					token: "native",
					rawBalance: "1",
					formattedBalance: "1",
					symbol: "ETH",
					source: {
						type: "wallet",
						network: "evm",
						address: ADDRESS,
					},
				},
				{
					token: TOKEN,
					rawBalance: "1",
					formattedBalance: "1",
					symbol: "VISITWEBSITE",
					source: {
						type: "wallet",
						network: "evm",
						address: ADDRESS,
					},
				},
			]),
		).toEqual(["ETH"]);
	});

	it("formats tiny balances until the first non-zero decimal", () => {
		expect(formatPortfolioAssetAmount("0.00000007053614356")).toBe("0.00000007");
		expect(formatPortfolioAssetAmount("1.23456789")).toBe("1.2345");
		expect(formatPortfolioAssetAmount("10.000000")).toBe("10");
	});

	it("builds multi-wallet balance URLs", () => {
		expect(
			portfolioApi.createWalletBalancesUrl({
				evmAddresses: [ADDRESS, SECOND_ADDRESS],
				networks: ["evm"],
				solanaAddresses: [],
				tokens: ["native", TOKEN],
			}),
		).toBe(
			`/api/portfolio/wallet-balances?networks=evm&evmAddresses=${ADDRESS}%2C${SECOND_ADDRESS}&tokens=native%2C${TOKEN}`,
		);
	});
});
