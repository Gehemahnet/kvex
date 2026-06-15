import type { Queryable } from "#storage/postgres/postgres.client";

export type PasswordResetTokenRow = {
	id: string;
	user_id: string;
	token_hash: string;
	expires_at: Date;
	used_at: Date | null;
	created_at: Date;
};

/** Inserts a password reset token hash for a user. */
export const createPasswordResetTokenRecord = async (
	db: Queryable,
	params: {
		expiresAt: Date;
		tokenHash: string;
		userId: string;
	},
): Promise<void> => {
	await db.query(
		`
			INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
			VALUES ($1, $2, $3)
		`,
		[params.userId, params.tokenHash, params.expiresAt],
	);
};

/** Finds a usable password reset token by hash. */
export const findUsablePasswordResetToken = async (
	db: Queryable,
	tokenHash: string,
): Promise<PasswordResetTokenRow | undefined> => {
	const result = await db.query<PasswordResetTokenRow>(
		`
			SELECT id, user_id, token_hash, expires_at, used_at, created_at
			FROM password_reset_tokens
			WHERE token_hash = $1
				AND used_at IS NULL
				AND expires_at > now()
			LIMIT 1
		`,
		[tokenHash],
	);

	return result.rows[0];
};

/** Marks a password reset token as used. */
export const markPasswordResetTokenUsed = async (
	db: Queryable,
	tokenId: string,
): Promise<void> => {
	await db.query(
		`
			UPDATE password_reset_tokens
			SET used_at = now()
			WHERE id = $1
		`,
		[tokenId],
	);
};
