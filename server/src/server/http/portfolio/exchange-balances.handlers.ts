import type { IncomingMessage, ServerResponse } from "node:http";
import { getUserExchangeBalances } from "#services/portfolio/exchange-balances/exchange-balances.service";
import {
	listUserExchangeAccounts,
	updateUserExchangeAccountLastCheckedAt,
	updateUserExchangeAccountPublicData,
} from "#services/users/user-exchange-accounts/user-exchange-accounts.repository";
import type {
	UserExchangeAccount,
	UserExchangeFeeProfile,
} from "#services/users/user-exchange-accounts/user-exchange-accounts.types";
import {
	getAuthRequestToken,
} from "../auth/auth.utils";
import { writeJsonResponse } from "../http-response.utils";
import {
	getPortfolioDependencies,
	getPortfolioUser,
} from "./user-wallet-tokens.utils";

/** Handles `GET /portfolio/exchange-balances/me` for saved user exchange accounts. */
export const getMyExchangeBalancesHandler = async (
	request: IncomingMessage,
	response: ServerResponse,
) => {
	const dependencies = getPortfolioDependencies();
	const user = await getPortfolioUser(
		dependencies.db,
		getAuthRequestToken(request),
	);
	const accounts = await listUserExchangeAccounts(dependencies.db, user.id);
	const data = await getUserExchangeBalances(accounts, {
		onAccountChecked: (account) =>
			markSuccessfulExchangeBalanceCheck(dependencies.db, user.id, account.id),
		onFeeProfiles: (account, feeProfiles) =>
			saveExchangeFeeProfiles(dependencies.db, user.id, account, feeProfiles),
	});

	writeJsonResponse(response, 200, data);
};

const markSuccessfulExchangeBalanceCheck = async (
	db: ReturnType<typeof getPortfolioDependencies>["db"],
	userId: string,
	accountId: string,
): Promise<void> => {
	await updateUserExchangeAccountLastCheckedAt(db, {
		checkedAt: new Date(),
		id: accountId,
		userId,
	});
};

const saveExchangeFeeProfiles = async (
	db: ReturnType<typeof getPortfolioDependencies>["db"],
	userId: string,
	account: UserExchangeAccount,
	feeProfiles: UserExchangeFeeProfile[],
): Promise<void> => {
	if (feeProfiles.length === 0) {
		return;
	}

	await updateUserExchangeAccountPublicData(db, {
		id: account.id,
		publicData: {
			...account.publicData,
			feeProfiles,
		},
		userId,
	});
};
