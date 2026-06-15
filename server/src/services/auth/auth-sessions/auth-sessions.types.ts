export type UserSessionRow = {
	id: string;
	user_id: string;
	token_hash: string;
	csrf_token_hash: string;
	expires_at: Date;
	revoked_at: Date | null;
	last_seen_at: Date | null;
	created_at: Date;
	updated_at: Date;
};

export type AuthSessionRecord = {
	csrfTokenHash: string;
	expiresAt: Date;
	id: string;
	tokenHash: string;
	userId: string;
};

export type CreateAuthSessionInput = {
	csrfTokenHash: string;
	expiresAt: Date;
	tokenHash: string;
	userId: string;
};
