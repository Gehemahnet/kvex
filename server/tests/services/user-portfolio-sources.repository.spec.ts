import { describe, expect, it, vi } from "vitest";
import type { Queryable } from "../../src/storage/postgres/postgres.client";
import {
	createUserPortfolioSource,
	deleteUserPortfolioSource,
	listUserPortfolioSources,
	updateUserPortfolioSource,
} from "../../src/services/portfolio/user-portfolio-sources.repository";
import type { UserPortfolioSourceRow } from "../../src/services/portfolio/user-portfolio-sources.types";

describe("user portfolio sources repository", () => {
	it("creates wallet sources and trims labels", async () => {
		const row = createSourceRow({
			label: "Main",
		});
		const db = createDbMock([row]);

		await expect(
			createUserPortfolioSource(db, {
				address: "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
				label: " Main ",
				network: "evm",
				userId: row.user_id,
			}),
		).resolves.toMatchObject({
			address: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
			label: "Main",
			network: "evm",
			userId: row.user_id,
		});
		const [, values] = db.query.mock.calls[0] as [string, unknown[]];

		expect(values).toEqual([
			row.user_id,
			"evm",
			"0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
			"Main",
		]);
	});

	it("lists wallet sources by user and optional network", async () => {
		const rows = [createSourceRow()];
		const db = createDbMock(rows);

		await expect(
			listUserPortfolioSources(db, {
				network: "evm",
				userId: rows[0].user_id,
			}),
		).resolves.toEqual([
			expect.objectContaining({
				network: "evm",
				status: "active",
			}),
		]);
		expect(db.query.mock.calls[0]?.[1]).toEqual([rows[0].user_id, "evm"]);
	});

	it("updates wallet sources", async () => {
		const row = createSourceRow({ label: "Updated", status: "disabled" });
		const db = createDbMock([row]);

		await expect(
			updateUserPortfolioSource(db, {
				id: row.id,
				label: " Updated ",
				status: "disabled",
				userId: row.user_id,
			}),
		).resolves.toMatchObject({
			label: "Updated",
			status: "disabled",
		});
		expect(db.query.mock.calls[0]?.[1]).toEqual([
			row.id,
			row.user_id,
			"Updated",
			"disabled",
		]);
	});

	it("returns whether a wallet source was deleted", async () => {
		await expect(
			deleteUserPortfolioSource(createDbMock([createSourceRow()]), {
				id: "source-id",
				userId: "user-id",
			}),
		).resolves.toBe(true);
		await expect(
			deleteUserPortfolioSource(createDbMock([]), {
				id: "source-id",
				userId: "user-id",
			}),
		).resolves.toBe(false);
	});
});

const createDbMock = (rows: UserPortfolioSourceRow[]): Queryable & {
	query: ReturnType<typeof vi.fn>;
} => ({
	query: vi.fn(async () => ({ rows })),
});

const createSourceRow = (
	overrides: Partial<UserPortfolioSourceRow> = {},
): UserPortfolioSourceRow => ({
	id: "a1b2c3d4-1111-4222-8333-444455556666",
	user_id: "f8b76f9e-b8cf-4dd1-9e13-a35d769dc8d6",
	type: "wallet",
	network: "evm",
	address: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
	label: null,
	status: "active",
	created_at: new Date("2026-06-12T00:00:00.000Z"),
	updated_at: new Date("2026-06-12T00:00:00.000Z"),
	...overrides,
});
