import type { Queryable } from "#storage/postgres/postgres.client";
import type {
	CreateUserPortfolioSourceInput,
	DeleteUserPortfolioSourceInput,
	UpdateUserPortfolioSourceInput,
	UserPortfolioSource,
	UserPortfolioSourceRow,
} from "./user-portfolio-sources.types";
import {
	mapUserPortfolioSourceRow,
	normalizePortfolioSourceAddress,
	normalizePortfolioSourceLabel,
} from "./user-portfolio-sources.utils";
import type { WalletBalanceNetwork } from "#services/portfolio/wallet-balances/wallet-balances.types";

/** Inserts or updates one wallet source owned by a user. */
export const createUserPortfolioSource = async (
	db: Queryable,
	input: CreateUserPortfolioSourceInput,
): Promise<UserPortfolioSource> => {
	const address = normalizePortfolioSourceAddress(input.network, input.address);
	const label = normalizePortfolioSourceLabel(input.label);
	const result = await db.query<UserPortfolioSourceRow>(
		`
			INSERT INTO user_portfolio_sources (
				user_id,
				type,
				network,
				address,
				label
			)
			VALUES ($1, 'wallet', $2, $3, $4)
			ON CONFLICT (user_id, network, (lower(address)))
			DO UPDATE SET
				label = EXCLUDED.label,
				status = 'active',
				updated_at = now()
			RETURNING
				id,
				user_id,
				type,
				network,
				address,
				label,
				status,
				created_at,
				updated_at
		`,
		[input.userId, input.network, address, label ?? null],
	);
	const row = result.rows[0];

	if (row === undefined) {
		throw new Error("User portfolio source insert returned no rows");
	}

	return mapUserPortfolioSourceRow(row);
};

/** Lists wallet sources saved by a user. */
export const listUserPortfolioSources = async (
	db: Queryable,
	params: {
		network?: WalletBalanceNetwork;
		userId: string;
	},
): Promise<UserPortfolioSource[]> => {
	const result = await db.query<UserPortfolioSourceRow>(
		`
			SELECT
				id,
				user_id,
				type,
				network,
				address,
				label,
				status,
				created_at,
				updated_at
			FROM user_portfolio_sources
			WHERE user_id = $1
				AND ($2::text IS NULL OR network = $2)
			ORDER BY network, lower(coalesce(label, address)), created_at
		`,
		[params.userId, params.network ?? null],
	);

	return result.rows.map(mapUserPortfolioSourceRow);
};

/** Updates mutable wallet source fields owned by a user. */
export const updateUserPortfolioSource = async (
	db: Queryable,
	input: UpdateUserPortfolioSourceInput,
): Promise<UserPortfolioSource | undefined> => {
	const label = normalizePortfolioSourceLabel(input.label);
	const result = await db.query<UserPortfolioSourceRow>(
		`
			UPDATE user_portfolio_sources
			SET
				label = COALESCE($3, label),
				status = COALESCE($4, status),
				updated_at = now()
			WHERE id = $1 AND user_id = $2
			RETURNING
				id,
				user_id,
				type,
				network,
				address,
				label,
				status,
				created_at,
				updated_at
		`,
		[input.id, input.userId, label ?? null, input.status ?? null],
	);
	const row = result.rows[0];

	return row === undefined ? undefined : mapUserPortfolioSourceRow(row);
};

/** Deletes one wallet source owned by a user. */
export const deleteUserPortfolioSource = async (
	db: Queryable,
	input: DeleteUserPortfolioSourceInput,
): Promise<boolean> => {
	const result = await db.query<{ id: string }>(
		`
			DELETE FROM user_portfolio_sources
			WHERE id = $1 AND user_id = $2
			RETURNING id
		`,
		[input.id, input.userId],
	);

	return result.rows.length > 0;
};
