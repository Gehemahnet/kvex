import { describe, expect, it, vi } from "vitest";
import type { Queryable } from "../../src/storage/postgres/postgres.client";
import {
	createUserWalletToken,
	deleteUserWalletToken,
	listUserWalletTokens,
} from "#services/portfolio/user-wallet-tokens/user-wallet-tokens.repository";
import type { UserWalletTokenRow } from "../../src/services/portfolio/user-wallet-tokens.types";

describe("user wallet tokens repository", () => {
	it("creates wallet tokens and trims labels", async () => {
		const row = createTokenRow({
			label: "USDC",
			token: "0x2222222222222222222222222222222222222222",
		});
		const db = createDbMock([row]);

		await expect(
			createUserWalletToken(db, {
				label: " USDC ",
				network: "evm",
				token: row.token,
				userId: row.user_id,
			}),
		).resolves.toMatchObject({
			label: "USDC",
			network: "evm",
			token: row.token,
			userId: row.user_id,
		});
		const [, values] = db.query.mock.calls[0] as [string, unknown[]];

		expect(values).toEqual([row.user_id, "evm", row.token, "USDC"]);
	});

	it("lists wallet tokens by user and network", async () => {
		const rows = [createTokenRow({ token: "native" })];
		const db = createDbMock(rows);

		await expect(listUserWalletTokens(db, rows[0].user_id, "evm")).resolves.toEqual([
			expect.objectContaining({
				network: "evm",
				token: "native",
			}),
		]);
		expect(db.query.mock.calls[0]?.[1]).toEqual([rows[0].user_id, "evm"]);
	});

	it("returns whether a wallet token was deleted", async () => {
		await expect(
			deleteUserWalletToken(createDbMock([createTokenRow()]), {
				id: "token-id",
				userId: "user-id",
			}),
		).resolves.toBe(true);
		await expect(
			deleteUserWalletToken(createDbMock([]), {
				id: "token-id",
				userId: "user-id",
			}),
		).resolves.toBe(false);
	});
});

const createDbMock = (rows: UserWalletTokenRow[]): Queryable & {
	query: ReturnType<typeof vi.fn>;
} => ({
	query: vi.fn(async () => ({ rows })),
});

const createTokenRow = (
	overrides: Partial<UserWalletTokenRow> = {},
): UserWalletTokenRow => ({
	id: "a1b2c3d4-1111-4222-8333-444455556666",
	user_id: "f8b76f9e-b8cf-4dd1-9e13-a35d769dc8d6",
	network: "evm",
	token: "native",
	label: null,
	created_at: new Date("2026-06-12T00:00:00.000Z"),
	updated_at: new Date("2026-06-12T00:00:00.000Z"),
	...overrides,
});
