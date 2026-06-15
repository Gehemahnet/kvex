import type { Queryable } from "#storage/postgres/postgres.client";
import type { CreateUserInput, User, UserRow } from "./users.types";
import { mapUserRow, normalizeUserEmail, normalizeUserLogin } from "./users.utils";

/** Inserts a new local KVEX user with a precomputed password hash. */
export const createUser = async (
	db: Queryable,
	input: CreateUserInput,
): Promise<User> => {
	const result = await db.query<UserRow>(
		`
			INSERT INTO users (login, email, password_hash)
			VALUES ($1, $2, $3)
			RETURNING id, login, email, password_hash, status, created_at, updated_at
		`,
		[
			normalizeUserLogin(input.login),
			input.email === undefined ? null : normalizeUserEmail(input.email),
			input.passwordHash,
		],
	);
	const row = result.rows[0];

	if (row === undefined) {
		throw new Error("User insert returned no rows");
	}

	return mapUserRow(row);
};

/** Finds an active or disabled user by normalized login. */
export const findUserByLogin = async (
	db: Queryable,
	login: string,
): Promise<User | undefined> => {
	const result = await db.query<UserRow>(
		`
			SELECT id, login, email, password_hash, status, created_at, updated_at
			FROM users
			WHERE login = $1
			LIMIT 1
		`,
		[normalizeUserLogin(login)],
	);
	const row = result.rows[0];

	return row === undefined ? undefined : mapUserRow(row);
};

/** Finds an active or disabled user by id. */
export const findUserById = async (
	db: Queryable,
	id: string,
): Promise<User | undefined> => {
	const result = await db.query<UserRow>(
		`
			SELECT id, login, email, password_hash, status, created_at, updated_at
			FROM users
			WHERE id = $1
			LIMIT 1
		`,
		[id],
	);
	const row = result.rows[0];

	return row === undefined ? undefined : mapUserRow(row);
};

/** Updates a user's password hash after a successful reset flow. */
export const updateUserPasswordHash = async (
	db: Queryable,
	params: {
		passwordHash: string;
		userId: string;
	},
): Promise<void> => {
	await db.query(
		`
			UPDATE users
			SET password_hash = $2,
				updated_at = now()
			WHERE id = $1
		`,
		[params.userId, params.passwordHash],
	);
};
