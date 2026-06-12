import type { Queryable } from "../../storage/postgres/postgres.client";
import type {
	CreateUserWalletTokenInput,
	DeleteUserWalletTokenInput,
	UserWalletToken,
	UserWalletTokenRow,
} from "./user-wallet-tokens.types";
import {
	mapUserWalletTokenRow,
	normalizeWalletTokenLabel,
} from "./user-wallet-tokens.utils";
import type { WalletBalanceNetwork } from "./wallet-balances.types";

/** Inserts a token into the authenticated user's wallet token watchlist. */
export const createUserWalletToken = async (
	db: Queryable,
	input: CreateUserWalletTokenInput,
): Promise<UserWalletToken> => {
	const label = normalizeWalletTokenLabel(input.label);
	const result = await db.query<UserWalletTokenRow>(
		`
			INSERT INTO user_wallet_tokens (
				user_id,
				network,
				token,
				label
			)
			VALUES ($1, $2, $3, $4)
			ON CONFLICT (user_id, network, token)
			DO UPDATE SET
				label = EXCLUDED.label,
				updated_at = now()
			RETURNING
				id,
				user_id,
				network,
				token,
				label,
				created_at,
				updated_at
		`,
		[
			input.userId,
			input.network,
			input.token,
			label ?? null,
		],
	);
	const row = result.rows[0];

	if (row === undefined) {
		throw new Error("User wallet token insert returned no rows");
	}

	return mapUserWalletTokenRow(row);
};

/** Lists wallet tokens saved by a user for one network. */
export const listUserWalletTokens = async (
	db: Queryable,
	userId: string,
	network: WalletBalanceNetwork,
): Promise<UserWalletToken[]> => {
	const result = await db.query<UserWalletTokenRow>(
		`
			SELECT
				id,
				user_id,
				network,
				token,
				label,
				created_at,
				updated_at
			FROM user_wallet_tokens
			WHERE user_id = $1 AND network = $2
			ORDER BY lower(coalesce(label, token)), created_at
		`,
		[userId, network],
	);

	return result.rows.map(mapUserWalletTokenRow);
};

/** Deletes a saved wallet token owned by a user. */
export const deleteUserWalletToken = async (
	db: Queryable,
	input: DeleteUserWalletTokenInput,
): Promise<boolean> => {
	const result = await db.query<{ id: string }>(
		`
			DELETE FROM user_wallet_tokens
			WHERE id = $1 AND user_id = $2
			RETURNING id
		`,
		[input.id, input.userId],
	);

	return result.rows.length > 0;
};
