import {
	listExchangeAccountsForFeeRefresh,
	updateUserExchangeAccountPublicData,
} from "#services/users/user-exchange-accounts/user-exchange-accounts.repository";
import type { Queryable } from "#storage/postgres/postgres.client";
import { getPostgresPool } from "#storage/postgres/postgres.client";
import { EXCHANGE_FEE_PROFILE_REFRESH_INTERVAL_MS } from "./exchange-balances.constants";
import { refreshUserExchangeFeeProfiles } from "./exchange-balances.service";

/** Refreshes expired account fee profiles while keeping individual failures isolated. */
export const refreshExchangeFeeProfiles = async (db: Queryable): Promise<void> => {
	const accounts = await listExchangeAccountsForFeeRefresh(db);

	await Promise.all(accounts.map(async (account) => {
		try {
			const feeProfiles = await refreshUserExchangeFeeProfiles(account);

			if (feeProfiles === undefined || feeProfiles.length === 0) {
				return;
			}

			await updateUserExchangeAccountPublicData(db, {
				id: account.id,
				publicData: { ...account.publicData, feeProfiles },
				userId: account.userId,
			});
		} catch {
			// One account must not prevent refreshes for the remaining accounts.
		}
	}));
};

/** Starts the periodic fee-profile refresh when Postgres is configured. */
export const startExchangeFeeProfileRefreshJob = (): void => {
	const db = getPostgresPool();

	if (db === undefined) {
		return;
	}

	let isRunning = false;
	const refresh = async () => {
		if (isRunning) {
			return;
		}

		isRunning = true;

		try {
			await refreshExchangeFeeProfiles(db);
		} catch {
			// A later interval retries database or exchange failures.
		} finally {
			isRunning = false;
		}
	};

	void refresh();
	const timer = setInterval(
		() => void refresh(),
		EXCHANGE_FEE_PROFILE_REFRESH_INTERVAL_MS,
	);
	timer.unref();
};
