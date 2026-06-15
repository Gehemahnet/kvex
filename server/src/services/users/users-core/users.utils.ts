import type { User, UserRow } from "./users.types";

/** Normalizes a user login before persistence and lookup. */
export const normalizeUserLogin = (login: string): string =>
	login.trim().toLowerCase();

/** Normalizes optional user email before persistence and lookup. */
export const normalizeUserEmail = (email: string): string =>
	email.trim().toLowerCase();

/** Maps a database user row into the domain user model. */
export const mapUserRow = (row: UserRow): User => ({
	id: row.id,
	login: row.login,
	...(row.email === null ? {} : { email: row.email }),
	passwordHash: row.password_hash,
	status: row.status,
	createdAt: row.created_at,
	updatedAt: row.updated_at,
});
