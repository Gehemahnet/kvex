import { beforeEach, describe, expect, it, vi } from "vitest";
import { etherealRestClient } from "../../src/exchanges/ethereal/ethereal";
import { nadoClient } from "../../src/exchanges/nado/nado";
import { okxClient } from "../../src/exchanges/okx/okx";
import { getUserTradingHistory } from "../../src/services/trading/history/trading-history.service";
import type { UserExchangeAccount } from "../../src/services/users/user-exchange-accounts/user-exchange-accounts.types";

vi.mock("../../src/exchanges/nado/nado", () => ({
	nadoClient: { getSymbols: vi.fn(), getTradeHistory: vi.fn() },
}));
vi.mock("../../src/exchanges/ethereal/ethereal", () => ({
	etherealRestClient: {
		getAllPositions: vi.fn(),
		getMarkets: vi.fn(),
		getPositionFills: vi.fn(),
		resolveSubaccount: vi.fn(),
	},
}));
vi.mock("../../src/exchanges/ethereal/ethereal.ws", () => ({
	etherealMarketDataStream: { subscribeToSubaccount: vi.fn() },
}));
vi.mock("../../src/exchanges/okx/okx", () => ({
	okxClient: { getPositionHistory: vi.fn() },
}));

describe("getUserTradingHistory", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("groups Ethereal fills by their native position", async () => {
		vi.mocked(etherealRestClient.resolveSubaccount).mockResolvedValue({
			account: "0x1111111111111111111111111111111111111111",
			createdAt: 1,
			id: "subaccount-id",
			name: "primary",
		});
		vi.mocked(etherealRestClient.getMarkets).mockResolvedValue({
			hasNext: false,
			data: [{ id: "product-id", ticker: "ETHUSD" } as never],
		});
		vi.mocked(etherealRestClient.getAllPositions).mockResolvedValue([{
			id: "position-id",
			productId: "product-id",
			realizedPnl: "25",
		} as never]);
		vi.mocked(etherealRestClient.getPositionFills).mockResolvedValue([{
			createdAt: 1_700_000_000_000,
			feeUsd: "1",
			filled: "0.5",
			price: "1900",
			realizedPnl: "0",
			reduceOnly: false,
			side: 0,
			type: "MARKET",
		}, {
			createdAt: 1_700_000_001_000,
			feeUsd: "1",
			filled: "0.5",
			price: "2000",
			realizedPnl: "25",
			reduceOnly: true,
			side: 1,
			type: "MARKET",
		}]);

		const result = await getUserTradingHistory([createAccount("ethereal")]);

		expect(result.errors).toEqual([]);
		expect(result.positions).toEqual([expect.objectContaining({
			entryPrice: "1900",
			exchange: "ethereal",
			exitPrice: "2000",
			quoteAsset: "USD",
			realizedPnlUsd: "25",
			side: "long",
			size: "0.5",
			symbol: "ETH",
		})]);
	});

	it("collapses Nado matches and uses native OKX closed positions", async () => {
		vi.mocked(nadoClient.getSymbols).mockResolvedValue([{
			maker_fee_rate_x18: "0",
			product_id: 2,
			symbol: "UNI-PERP",
			taker_fee_rate_x18: "0",
			trading_status: "live",
			type: "perp",
		}]);
		vi.mocked(nadoClient.getTradeHistory).mockResolvedValue([{
			fee: "0.01",
			id: "1:digest",
			price: "3.49",
			productId: 2,
			realizedPnl: "0",
			side: "sell",
			size: "2",
			timestamp: "1700000000",
		}, {
			fee: "0.1",
			id: "2:digest",
			price: "3.49",
			productId: 2,
			realizedPnl: "0",
			side: "sell",
			size: "83",
			timestamp: "1700000001",
		}, {
			fee: "0.1",
			id: "3:digest",
			price: "3.53",
			productId: 2,
			realizedPnl: "-2.81",
			side: "buy",
			size: "85",
			timestamp: "1700000002",
		}]);
		vi.mocked(okxClient.getPositionHistory).mockResolvedValue([{
			closeAvgPx: "65000",
			closeTotalPos: "0.1",
			cTime: "1700000003000",
			direction: "long",
			instId: "BTC-USDT-SWAP",
			instType: "SWAP",
			openAvgPx: "64000",
			openMaxPos: "0.1",
			posId: "position-id",
			posSide: "net",
			realizedPnl: "12",
			type: "2",
			uTime: "1700000004000",
		}]);

		const result = await getUserTradingHistory([
			createAccount("nado"),
			createAccount("okx"),
		]);

		expect(result.errors).toEqual([]);
		expect(result.positions).toHaveLength(2);
		expect(result.positions[0]).toEqual(expect.objectContaining({
			entryPrice: "64000",
			exchange: "okx",
			exitPrice: "65000",
			realizedPnlUsd: "12",
			side: "long",
			symbol: "BTC",
		}));
		expect(result.positions[1]).toEqual(expect.objectContaining({
			entryPrice: "3.49",
			exchange: "nado",
			exitPrice: "3.53",
			quoteAsset: "USDT0",
			realizedPnlUsd: "-2.81",
			side: "short",
			size: "85",
			symbol: "UNI",
		}));
	});

	it("keeps successful history when another exchange fails", async () => {
		vi.mocked(nadoClient.getSymbols).mockResolvedValue([{
			maker_fee_rate_x18: "0",
			product_id: 2,
			symbol: "ETH-PERP",
			taker_fee_rate_x18: "0",
			trading_status: "live",
			type: "perp",
		}]);
		vi.mocked(nadoClient.getTradeHistory).mockResolvedValue([{
			fee: "0",
			id: "open",
			price: "2000",
			productId: 2,
			realizedPnl: "0",
			side: "buy",
			size: "1",
			timestamp: "1700000000",
		}, {
			fee: "0",
			id: "close",
			price: "2100",
			productId: 2,
			realizedPnl: "100",
			side: "sell",
			size: "1",
			timestamp: "1700000001",
		}]);
		vi.mocked(okxClient.getPositionHistory).mockRejectedValue(new Error("OKX unavailable"));

		const result = await getUserTradingHistory([
			createAccount("nado"),
			createAccount("okx"),
		]);

		expect(result.positions).toHaveLength(1);
		expect(result.errors).toEqual([{
			accountId: "okx-id",
			code: "TRADING_HISTORY_FETCH_FAILED",
			exchange: "okx",
			label: "okx",
			message: "OKX unavailable",
		}]);
	});
});

const createAccount = (
	exchange: "ethereal" | "nado" | "okx",
): UserExchangeAccount => ({
	id: `${exchange}-id`,
	userId: "user-id",
	exchange,
	label: exchange,
	status: "active",
	publicData: exchange === "nado"
		? { exchange, address: "0x1111111111111111111111111111111111111111", subaccountName: "default" }
		: exchange === "ethereal"
			? { exchange, address: "0x1111111111111111111111111111111111111111", subaccountName: "primary" }
			: { exchange, apiKey: "test-key", apiSecret: "test-secret", passphrase: "test-passphrase" },
	capabilities: { positions: true },
	createdAt: new Date("2026-01-01T00:00:00.000Z"),
	updatedAt: new Date("2026-01-01T00:00:00.000Z"),
});
