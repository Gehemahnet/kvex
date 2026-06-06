import type { Queryable } from "../../storage/postgres/postgres.client";
import type {
	CreateUserExchangeAccountInput,
	UserExchangeAccount,
	UserExchangeAccountRow,
} from "./user-exchange-accounts.types";
import {
	createUserExchangeData,
	mapUserExchangeAccountRow,
	normalizeUserExchangeAccountLabel,
} from "./user-exchange-accounts.utils";

/** Inserts a read-only exchange account profile for a user. */
export const createUserExchangeAccount = async (
	db: Queryable,
	input: CreateUserExchangeAccountInput,
): Promise<UserExchangeAccount> => {
	const publicData = createUserExchangeData(input.exchange, input.publicData);
	const result = await db.query<UserExchangeAccountRow>(
		`
			INSERT INTO user_exchange_accounts (
				user_id,
				exchange,
				label,
				public_data,
				capabilities
			)
			VALUES ($1, $2, $3, $4::jsonb, $5::jsonb)
			RETURNING
				id,
				user_id,
				exchange,
				label,
				status,
				public_data,
				capabilities,
				last_checked_at,
				created_at,
				updated_at
		`,
		[
			input.userId,
			input.exchange,
			normalizeUserExchangeAccountLabel(input.label),
			JSON.stringify(publicData),
			JSON.stringify(input.capabilities ?? {}),
		],
	);
	const row = result.rows[0];

	if (row === undefined) {
		throw new Error("User exchange account insert returned no rows");
	}

	return mapUserExchangeAccountRow(row);
};

/** Lists exchange account profiles owned by a user. */
export const listUserExchangeAccounts = async (
	db: Queryable,
	userId: string,
): Promise<UserExchangeAccount[]> => {
	const result = await db.query<UserExchangeAccountRow>(
		`
			SELECT
				id,
				user_id,
				exchange,
				label,
				status,
				public_data,
				capabilities,
				last_checked_at,
				created_at,
				updated_at
			FROM user_exchange_accounts
			WHERE user_id = $1
			ORDER BY exchange, lower(label), created_at
		`,
		[userId],
	);

	return result.rows.map(mapUserExchangeAccountRow);
};

/** Finds one exchange account profile by id and owner. */
export const findUserExchangeAccountById = async (
	db: Queryable,
	userId: string,
	accountId: string,
): Promise<UserExchangeAccount | undefined> => {
	const result = await db.query<UserExchangeAccountRow>(
		`
			SELECT
				id,
				user_id,
				exchange,
				label,
				status,
				public_data,
				capabilities,
				last_checked_at,
				created_at,
				updated_at
			FROM user_exchange_accounts
			WHERE user_id = $1 AND id = $2
			LIMIT 1
		`,
		[userId, accountId],
	);
	const row = result.rows[0];

	return row === undefined ? undefined : mapUserExchangeAccountRow(row);
};
