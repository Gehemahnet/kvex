import { beforeEach, describe, expect, it, vi } from "vitest";
import { hyperliquidRestClient } from "../../src/exchanges/hyperliquid/hyperliquid";
import { okxClient } from "../../src/exchanges/okx/okx";
import { getUserExchangeBalances } from "#services/portfolio/exchange-balances/exchange-balances.service";
import type {
	UserExchangeAccount,
	UserExchangeData,
} from "../../src/services/users/user-exchange-accounts.types";

vi.mock("../../src/exchanges/hyperliquid/hyperliquid", () => ({
	hyperliquidRestClient: {
		getClearinghouseState: vi.fn(),
		getSpotClearinghouseState: vi.fn(),
	},
}));

vi.mock("../../src/exchanges/okx/okx", () => ({
	okxClient: {
		getAccountBalance: vi.fn(),
		getTradeFee: vi.fn(),
	},
}));

describe("getUserExchangeBalances", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns Hyperliquid perp and spot balances", async () => {
		vi.mocked(hyperliquidRestClient.getClearinghouseState).mockResolvedValue({
			marginSummary: {
				accountValue: "123.45",
				totalRawUsd: "120",
			},
			time: 1_700_000_000_000,
			withdrawable: "100",
		});
		vi.mocked(hyperliquidRestClient.getSpotClearinghouseState).mockResolvedValue({
			balances: [
				{
					coin: "HYPE",
					hold: "1",
					total: "5",
				},
			],
		});

		const result = await getUserExchangeBalances([
			createAccount({
				exchange: "hyperliquid",
				publicData: {
					exchange: "hyperliquid",
					address: "0x1111111111111111111111111111111111111111",
				},
			}),
		]);

		expect(result.errors).toEqual([]);
		expect(result.balances).toEqual([
			{
				accountId: "account-hyperliquid",
				exchange: "hyperliquid",
				label: "Hyperliquid account",
				totalValueUsd: 123.45,
				updatedAt: "2023-11-14T22:13:20.000Z",
				assets: [
					{
						asset: "USDC",
						available: "100",
						equity: "123.45",
						total: "120",
						valueUsd: 123.45,
					},
					{
						asset: "HYPE",
						hold: "1",
						total: "5",
					},
				],
			},
		]);
	});

	it("returns OKX balances and refreshes fee profiles", async () => {
		vi.mocked(okxClient.getAccountBalance).mockResolvedValue([
			{
				totalEq: "42.5",
				uTime: "1700000000000",
				details: [
					{
						availBal: "10",
						ccy: "USDT",
						cashBal: "10",
						eq: "10",
						eqUsd: "10",
					},
					{
						ccy: "ZERO",
						eq: "0",
					},
				],
			},
		]);
		vi.mocked(okxClient.getTradeFee).mockResolvedValue([
			{
				instType: "SWAP",
				level: "Lv1",
				maker: "-0.0001",
				taker: "0.0005",
				ts: "1700000000000",
			},
		]);
		const onFeeProfiles = vi.fn();

		const result = await getUserExchangeBalances([
			createAccount({
				exchange: "okx",
				publicData: {
					exchange: "okx",
					apiKey: "test-key",
					apiSecret: "test-secret",
					passphrase: "test-passphrase",
				},
			}),
		], { onFeeProfiles });

		expect(result.errors).toEqual([]);
		expect(result.balances).toEqual([
			{
				accountId: "account-okx",
				exchange: "okx",
				label: "Okx account",
				totalValueUsd: 42.5,
				updatedAt: "2023-11-14T22:13:20.000Z",
				assets: [
					{
						asset: "USDT",
						available: "10",
						equity: "10",
						total: "10",
						valueUsd: 10,
					},
				],
			},
		]);
		expect(onFeeProfiles).toHaveBeenCalledWith(
			expect.objectContaining({ exchange: "okx" }),
			[
				{
					expiresAt: "2023-11-14T22:16:20.000Z",
					instrumentType: "SWAP",
					makerFeeRate: -0.0001,
					marketType: "perp",
					source: "api",
					takerFeeRate: 0.0005,
					tierLabel: "Lv1",
				},
			],
		);
	});

	it("keeps successful account balances when another account fails", async () => {
		vi.mocked(hyperliquidRestClient.getClearinghouseState).mockResolvedValue({
			marginSummary: { accountValue: "1" },
		});
		vi.mocked(hyperliquidRestClient.getSpotClearinghouseState).mockResolvedValue({
			balances: [],
		});

		const result = await getUserExchangeBalances([
			createAccount({
				exchange: "hyperliquid",
				publicData: {
					exchange: "hyperliquid",
					address: "0x1111111111111111111111111111111111111111",
				},
			}),
			createAccount({
				exchange: "okx",
				publicData: {
					exchange: "okx",
				},
			}),
		]);

		expect(result.balances).toHaveLength(1);
		expect(result.errors).toEqual([
			{
				accountId: "account-okx",
				code: "EXCHANGE_BALANCE_CREDENTIALS_REQUIRED",
				exchange: "okx",
				message: "OKX apiKey, apiSecret, and passphrase are required",
			},
		]);
	});

	it("reports expired tokens without calling the exchange", async () => {
		const result = await getUserExchangeBalances([
			createAccount({
				exchange: "okx",
				publicData: {
					exchange: "okx",
					apiKey: "test-key",
					apiSecret: "test-secret",
					expiresAt: "2020-01-01T00:00:00.000Z",
					passphrase: "test-passphrase",
				},
			}),
		]);

		expect(okxClient.getAccountBalance).not.toHaveBeenCalled();
		expect(result).toEqual({
			balances: [],
			errors: [
				{
					accountId: "account-okx",
					code: "EXCHANGE_TOKEN_EXPIRED",
					exchange: "okx",
					message: "Exchange token is expired",
				},
			],
		});
	});

	it("reports unsupported exchanges with a dedicated error code", async () => {
		const result = await getUserExchangeBalances([
			createAccount({
				exchange: "pacifica",
				publicData: {
					exchange: "pacifica",
					accountAddress: "pacifica-account",
				},
			}),
		]);

		expect(result).toEqual({
			balances: [],
			errors: [
				{
					accountId: "account-pacifica",
					code: "EXCHANGE_BALANCE_UNSUPPORTED",
					exchange: "pacifica",
					message: "Pacifica balance endpoint is not wired yet; official API spec confirmation is required",
				},
			],
		});
	});

	it("skips disabled and balance-disabled accounts", async () => {
		const result = await getUserExchangeBalances([
			createAccount({
				exchange: "okx",
				status: "disabled",
				publicData: { exchange: "okx" },
			}),
			createAccount({
				exchange: "hyperliquid",
				capabilities: { balances: false },
				publicData: { exchange: "hyperliquid" },
			}),
		]);

		expect(result).toEqual({ balances: [], errors: [] });
		expect(okxClient.getAccountBalance).not.toHaveBeenCalled();
		expect(hyperliquidRestClient.getClearinghouseState).not.toHaveBeenCalled();
	});
});

const createAccount = (
	overrides: Partial<UserExchangeAccount> & {
		exchange: UserExchangeAccount["exchange"];
		publicData: UserExchangeData;
	},
): UserExchangeAccount => ({
	id: `account-${overrides.exchange}`,
	userId: "user-id",
	exchange: overrides.exchange,
	label: `${capitalize(overrides.exchange)} account`,
	status: "active",
	publicData: overrides.publicData,
	capabilities: { balances: true },
	lastCheckedAt: undefined,
	createdAt: new Date("2026-01-01T00:00:00.000Z"),
	updatedAt: new Date("2026-01-01T00:00:00.000Z"),
	...overrides,
});

const capitalize = (value: string): string =>
	value.charAt(0).toUpperCase() + value.slice(1);
