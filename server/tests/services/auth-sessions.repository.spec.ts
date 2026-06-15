import { describe, expect, it, vi } from "vitest";
import {
	createAuthSessionRecord,
	findActiveAuthSessionByTokenHash,
	revokeAuthSession,
	touchAuthSession,
	updateAuthSessionCsrfTokenHash,
} from "#services/auth/auth-sessions/auth-sessions.repository";
import type { UserSessionRow } from "../../src/services/auth/auth-sessions.types";
import type { Queryable } from "../../src/storage/postgres/postgres.client";

describe("auth sessions repository", () => {
	it("creates and maps auth sessions", async () => {
		const row = createUserSessionRow();
		const db = createDbMock([[row]]);

		await expect(createAuthSessionRecord(db, {
			csrfTokenHash: row.csrf_token_hash,
			expiresAt: row.expires_at,
			tokenHash: row.token_hash,
			userId: row.user_id,
		})).resolves.toEqual({
			csrfTokenHash: row.csrf_token_hash,
			expiresAt: row.expires_at,
			id: row.id,
			tokenHash: row.token_hash,
			userId: row.user_id,
		});
	});

	it("finds only active sessions by token hash", async () => {
		const row = createUserSessionRow();
		const db = createDbMock([[row], []]);

		await expect(findActiveAuthSessionByTokenHash(db, row.token_hash))
			.resolves.toMatchObject({ id: row.id });
		await expect(findActiveAuthSessionByTokenHash(db, "missing"))
			.resolves.toBeUndefined();
	});

	it("updates session metadata", async () => {
		const db = createDbMock([[], [], []]);

		await touchAuthSession(db, "session-id");
		await revokeAuthSession(db, "session-id");
		await updateAuthSessionCsrfTokenHash(db, {
			csrfTokenHash: "csrf-hash",
			sessionId: "session-id",
		});

		expect(db.query).toHaveBeenCalledTimes(3);
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

const createUserSessionRow = (
	overrides: Partial<UserSessionRow> = {},
): UserSessionRow => ({
	id: "a6c84f28-90d3-45e1-a470-63854742115b",
	user_id: "f8b76f9e-b8cf-4dd1-9e13-a35d769dc8d6",
	token_hash: "token-hash",
	csrf_token_hash: "csrf-token-hash",
	expires_at: new Date("2026-06-07T00:00:00.000Z"),
	revoked_at: null,
	last_seen_at: null,
	created_at: new Date("2026-06-06T00:00:00.000Z"),
	updated_at: new Date("2026-06-06T00:00:00.000Z"),
	...overrides,
});
