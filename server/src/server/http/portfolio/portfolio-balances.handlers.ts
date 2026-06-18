import type { IncomingMessage, ServerResponse } from "node:http";
import { getUserExchangeBalances } from "#services/portfolio/exchange-balances/exchange-balances.service";
import type { WalletBalanceNetwork, WalletBalancesQuery } from "#services/portfolio/wallet-balances/wallet-balances.types";
import { getWalletBalances } from "#services/portfolio/wallet-balances/wallet-balances.service";
import { ALL_WALLET_TOKENS } from "#services/portfolio/wallet-balances/wallet-balances.constants";
import {
	listUserExchangeAccounts,
	updateUserExchangeAccountPublicData,
	updateUserExchangeAccountStatus,
} from "#services/users/user-exchange-accounts/user-exchange-accounts.repository";
import type {
	UserExchangeAccount,
	UserExchangeFeeProfile,
} from "#services/users/user-exchange-accounts/user-exchange-accounts.types";
import { getAuthRequestToken } from "../auth/auth.utils";
import { writeJsonResponse } from "../http-response.utils";
import { parseWalletBalanceTokensQuery } from "./wallet-balances-query";
import { getUserPortfolioSources } from "./user-portfolio-sources.utils";
import {
	getPortfolioDependencies,
	getPortfolioUser,
} from "./user-wallet-tokens.utils";
import type { UserPortfolioBalancesResponse } from "./portfolio-balances.types";

/** Handles `GET /portfolio/balances/me` and returns wallet plus exchange-token balances. */
export const getMyPortfolioBalancesHandler = async (
	request: IncomingMessage,
	response: ServerResponse,
) => {
	const dependencies = getPortfolioDependencies();
	const user = await getPortfolioUser(
		dependencies.db,
		getAuthRequestToken(request),
	);
	const [sources, accounts] = await Promise.all([
		getUserPortfolioSources(dependencies.db, user.id),
		listUserExchangeAccounts(dependencies.db, user.id),
	]);
	const activeSources = sources.filter((source) => source.status === "active");
	const activeWalletNetworks = [...new Set(activeSources.map((source) => source.network))];
	const [walletBalances, exchangeBalances] = await Promise.all([
		activeSources.length > 0
			? getWalletBalances(createWalletBalancesQueryFromSources(
				activeSources,
				parseWalletBalanceTokensQuery(
					request.url,
					activeWalletNetworks,
					ALL_WALLET_TOKENS,
				),
			))
			: createEmptyWalletBalancesResponse(),
		getUserExchangeBalances(accounts, {
			onAccountChecked: (account) =>
				markSuccessfulExchangeBalanceCheck(dependencies.db, user.id, account.id),
			onAccountFailed: (account) =>
				markFailedExchangeBalanceCheck(dependencies.db, user.id, account.id),
			onFeeProfiles: (account, feeProfiles) =>
				saveExchangeFeeProfiles(dependencies.db, user.id, account, feeProfiles),
		}),
	]);
	const data: UserPortfolioBalancesResponse = {
		exchangeBalances,
		walletBalances,
	};

	writeJsonResponse(response, 200, data);
};

const createWalletBalancesQueryFromSources = (
	sources: {
		address: string;
		network: WalletBalanceNetwork;
	}[],
	tokens: WalletBalancesQuery["tokens"],
): WalletBalancesQuery => {
	const addressesByNetwork = sources.reduce<
		Partial<Record<WalletBalanceNetwork, string[]>>
	>((result, source) => {
		result[source.network] = [
			...(result[source.network] ?? []),
			source.address,
		];

		return result;
	}, {});
	const networks = Object.keys(addressesByNetwork) as WalletBalanceNetwork[];
	const addresses = networks.flatMap((network) => addressesByNetwork[network] ?? []);
	const primaryAddress = addresses[0] ?? "";
	const primaryNetwork = networks[0] ?? "evm";

	return {
		address: primaryAddress,
		addresses,
		addressesByNetwork,
		network: primaryNetwork,
		networks,
		tokens,
	};
};

const createEmptyWalletBalancesResponse = () => ({
	networks: [],
	tokens: [ALL_WALLET_TOKENS],
	balances: [],
	errors: [],
	sourceResults: [],
});

const markSuccessfulExchangeBalanceCheck = async (
	db: ReturnType<typeof getPortfolioDependencies>["db"],
	userId: string,
	accountId: string,
): Promise<void> => {
	await updateUserExchangeAccountStatus(db, {
		checkedAt: new Date(),
		id: accountId,
		status: "active",
		userId,
	});
};

const markFailedExchangeBalanceCheck = async (
	db: ReturnType<typeof getPortfolioDependencies>["db"],
	userId: string,
	accountId: string,
): Promise<void> => {
	await updateUserExchangeAccountStatus(db, {
		id: accountId,
		status: "error",
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
