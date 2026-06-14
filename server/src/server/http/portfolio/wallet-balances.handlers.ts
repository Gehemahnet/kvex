import type { IncomingMessage, ServerResponse } from "node:http";
import { getWalletBalances } from "../../../services/portfolio/wallet-balances.service";
import type {
	WalletBalanceNetwork,
	WalletBalancesQuery,
	WalletBalancesResponse,
} from "../../../services/portfolio/wallet-balances.types";
import {
	getAuthRequestToken,
} from "../auth/auth.utils";
import {
	getPortfolioDependencies,
	getPortfolioUser,
} from "./user-wallet-tokens.utils";
import {
	getUserPortfolioSources,
} from "./user-portfolio-sources.utils";
import { BadRequestError } from "../http-errors";
import { ALL_WALLET_TOKENS } from "../../../services/portfolio/wallet-balances.constants";
import { writeJsonResponse } from "../http-response.utils";
import {
	parseWalletBalancesQuery,
	parseWalletBalanceTokensQuery,
} from "./wallet-balances-query";

/** Handles `GET /portfolio/wallet-balances` for public wallet/token balance reads. */
export const getWalletBalancesHandler = async (
	request: IncomingMessage,
	response: ServerResponse,
) => {
	const query = parseWalletBalancesQuery(request.url);
	const data: WalletBalancesResponse = await getWalletBalances(query);

	writeJsonResponse(response, 200, data);
};

/** Handles `GET /portfolio/wallet-balances/me` using saved user wallet sources. */
export const getMyWalletBalancesHandler = async (
	request: IncomingMessage,
	response: ServerResponse,
) => {
	const dependencies = getPortfolioDependencies();
	const user = await getPortfolioUser(
		dependencies.db,
		getAuthRequestToken(request),
	);
	const sources = (await getUserPortfolioSources(dependencies.db, user.id))
		.filter((source) => source.status === "active");

	if (sources.length === 0) {
		throw new BadRequestError(
			"No active portfolio sources found for current user",
			"MISSING_PORTFOLIO_SOURCES",
		);
	}

	const networks = [...new Set(sources.map((source) => source.network))];
	const query = createWalletBalancesQueryFromSources(
		sources,
		parseWalletBalanceTokensQuery(
			request.url,
			networks,
			ALL_WALLET_TOKENS,
		),
	);
	const data: WalletBalancesResponse = await getWalletBalances(query);

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
	const primaryAddress = addresses[0];
	const primaryNetwork = networks[0];

	if (!primaryAddress || !primaryNetwork) {
		throw new BadRequestError(
			"No active portfolio sources found for current user",
			"MISSING_PORTFOLIO_SOURCES",
		);
	}

	return {
		address: primaryAddress,
		addresses,
		addressesByNetwork,
		network: primaryNetwork,
		networks,
		tokens,
	};
};
