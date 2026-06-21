import { Readable } from "node:stream";
import { describe, expect, it, vi } from "vitest";
import { getAuthenticatedUser } from "../../src/services/auth/auth-service/auth.service";
import { getUserTradingPositions } from "../../src/services/trading/positions/trading-positions.service";
import { getUserTradingHistory } from "../../src/services/trading/history/trading-history.service";
import { listUserExchangeAccounts } from "../../src/services/users/user-exchange-accounts/user-exchange-accounts.repository";
import { getPostgresPool } from "../../src/storage/postgres/postgres.client";
import { router } from "../../src/server/router";

vi.mock("../../src/storage/postgres/postgres.client", () => ({
	getPostgresPool: vi.fn(),
}));

vi.mock("../../src/services/auth/auth-service/auth.service", () => ({
	getAuthenticatedUser: vi.fn(),
}));

vi.mock("../../src/services/users/user-exchange-accounts/user-exchange-accounts.repository", () => ({
	listUserExchangeAccounts: vi.fn(),
}));

vi.mock("../../src/services/trading/positions/trading-positions.service", () => ({
	getUserTradingPositions: vi.fn(),
}));

vi.mock("../../src/services/trading/history/trading-history.service", () => ({
	getUserTradingHistory: vi.fn(),
}));

describe("GET /trading/positions/me", () => {
	it("returns aggregated current-user positions", async () => {
		const db = { query: vi.fn() };
		vi.mocked(getPostgresPool).mockReturnValue(db);
		vi.mocked(getAuthenticatedUser).mockResolvedValue({
			id: "user-id",
			login: "trader",
			createdAt: new Date("2026-01-01T00:00:00.000Z"),
			updatedAt: new Date("2026-01-01T00:00:00.000Z"),
		});
		vi.mocked(listUserExchangeAccounts).mockResolvedValue([]);
		vi.mocked(getUserTradingPositions).mockResolvedValue({
			positions: [{
				id: "account-id:BTC:long",
				accountId: "account-id",
				exchange: "hyperliquid",
				label: "Main",
				symbol: "BTC",
				sourceSymbol: "BTC",
				quoteAsset: "USDC",
				side: "long",
				size: "0.1",
			}],
			errors: [],
		});
		const request = Object.assign(Readable.from([]), {
			headers: { authorization: "Bearer test-token" },
			method: "GET",
			url: "/trading/positions/me",
		});
		const response = createMockResponse();

		await router(request as never, response as never);

		expect(response.statusCode).toBe(200);
		expect(response.json()).toEqual({
			positions: [expect.objectContaining({ symbol: "BTC", side: "long" })],
			errors: [],
		});
		expect(getAuthenticatedUser).toHaveBeenCalledWith(db, "test-token");
	});
});

describe("GET /trading/history/me", () => {
	it("returns normalized closed position history", async () => {
		const db = { query: vi.fn() };
		vi.mocked(getPostgresPool).mockReturnValue(db);
		vi.mocked(getAuthenticatedUser).mockResolvedValue({
			id: "user-id",
			login: "trader",
			createdAt: new Date("2026-01-01T00:00:00.000Z"),
			updatedAt: new Date("2026-01-01T00:00:00.000Z"),
		});
		vi.mocked(listUserExchangeAccounts).mockResolvedValue([]);
		vi.mocked(getUserTradingHistory).mockResolvedValue({ errors: [], positions: [] });
		const request = Object.assign(Readable.from([]), {
			headers: { authorization: "Bearer test-token" },
			method: "GET",
			url: "/trading/history/me",
		});
		const response = createMockResponse();

		await router(request as never, response as never);

		expect(response.statusCode).toBe(200);
		expect(response.json()).toEqual({ errors: [], positions: [] });
	});
});

const createMockResponse = () => ({
	statusCode: 0,
	body: "",
	headers: {} as Record<string, string>,
	getHeader(name: string) {
		return this.headers[name];
	},
	on() {
		return this;
	},
	writeHead(statusCode: number, headers: Record<string, string>) {
		this.statusCode = statusCode;
		this.headers = headers;
		return this;
	},
	end(body: string) {
		this.body = body;
	},
	json() {
		return JSON.parse(this.body) as unknown;
	},
});
