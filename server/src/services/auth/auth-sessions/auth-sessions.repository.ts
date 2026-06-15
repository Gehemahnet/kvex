import type { Queryable } from "#storage/postgres/postgres.client";
import type {
	AuthSessionRecord,
	CreateAuthSessionInput,
	UserSessionRow,
} from "./auth-sessions.types";

/** Persists a user session hash pair and returns the stored session. */
export const createAuthSessionRecord = async (
	db: Queryable,
	input: CreateAuthSessionInput,
): Promise<AuthSessionRecord> => {
	const { rows } = await db.query<UserSessionRow>(
		`
			INSERT INTO user_sessions (user_id, token_hash, csrf_token_hash, expires_at)
			VALUES ($1, $2, $3, $4)
			RETURNING id, user_id, token_hash, csrf_token_hash, expires_at, revoked_at, last_seen_at, created_at, updated_at
		`,
		[input.userId, input.tokenHash, input.csrfTokenHash, input.expiresAt],
	);

	return mapUserSessionRow(rows[0]);
};

/** Finds a currently usable user session by token hash. */
export const findActiveAuthSessionByTokenHash = async (
	db: Queryable,
	tokenHash: string,
): Promise<AuthSessionRecord | undefined> => {
	const { rows } = await db.query<UserSessionRow>(
		`
			SELECT id, user_id, token_hash, csrf_token_hash, expires_at, revoked_at, last_seen_at, created_at, updated_at
			FROM user_sessions
			WHERE token_hash = $1
				AND revoked_at IS NULL
				AND expires_at > now()
			LIMIT 1
		`,
		[tokenHash],
	);

	return rows[0] === undefined ? undefined : mapUserSessionRow(rows[0]);
};

/** Marks a session as seen by the server for observability and future cleanup. */
export const touchAuthSession = async (
	db: Queryable,
	sessionId: string,
): Promise<void> => {
	await db.query(
		`
			UPDATE user_sessions
			SET last_seen_at = now(), updated_at = now()
			WHERE id = $1
		`,
		[sessionId],
	);
};

/** Revokes a single active session. */
export const revokeAuthSession = async (
	db: Queryable,
	sessionId: string,
): Promise<void> => {
	await db.query(
		`
			UPDATE user_sessions
			SET revoked_at = COALESCE(revoked_at, now()), updated_at = now()
			WHERE id = $1
		`,
		[sessionId],
	);
};

/** Updates the CSRF hash for an existing session after safe token regeneration. */
export const updateAuthSessionCsrfTokenHash = async (
	db: Queryable,
	params: {
		csrfTokenHash: string;
		sessionId: string;
	},
): Promise<void> => {
	await db.query(
		`
			UPDATE user_sessions
			SET csrf_token_hash = $2, updated_at = now()
			WHERE id = $1
		`,
		[params.sessionId, params.csrfTokenHash],
	);
};

const mapUserSessionRow = (row: UserSessionRow): AuthSessionRecord => ({
	csrfTokenHash: row.csrf_token_hash,
	expiresAt: row.expires_at,
	id: row.id,
	tokenHash: row.token_hash,
	userId: row.user_id,
});
