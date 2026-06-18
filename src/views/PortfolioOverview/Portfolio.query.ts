import { useQuery } from "@tanstack/vue-query";
import { computed, toValue, type MaybeRefOrGetter } from "vue";
import {
	portfolioApi,
	type AssetPricesRequestParams,
	type UserWalletBalancesRequestParams,
} from "@api/portfolio";

const PORTFOLIO_CACHE_TTL_MS = 180_000;
export const USER_PORTFOLIO_SOURCES_QUERY_KEY = [
	"portfolio",
	"sources",
	"list",
] as const;
export const USER_WALLET_BALANCES_QUERY_KEY = [
	"portfolio",
	"userWalletBalances",
] as const;
export const USER_EXCHANGE_BALANCES_QUERY_KEY = [
	"portfolio",
	"userExchangeBalances",
] as const;
export const USER_PORTFOLIO_BALANCES_QUERY_KEY = [
	"portfolio",
	"userPortfolioBalances",
] as const;
export const USER_EXCHANGE_TOKENS_QUERY_KEY = [
	"portfolio",
	"exchangeTokens",
	"list",
] as const;

type UseAssetPricesQueryParams = {
	symbols: MaybeRefOrGetter<AssetPricesRequestParams["symbols"]>;
};

type UseUserWalletBalancesQueryParams = {
	enabled: MaybeRefOrGetter<boolean>;
	tokens: MaybeRefOrGetter<UserWalletBalancesRequestParams["tokens"]>;
};

/** Creates a stable query key for current-user balance reads. */
export const createUserWalletBalancesQueryKey = (
	params: UserWalletBalancesRequestParams,
) => [
	...USER_WALLET_BALANCES_QUERY_KEY,
	[...params.tokens].sort(),
];

/** Fetches saved portfolio wallet sources for the current user. */
export const useUserPortfolioSourcesQuery = () =>
	useQuery({
		queryKey: USER_PORTFOLIO_SOURCES_QUERY_KEY,
		queryFn: () => portfolioApi.getUserPortfolioSources(),
		retry: false,
		staleTime: PORTFOLIO_CACHE_TTL_MS,
	});

/** Fetches best-effort USD asset prices with Vue Query. */
export const useAssetPricesQuery = (
	params: UseAssetPricesQueryParams,
) =>
	useQuery({
		queryKey: computed(() => [
			"portfolio",
			"assetPrices",
			[...toValue(params.symbols)].sort(),
		]),
		queryFn: () => portfolioApi.getAssetPrices({ symbols: toValue(params.symbols) }),
		enabled: computed(() => toValue(params.symbols).length > 0),
		retry: false,
		staleTime: PORTFOLIO_CACHE_TTL_MS,
	});

/** Fetches current-user balances from saved wallet sources. */
export const useUserWalletBalancesQuery = (
	params: UseUserWalletBalancesQueryParams,
) =>
	useQuery({
		queryKey: computed(() =>
			createUserWalletBalancesQueryKey({
				tokens: toValue(params.tokens),
			}),
		),
		queryFn: () => portfolioApi.getUserWalletBalances({
			tokens: toValue(params.tokens),
		}),
		enabled: computed(() =>
			toValue(params.enabled) && toValue(params.tokens).length > 0
		),
		retry: false,
		staleTime: PORTFOLIO_CACHE_TTL_MS,
	});

/** Fetches current-user balances from saved exchange accounts. */
export const useUserExchangeBalancesQuery = () =>
	useQuery({
		queryKey: USER_EXCHANGE_BALANCES_QUERY_KEY,
		queryFn: () => portfolioApi.getUserExchangeBalances(),
		retry: false,
		staleTime: PORTFOLIO_CACHE_TTL_MS,
	});

/** Fetches current-user wallet and exchange balances from saved portfolio sources. */
export const useUserPortfolioBalancesQuery = () =>
	useQuery({
		queryKey: USER_PORTFOLIO_BALANCES_QUERY_KEY,
		queryFn: () => portfolioApi.getUserPortfolioBalances(),
		retry: false,
		staleTime: PORTFOLIO_CACHE_TTL_MS,
	});

/** Fetches saved exchange access tokens for the current user. */
export const useUserExchangeTokensQuery = () =>
	useQuery({
		queryKey: USER_EXCHANGE_TOKENS_QUERY_KEY,
		queryFn: () => portfolioApi.getUserExchangeTokens(),
		retry: false,
		staleTime: PORTFOLIO_CACHE_TTL_MS,
	});
