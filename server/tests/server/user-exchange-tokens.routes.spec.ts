import { Readable } from "node:stream";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAuthenticatedSession } from "../../src/services/auth/auth-service/auth.service";
import { updateUserExchangeAccount } from "../../src/services/users/user-exchange-accounts/user-exchange-accounts.repository";
import { getPostgresPool } from "../../src/storage/postgres/postgres.client";
import { router } from "../../src/server/router";

vi.mock("../../src/storage/postgres/postgres.client", () => ({
	getPostgresPool: vi.fn(),
}));

vi.mock("../../src/services/auth/auth-service/auth.service", () => ({
	getAuthenticatedSession: vi.fn(),
	getAuthenticatedUser: vi.fn(),
}));

vi.mock("../../src/services/users/user-exchange-accounts/user-exchange-accounts.repository", () => ({
	createUserExchangeAccount: vi.fn(),
	deleteUserExchangeAccount: vi.fn(),
	listUserExchangeAccounts: vi.fn(),
	updateUserExchangeAccount: vi.fn(),
	updateUserExchangeAccountPublicData: vi.fn(),
	updateUserExchangeAccountStatus: vi.fn(),
}));

describe("PATCH /portfolio/exchange-tokens", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(getPostgresPool).mockReturnValue({ query: vi.fn() });
		vi.mocked(getAuthenticatedSession).mockResolvedValue({
			csrfToken: "test-csrf",
			expiresAt: new Date("2026-06-20T00:00:00.000Z"),
			token: "test-token",
			user: {
				id: "user-id",
				login: "trader",
				createdAt: new Date("2026-01-01T00:00:00.000Z"),
				updatedAt: new Date("2026-01-01T00:00:00.000Z"),
			},
		});
	});

	it("updates and returns a normalized token label", async () => {
		vi.mocked(updateUserExchangeAccount).mockResolvedValue(createExchangeAccount());

		const response = await patchExchangeToken({ label: "  Main account  " });

		expect(response.statusCode).toBe(200);
		expect(response.json()).toEqual({
			token: expect.objectContaining({ id: "account-id", label: "Main account" }),
		});
		expect(updateUserExchangeAccount).toHaveBeenCalledWith(expect.anything(), {
			id: "account-id",
			label: "Main account",
			userId: "user-id",
		});
	});

	it("returns 409 when the label is already used for the exchange", async () => {
		vi.mocked(updateUserExchangeAccount).mockRejectedValue({ code: "23505" });

		const response = await patchExchangeToken({ label: "Duplicate" });

		expect(response.statusCode).toBe(409);
		expect(response.json()).toEqual({
			error: {
				code: "EXCHANGE_TOKEN_LABEL_TAKEN",
				message: "Exchange token label is already used for this exchange",
			},
		});
	});

	it("returns 400 when label is missing", async () => {
		const response = await patchExchangeToken({});

		expect(response.statusCode).toBe(400);
		expect(response.json()).toEqual({
			error: {
				code: "INVALID_EXCHANGE_TOKEN_LABEL",
				message: "Field `label` must be a non-empty string",
			},
		});
		expect(updateUserExchangeAccount).not.toHaveBeenCalled();
	});
});

const patchExchangeToken = async (body: object) => {
	const request = Object.assign(Readable.from([JSON.stringify(body)]), {
		headers: {
			authorization: "Bearer test-token",
			"x-csrf-token": "test-csrf",
		},
		method: "PATCH",
		url: "/portfolio/exchange-tokens?id=account-id",
	});
	const response = createMockResponse();

	await router(request as never, response as never);

	return response;
};

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

const createExchangeAccount = () => ({
	id: "account-id",
	userId: "user-id",
	exchange: "okx" as const,
	label: "Main account",
	status: "active" as const,
	publicData: {
		exchange: "okx" as const,
		permissions: ["balances" as const],
	},
	capabilities: { balances: true },
	createdAt: new Date("2026-01-01T00:00:00.000Z"),
	updatedAt: new Date("2026-06-19T00:00:00.000Z"),
});
