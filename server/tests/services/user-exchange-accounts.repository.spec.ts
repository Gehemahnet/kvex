import { describe, expect, it, vi } from "vitest";
import type { Queryable } from "../../src/storage/postgres/postgres.client";
import {
	createUserExchangeAccount,
	findUserExchangeAccountById,
	listUserExchangeAccounts,
} from "#services/users/user-exchange-accounts/user-exchange-accounts.repository";
import type {
	UserExchangeAccountRow,
} from "../../src/services/users/user-exchange-accounts.types";

describe("user exchange accounts repository", () => {
	it("creates exchange accounts with typed public data and capabilities", async () => {
		const row = createAccountRow({
			exchange: "okx",
			label: "Main OKX",
			public_data: {
				exchange: "okx",
				accountLevel: "VIP 1",
				feeProfiles: [
					{
						instrumentType: "SWAP",
						makerFeeRate: 0.0002,
						source: "api",
						takerFeeRate: 0.0005,
					},
				],
			},
			capabilities: {
				fees: true,
			},
		});
		const db = createDbMock([row]);

		await expect(
			createUserExchangeAccount(db, {
				userId: row.user_id,
				exchange: "okx",
				label: " Main OKX ",
				publicData: {
					accountLevel: "VIP 1",
					feeProfiles: [
						{
							instrumentType: "SWAP",
							makerFeeRate: 0.0002,
							source: "api",
							takerFeeRate: 0.0005,
						},
					],
				},
				capabilities: {
					fees: true,
				},
			}),
		).resolves.toMatchObject({
			exchange: "okx",
			label: "Main OKX",
			publicData: {
				exchange: "okx",
				accountLevel: "VIP 1",
			},
			capabilities: {
				fees: true,
			},
		});
		const [, values] = db.query.mock.calls[0] as [string, string[]];

		expect(values.slice(0, 3)).toEqual([row.user_id, "okx", "Main OKX"]);
		expect(JSON.parse(values[3])).toEqual({
			exchange: "okx",
			accountLevel: "VIP 1",
			feeProfiles: [
				{
					instrumentType: "SWAP",
					makerFeeRate: 0.0002,
					source: "api",
					takerFeeRate: 0.0005,
				},
			],
		});
		expect(JSON.parse(values[4])).toEqual({
			fees: true,
		});
	});

	it("lists exchange accounts owned by a user", async () => {
		const rows = [
			createAccountRow({
				exchange: "hyperliquid",
				public_data: {
					exchange: "hyperliquid",
					address: "0x123",
				},
			}),
		];
		const db = createDbMock(rows);

		await expect(listUserExchangeAccounts(db, rows[0].user_id)).resolves.toEqual([
			expect.objectContaining({
				exchange: "hyperliquid",
				publicData: {
					exchange: "hyperliquid",
					address: "0x123",
				},
			}),
		]);
	});

	it("returns undefined when an exchange account is missing", async () => {
		const db = createDbMock([]);

		await expect(
			findUserExchangeAccountById(db, "user-id", "account-id"),
		).resolves.toBeUndefined();
	});
});

const createDbMock = (rows: UserExchangeAccountRow[]): Queryable & {
	query: ReturnType<typeof vi.fn>;
} => ({
	query: vi.fn(async () => ({ rows })),
});

const createAccountRow = (
	overrides: Partial<UserExchangeAccountRow> = {},
): UserExchangeAccountRow => ({
	id: "b7ca5c20-3221-4f24-9ccd-c9d9b7e5f926",
	user_id: "f8b76f9e-b8cf-4dd1-9e13-a35d769dc8d6",
	exchange: "okx",
	label: "OKX",
	status: "active",
	public_data: {
		exchange: "okx",
	},
	capabilities: {},
	last_checked_at: null,
	created_at: new Date("2026-06-06T00:00:00.000Z"),
	updated_at: new Date("2026-06-06T00:00:00.000Z"),
	...overrides,
});
