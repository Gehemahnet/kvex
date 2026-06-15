import {
	apiDelete,
	apiGet,
	apiPatch,
	apiPost,
} from "../api-client";
import type {
	AssetPrice,
	AssetPricesResponse,
	CreateUserPortfolioSourcesRequest,
	CreateUserExchangeTokensRequest,
	UpdateUserPortfolioSourceRequest,
	UserExchangeToken,
	UserExchangeTokensResponse,
	UserPortfolioSource,
	UserPortfolioSourceResponse,
	UserPortfolioSourcesResponse,
	UserExchangeBalancesResponse,
	WalletBalanceNetwork,
	WalletBalancesResponse,
	WalletBalanceTokenInput,
} from "./portfolio.types";

export type WalletBalancesRequestParams = {
	evmAddresses: string[];
	networks: WalletBalanceNetwork[];
	solanaAddresses: string[];
	tokens: WalletBalanceTokenInput[];
};

export type AssetPricesRequestParams = {
	symbols: string[];
};

export type UserPortfolioSourcesRequestParams = {
	network?: WalletBalanceNetwork;
};

export type UserWalletBalancesRequestParams = {
	tokens: WalletBalanceTokenInput[];
};

export const portfolioApi = {
	/** Builds the asset prices endpoint URL. */
	createAssetPricesUrl: (params: AssetPricesRequestParams): string => {
		const query = new URLSearchParams();

		query.set("symbols", params.symbols.join(","));

		return `/api/portfolio/prices?${query.toString()}`;
	},

	/** Builds the wallet balances endpoint URL. */
	createWalletBalancesUrl: (params: WalletBalancesRequestParams): string => {
		const query = new URLSearchParams();

		query.set("networks", params.networks.join(","));
		if (params.evmAddresses.length) {
			query.set("evmAddresses", params.evmAddresses.join(","));
		}
		if (params.solanaAddresses.length) {
			query.set("solanaAddresses", params.solanaAddresses.join(","));
		}
		query.set("tokens", params.tokens.join(","));

		return `/api/portfolio/wallet-balances?${query.toString()}`;
	},

	/** Builds the current-user wallet balances endpoint URL. */
	createUserWalletBalancesUrl: (
		params: UserWalletBalancesRequestParams,
	): string => {
		const query = new URLSearchParams();

		query.set("tokens", params.tokens.join(","));

		return `/api/portfolio/wallet-balances/me?${query.toString()}`;
	},

	/** Builds the current-user portfolio sources endpoint URL. */
	createUserPortfolioSourcesUrl: (
		params: UserPortfolioSourcesRequestParams = {},
	): string => {
		const query = new URLSearchParams();

		if (params.network) {
			query.set("network", params.network);
		}

		const queryString = query.toString();

		return queryString
			? `/api/portfolio/sources?${queryString}`
			: "/api/portfolio/sources";
	},

	/** Fetches best-effort USD prices for portfolio asset symbols. */
	getAssetPrices: (params: AssetPricesRequestParams): Promise<AssetPrice[]> =>
		apiGet<AssetPricesResponse>(portfolioApi.createAssetPricesUrl(params))
			.then((body) => body.prices),

	/** Fetches balances for one or more wallets across selected networks. */
	getWalletBalances: (
		params: WalletBalancesRequestParams,
	): Promise<WalletBalancesResponse> =>
		apiGet<WalletBalancesResponse>(portfolioApi.createWalletBalancesUrl(params)),

	/** Fetches saved wallet sources for the current user. */
	getUserPortfolioSources: (
		params: UserPortfolioSourcesRequestParams = {},
	): Promise<UserPortfolioSource[]> =>
		apiGet<UserPortfolioSourcesResponse>(
			portfolioApi.createUserPortfolioSourcesUrl(params),
		).then((body) => body.sources),

	/** Saves one or more wallet sources for the current user. */
	createUserPortfolioSources: (
		body: CreateUserPortfolioSourcesRequest,
		csrfToken: string,
	): Promise<UserPortfolioSource[]> =>
		apiPost<UserPortfolioSourcesResponse, CreateUserPortfolioSourcesRequest>(
			"/api/portfolio/sources",
			body,
			{
				headers: {
					"X-CSRF-Token": csrfToken,
				},
			},
		).then((body) => body.sources),

	/** Updates one wallet source for the current user. */
	updateUserPortfolioSource: (
		id: string,
		body: UpdateUserPortfolioSourceRequest,
		csrfToken: string,
	): Promise<UserPortfolioSource> =>
		apiPatch<UserPortfolioSourceResponse, UpdateUserPortfolioSourceRequest>(
			"/api/portfolio/sources",
			body,
			{
				headers: {
					"X-CSRF-Token": csrfToken,
				},
				query: { id },
			},
		).then((body) => body.source),

	/** Deletes one wallet source for the current user. */
	deleteUserPortfolioSource: (id: string, csrfToken: string): Promise<void> =>
		apiDelete<void>("/api/portfolio/sources", {
			headers: {
				"X-CSRF-Token": csrfToken,
			},
			query: { id },
		}),

	/** Fetches saved exchange access tokens for the current user. */
	getUserExchangeTokens: (): Promise<UserExchangeToken[]> =>
		apiGet<UserExchangeTokensResponse>("/api/portfolio/exchange-tokens")
			.then((body) => body.tokens),

	/** Saves one or more exchange access tokens for the current user. */
	createUserExchangeTokens: (
		body: CreateUserExchangeTokensRequest,
		csrfToken: string,
	): Promise<UserExchangeToken[]> =>
		apiPost<UserExchangeTokensResponse, CreateUserExchangeTokensRequest>(
			"/api/portfolio/exchange-tokens",
			body,
			{
				headers: {
					"X-CSRF-Token": csrfToken,
				},
			},
		).then((body) => body.tokens),

	/** Deletes one exchange access token for the current user. */
	deleteUserExchangeToken: (id: string, csrfToken: string): Promise<void> =>
		apiDelete<void>("/api/portfolio/exchange-tokens", {
			headers: {
				"X-CSRF-Token": csrfToken,
			},
			query: { id },
		}),

	/** Fetches current-user balances from saved wallet sources. */
	getUserWalletBalances: (
		params: UserWalletBalancesRequestParams,
	): Promise<WalletBalancesResponse> =>
		apiGet<WalletBalancesResponse>(
			portfolioApi.createUserWalletBalancesUrl(params),
		),

	/** Fetches current-user balances from saved exchange accounts. */
	getUserExchangeBalances: (): Promise<UserExchangeBalancesResponse> =>
		apiGet<UserExchangeBalancesResponse>("/api/portfolio/exchange-balances/me"),
};
