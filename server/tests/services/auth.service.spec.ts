import { describe, expect, it, vi } from "vitest";
import type { Queryable } from "../../src/storage/postgres/postgres.client";
import {
	getAuthenticatedUser,
	loginUser,
	confirmPasswordReset,
	logoutUser,
	refreshAuthSession,
	requestPasswordReset,
	registerUser,
} from "#services/auth/auth-service/auth.service";
import {
	hashPassword,
	hashPasswordResetToken,
	hashAuthSessionToken,
	hashCsrfToken,
	verifyPassword,
} from "#services/auth/auth-service/auth.crypto";
import type { UserRow } from "../../src/services/users/users.types";
import type { UserSessionRow } from "../../src/services/auth/auth-sessions.types";

describe("auth service", () => {
	it("registers users and returns a token", async () => {
		const row = createUserRow({
			login: "trader",
		});
		const db = createDbMock([[], [row], [createUserSessionRow()]]);

		const response = await registerUser(
			db,
			{
				email: "trader@example.com",
				login: " Trader ",
				password: "strong-password",
			},
			60 * 60,
		);

		expect(response.user).toEqual({
			id: row.id,
			email: row.email,
			login: "trader",
			status: "active",
		});
		expect(response.expiresAt).toBeTruthy();
		expect(response.token).toBeTruthy();
		expect(response.csrfToken).toBeTruthy();
		expect(db.query).toHaveBeenCalledTimes(3);
	});

	it("rejects duplicate registrations", async () => {
		const db = createDbMock([[createUserRow()]]);

		await expect(
			registerUser(
				db,
				{
					login: "user",
					password: "strong-password",
				},
				60 * 60,
			),
		).rejects.toThrow("Login is already registered");
	});

	it("logs users in with a valid password", async () => {
		const db = createDbMock([
			[
				createUserRow({
					password_hash: await hashPassword("strong-password"),
				}),
			],
			[createUserSessionRow()],
		]);

		await expect(
			loginUser(
				db,
				{
					login: "user",
					password: "strong-password",
				},
				60 * 60,
			),
		).resolves.toMatchObject({
			user: {
				login: "user",
			},
		});
	});

	it("resolves authenticated users from tokens", async () => {
		const row = createUserRow();
		const token = "session-token";
		const db = createDbMock([
			[createUserSessionRow({
				token_hash: hashAuthSessionToken(token),
			})],
			[row],
			[],
			[],
		]);

		await expect(getAuthenticatedUser(db, token)).resolves.toEqual({
			email: row.email,
			id: row.id,
			login: row.login,
			status: "active",
		});
	});

	it("rotates authenticated sessions with a valid csrf token", async () => {
		const row = createUserRow();
		const token = "session-token";
		const csrfToken = "csrf-token";
		const db = createDbMock([
			[createUserSessionRow({
				csrf_token_hash: hashCsrfToken(csrfToken),
				token_hash: hashAuthSessionToken(token),
			})],
			[row],
			[],
			[createUserSessionRow()],
		]);

		const response = await refreshAuthSession(db, {
			csrfToken,
			sessionTtlSeconds: 60 * 60,
			token,
		});

		expect(response.user.login).toBe(row.login);
		expect(response.token).toBeTruthy();
		expect(response.csrfToken).toBeTruthy();
		expect(response.token).not.toBe(token);
	});

	it("rejects logout with an invalid csrf token", async () => {
		const db = createDbMock([
			[createUserSessionRow({
				csrf_token_hash: hashCsrfToken("csrf-token"),
			})],
		]);

		await expect(
			logoutUser(db, {
				csrfToken: "wrong-token",
				token: "session-token",
			}),
		).rejects.toThrow("Invalid CSRF token");
	});

	it("requests password reset tokens without exposing missing users", async () => {
		const row = createUserRow();
		const existingUserDb = createDbMock([[row], []]);
		const missingUserDb = createDbMock([[]]);

		await expect(
			requestPasswordReset(existingUserDb, {
				login: row.login,
			}),
		).resolves.toMatchObject({
			issued: true,
		});
		await expect(
			requestPasswordReset(missingUserDb, {
				login: "missing",
			}),
		).resolves.toEqual({
			issued: false,
		});
	});

	it("confirms password reset tokens", async () => {
		const resetToken = "reset-token";
		const updateRows = [
			[
				{
					id: "reset-token-id",
					user_id: "f8b76f9e-b8cf-4dd1-9e13-a35d769dc8d6",
					token_hash: hashPasswordResetToken(resetToken),
					expires_at: new Date("2026-06-06T00:30:00.000Z"),
					used_at: null,
					created_at: new Date("2026-06-06T00:00:00.000Z"),
				},
			],
			[],
			[],
		];
		const db = createDbMock(updateRows);

		await confirmPasswordReset(db, {
			token: resetToken,
			password: "new-password",
		});

		expect(db.query).toHaveBeenNthCalledWith(
			1,
			expect.stringContaining("FROM password_reset_tokens"),
			[hashPasswordResetToken(resetToken)],
		);
		const [, updateValues] = db.query.mock.calls[1] as [string, string[]];

		await expect(verifyPassword("new-password", updateValues[1])).resolves.toBe(true);
	});
});

const createDbMock = (rowSets: Record<string, unknown>[][]): Queryable & {
	query: ReturnType<typeof vi.fn>;
} => {
	let index = 0;

	return {
		query: vi.fn(async () => ({ rows: rowSets[index++] ?? [] })),
	};
};

const createUserRow = (overrides: Partial<UserRow> = {}): UserRow => ({
	id: "f8b76f9e-b8cf-4dd1-9e13-a35d769dc8d6",
	login: "user",
	email: "user@example.com",
	password_hash: "hash",
	status: "active",
	created_at: new Date("2026-06-06T00:00:00.000Z"),
	updated_at: new Date("2026-06-06T00:00:00.000Z"),
	...overrides,
});

const createUserSessionRow = (
	overrides: Partial<UserSessionRow> = {},
): UserSessionRow => ({
	id: "a6c84f28-90d3-45e1-a470-63854742115b",
	user_id: "f8b76f9e-b8cf-4dd1-9e13-a35d769dc8d6",
	token_hash: hashAuthSessionToken("session-token"),
	csrf_token_hash: hashCsrfToken("csrf-token"),
	expires_at: new Date("2026-06-07T00:00:00.000Z"),
	revoked_at: null,
	last_seen_at: null,
	created_at: new Date("2026-06-06T00:00:00.000Z"),
	updated_at: new Date("2026-06-06T00:00:00.000Z"),
	...overrides,
});
