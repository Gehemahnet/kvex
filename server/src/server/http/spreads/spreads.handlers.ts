import type { IncomingMessage, ServerResponse } from "node:http";
import type { Exchange } from "#common/types";
import { getAuthenticatedUser } from "#services/auth/auth-service/auth.service";
import { getUserExchangeBalances } from "#services/portfolio/exchange-balances/exchange-balances.service";
import type { UserExchangeBalanceResult } from "#services/portfolio/exchange-balances/exchange-balances.types";
import { getSpreads } from "#services/spreads/spreads-core/spreads.service";
import type {
	SpreadBalanceProfile,
	SpreadFeeProfile,
	SpreadsResponse,
} from "#services/spreads/spreads-core/spreads.types";
import { listUserExchangeAccounts } from "#services/users/user-exchange-accounts/user-exchange-accounts.repository";
import { getPostgresPool } from "#storage/postgres/postgres.client";
import { getOptionalAuthRequestToken } from "../auth/auth.utils";
import { writeJsonResponse } from "../http-response.utils";
import { parseSpreadsQuery } from "./spreads-query";

/** Handles `GET /spreads` and returns ranked spread opportunities. */
export const getSpreadsHandler = async (
	request: IncomingMessage,
	response: ServerResponse,
) => {
	const query = parseSpreadsQuery(request.url);
	const userContext = await getOptionalUserSpreadContext(request);
	const data: SpreadsResponse = await getSpreads(query, userContext);

	writeJsonResponse(response, 200, data);
};

const getOptionalUserSpreadContext = async (
	request: IncomingMessage,
): Promise<{
	balanceProfiles: SpreadBalanceProfile[];
	feeProfiles: SpreadFeeProfile[];
}> => {
	try {
		const token = getOptionalAuthRequestToken(request);
		const db = getPostgresPool();

		if (token === undefined || db === undefined) {
			return { balanceProfiles: [], feeProfiles: [] };
		}

		const user = await getAuthenticatedUser(db, token);
		const accounts = await listUserExchangeAccounts(db, user.id);
		const balances = await getUserExchangeBalances(accounts);

		return {
			balanceProfiles: createSpreadBalanceProfiles(balances.balances),
			feeProfiles: accounts.flatMap((account) =>
				(account.publicData.feeProfiles ?? []).map((feeProfile) => ({
					...feeProfile,
					exchange: account.exchange,
				}))
			),
		};
	} catch {
		return { balanceProfiles: [], feeProfiles: [] };
	}
};

const createSpreadBalanceProfiles = (
	balances: UserExchangeBalanceResult[],
): SpreadBalanceProfile[] => {
	const profiles = new Map<Exchange, number>();

	for (const balance of balances) {
		const availableNotionalUsd = getExchangeAvailableNotionalUsd(balance);
		const previousValue = profiles.get(balance.exchange) ?? 0;

		if (availableNotionalUsd > previousValue) {
			profiles.set(balance.exchange, availableNotionalUsd);
		}
	}

	return [...profiles.entries()].map(([exchange, availableNotionalUsd]) => ({
		exchange,
		availableNotionalUsd,
	}));
};

const getExchangeAvailableNotionalUsd = (
	balance: UserExchangeBalanceResult,
): number => {
	if (balance.totalValueUsd !== undefined && balance.totalValueUsd > 0) {
		return balance.totalValueUsd;
	}

	return balance.assets.reduce((total, asset) => {
		const valueUsd = asset.valueUsd ??
			parseStableAssetAmount(asset.available ?? asset.equity ?? asset.total, asset.asset);

		return total + (valueUsd ?? 0);
	}, 0);
};

const parseStableAssetAmount = (
	value: string | undefined,
	asset: string,
): number | undefined => {
	if (
		value === undefined ||
		!["USD", "USDC", "USDT"].includes(asset.trim().toUpperCase())
	) {
		return undefined;
	}

	const parsed = Number.parseFloat(value);

	return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};
