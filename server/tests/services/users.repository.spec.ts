import { describe, expect, it, vi } from "vitest";
import type { Queryable } from "../../src/storage/postgres/postgres.client";
import {
	createUser,
	findUserById,
	findUserByLogin,
} from "../../src/services/users/users.repository";
import type { UserRow } from "../../src/services/users/users.types";

describe("users repository", () => {
	it("creates users with normalized login", async () => {
		const row = createUserRow({
			email: "alice@example.com",
			login: "alice",
		});
		const db = createDbMock([row]);

		await expect(
			createUser(db, {
				email: " Alice@Example.COM ",
				login: " Alice ",
				passwordHash: "hash",
			}),
		).resolves.toMatchObject({
			id: row.id,
			email: "alice@example.com",
			login: "alice",
			passwordHash: "hash",
			status: "active",
		});
		expect(db.query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO users"), [
			"alice",
			"alice@example.com",
			"hash",
		]);
	});

	it("finds users by normalized login", async () => {
		const row = createUserRow({
			login: "alice",
		});
		const db = createDbMock([row]);

		await expect(findUserByLogin(db, " ALICE ")).resolves.toMatchObject({
			id: row.id,
			login: "alice",
		});
		expect(db.query).toHaveBeenCalledWith(expect.stringContaining("WHERE login = $1"), [
			"alice",
		]);
	});

	it("returns undefined when a user id is missing", async () => {
		const db = createDbMock([]);

		await expect(findUserById(db, "missing")).resolves.toBeUndefined();
	});
});

const createDbMock = (rows: UserRow[]): Queryable & {
	query: ReturnType<typeof vi.fn>;
} => ({
	query: vi.fn(async () => ({ rows })),
});

const createUserRow = (
	overrides: Partial<UserRow> = {},
): UserRow => ({
	id: "f8b76f9e-b8cf-4dd1-9e13-a35d769dc8d6",
	login: "user",
	email: null,
	password_hash: "hash",
	status: "active",
	created_at: new Date("2026-06-05T00:00:00.000Z"),
	updated_at: new Date("2026-06-05T00:00:00.000Z"),
	...overrides,
});
