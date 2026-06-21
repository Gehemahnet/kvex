import { beforeEach, describe, expect, it, vi } from "vitest";
import { etherealRestClient } from "../../src/exchanges/ethereal/ethereal";
import {
	clearEtherealAccountStateStore,
	upsertEtherealAccountPositions,
} from "../../src/exchanges/ethereal/ethereal-account-state.store";
import { hyperliquidRestClient } from "../../src/exchanges/hyperliquid/hyperliquid";
import { okxClient } from "../../src/exchanges/okx/okx";
import { nadoClient } from "../../src/exchanges/nado/nado";
import { pacificaRestClient } from "../../src/exchanges/pacifica/pacifica";
import { getUserTradingPositions } from "../../src/services/trading/positions/trading-positions.service";
import type { UserExchangeAccount } from "../../src/services/users/user-exchange-accounts/user-exchange-accounts.types";

vi.mock("../../src/exchanges/hyperliquid/hyperliquid", () => ({
	hyperliquidRestClient: { getClearinghouseState: vi.fn() },
}));

vi.mock("../../src/exchanges/ethereal/ethereal", () => ({
	etherealRestClient: {
		getMarkets: vi.fn(),
		getPositions: vi.fn(),
		resolveSubaccount: vi.fn(),
	},
}));

vi.mock("../../src/exchanges/ethereal/ethereal.ws", () => ({
	etherealMarketDataStream: { subscribeToSubaccount: vi.fn() },
}));

vi.mock("../../src/exchanges/okx/okx", () => ({
	okxClient: { getPositions: vi.fn() },
}));

vi.mock("../../src/exchanges/nado/nado", () => ({
	nadoClient: { getSubaccountSummary: vi.fn() },
}));

vi.mock("../../src/exchanges/pacifica/pacifica", () => ({
	pacificaRestClient: { getPositions: vi.fn() },
}));

describe("getUserTradingPositions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		clearEtherealAccountStateStore();
	});

	it("normalizes Ethereal REST position snapshots", async () => {
		vi.mocked(etherealRestClient.resolveSubaccount).mockResolvedValue({
			account: "0x1111111111111111111111111111111111111111",
			createdAt: 1,
			id: "subaccount-id",
			name: "primary",
		});
		vi.mocked(etherealRestClient.getMarkets).mockResolvedValue({
			hasNext: false,
			data: [{
				id: "product-id",
				ticker: "ETHUSD",
				displayTicker: "ETH-USD",
				status: "ACTIVE",
			} as never],
		});
		vi.mocked(etherealRestClient.getPositions).mockResolvedValue([{
			cost: "1000",
			createdAt: 1_700_000_000_000,
			feesAccruedUsd: "2",
			fundingAccruedUsd: "-1",
			fundingUsd: "0",
			id: "position-id",
			isLiquidated: false,
			liquidationPrice: "1500.123456789",
			productId: "product-id",
			realizedPnl: "0",
			side: 0,
			size: "0.5",
			unrealizedPnl: "50",
			updatedAt: 1_700_000_001_000,
		}]);

		const result = await getUserTradingPositions([createAccount("ethereal")]);

		expect(result.errors).toEqual([]);
		expect(result.positions).toEqual([expect.objectContaining({
			exchange: "ethereal",
			symbol: "ETH",
			quoteAsset: "USD",
			entryPrice: "2000",
			liquidationPrice: "1500.123456789",
			markPrice: "2100",
			notionalUsd: "1050",
			unrealizedPnlUsd: "50",
		})]);

		upsertEtherealAccountPositions("subaccount-id", [{
			cost: "1100",
			feesAccruedUsd: "2",
			fundingAccruedUsd: "-1",
			id: "position-id",
			productId: "product-id",
			realizedPnl: "0",
			side: 0,
			size: "0.5",
			sourceSymbol: "ETHUSD",
			subaccountId: "subaccount-id",
			updatedAt: 1_700_000_002_000,
		}]);
		const liveResult = await getUserTradingPositions([createAccount("ethereal")]);

		expect(liveResult.positions[0]).toEqual(expect.objectContaining({
			entryPrice: "2200",
			liquidationPrice: "1500.123456789",
			markPrice: "2300",
		}));
		expect(etherealRestClient.getPositions).toHaveBeenCalledTimes(1);
	});

	it("normalizes Hyperliquid and OKX positions", async () => {
		vi.mocked(hyperliquidRestClient.getClearinghouseState).mockResolvedValue({
			assetPositions: [{
				type: "oneWay",
				position: {
					coin: "BTC",
					entryPx: "65000",
					leverage: { type: "cross", value: 5 },
					liquidationPx: "50000",
					marginUsed: "1300",
					positionValue: "6500",
					returnOnEquity: "0.1",
					szi: "0.1",
					unrealizedPnl: "100",
				},
			}],
		});
		vi.mocked(okxClient.getPositions).mockResolvedValue([{
			avgPx: "3200",
			instId: "ETH-USDT-SWAP",
			instType: "SWAP",
			lever: "3",
			liqPx: "4000",
			margin: "1066.67",
			markPx: "3100",
			mgnMode: "isolated",
			notionalUsd: "3100",
			pos: "-1",
			posSide: "net",
			uTime: "1700000000000",
			upl: "100",
			uplRatio: "0.09375",
		}]);

		const result = await getUserTradingPositions([
			createAccount("hyperliquid"),
			createAccount("okx"),
		]);

		expect(result.errors).toEqual([]);
		expect(result.positions).toEqual([
			{
				id: "hyperliquid-id:BTC:long",
				accountId: "hyperliquid-id",
				exchange: "hyperliquid",
				label: "Hyperliquid main",
				symbol: "BTC",
				sourceSymbol: "BTC",
				quoteAsset: "USDC",
				side: "long",
				size: "0.1",
				entryPrice: "65000",
				liquidationPrice: "50000",
				leverage: 5,
				marginMode: "cross",
				marginUsed: "1300",
				notionalUsd: "6500",
				unrealizedPnlUsd: "100",
				returnOnEquity: 0.1,
			},
			{
				id: "okx-id:ETH-USDT-SWAP:short",
				accountId: "okx-id",
				exchange: "okx",
				label: "OKX main",
				symbol: "ETH",
				sourceSymbol: "ETH-USDT-SWAP",
				quoteAsset: "USDT",
				side: "short",
				size: "1",
				entryPrice: "3200",
				markPrice: "3100",
				liquidationPrice: "4000",
				leverage: 3,
				marginMode: "isolated",
				marginUsed: "1066.67",
				notionalUsd: "3100",
				unrealizedPnlUsd: "100",
				returnOnEquity: 0.09375,
				updatedAt: "2023-11-14T22:13:20.000Z",
			},
		]);
	});

	it("keeps successful positions with partial account errors", async () => {
		vi.mocked(hyperliquidRestClient.getClearinghouseState).mockResolvedValue({
			assetPositions: [],
		});

		const result = await getUserTradingPositions([
			createAccount("hyperliquid"),
			createAccount("variational"),
		]);

		expect(result.positions).toEqual([]);
		expect(result.errors).toEqual([{
			accountId: "variational-id",
			exchange: "variational",
			label: "Variational main",
			code: "TRADING_POSITIONS_UNSUPPORTED",
			message: "Variational trading API is not available to users yet",
		}]);
	});

	it("normalizes Nado perp balances and Pacifica positions", async () => {
		vi.mocked(nadoClient.getSubaccountSummary).mockResolvedValue({
			exists: true,
			balances: [{
				amount: "-2",
				markPrice: "2500",
				netEntryUnrealized: "-5200",
				oraclePrice: "2500",
				productId: 2,
				symbol: "ETH-PERP",
				type: "perp",
				valueUsd: -5000,
				vQuoteBalance: "4900",
			}, {
				amount: "100",
				productId: 0,
				symbol: "USDC",
				type: "spot",
			}],
		});
		vi.mocked(pacificaRestClient.getPositions).mockResolvedValue([{
			amount: "0.25",
			created_at: 1_700_000_000_000,
			entry_price: "60000",
			funding: "5",
			isolated: true,
			liquidation_price: "50000",
			margin: "1500",
			side: "bid",
			symbol: "BTC",
			updated_at: 1_700_000_000_000,
		}]);

		const result = await getUserTradingPositions([
			createAccount("nado"),
			createAccount("pacifica"),
		]);

		expect(result.errors).toEqual([]);
		expect(result.positions).toEqual([
			expect.objectContaining({
				id: "nado-id:ETH-PERP:short",
				exchange: "nado",
				symbol: "ETH",
				side: "short",
				size: "2",
				quoteAsset: "USDT0",
				entryPrice: "2600",
				markPrice: "2500",
				marginMode: "cross",
				notionalUsd: "5000",
				unrealizedPnlUsd: "200",
			}),
			expect.objectContaining({
				id: "pacifica-id:BTC:long",
				exchange: "pacifica",
				symbol: "BTC",
				side: "long",
				size: "0.25",
				quoteAsset: "USDC",
				entryPrice: "60000",
				liquidationPrice: "50000",
				marginMode: "isolated",
				marginUsed: "1500",
			}),
		]);
	});

	it("skips disabled accounts", async () => {
		const account = createAccount("hyperliquid");
		account.status = "disabled";

		expect(await getUserTradingPositions([account])).toEqual({
			positions: [],
			errors: [],
		});
		expect(hyperliquidRestClient.getClearinghouseState).not.toHaveBeenCalled();
	});
});

const createAccount = (
	exchange: UserExchangeAccount["exchange"],
): UserExchangeAccount => ({
	id: `${exchange}-id`,
	userId: "user-id",
	exchange,
	label: `${exchange === "okx" ? "OKX" : `${exchange[0]?.toUpperCase()}${exchange.slice(1)}`} main`,
	status: "active",
	publicData: exchange === "hyperliquid"
		? { exchange, address: "0x1111111111111111111111111111111111111111" }
		: exchange === "okx"
			? {
				exchange,
				apiKey: "test-key",
				apiSecret: "test-secret",
				passphrase: "test-passphrase",
			}
			: exchange === "nado"
				? {
					exchange,
					address: "0x1111111111111111111111111111111111111111",
					subaccountName: "default",
				}
				: exchange === "ethereal"
					? {
						exchange,
						address: "0x1111111111111111111111111111111111111111",
						subaccountName: "primary",
					}
				: exchange === "pacifica"
					? { exchange, accountAddress: "pacifica-account" }
					: { exchange },
	capabilities: { positions: true },
	createdAt: new Date("2026-01-01T00:00:00.000Z"),
	updatedAt: new Date("2026-01-01T00:00:00.000Z"),
});
