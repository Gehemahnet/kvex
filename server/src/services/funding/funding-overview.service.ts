import { getCachedValue } from "../../common/cache.utils";
import type { Exchange } from "../../common/types";
import { etherealRestClient } from "../../exchanges/ethereal/ethereal";
import { normalizeEtherealError } from "../../exchanges/ethereal/ethereal.error-handler";
import type { ProductData } from "../../exchanges/ethereal/ethereal.types";
import { hyperliquidRestClient } from "../../exchanges/hyperliquid/hyperliquid";
import { normalizeHyperliquidError } from "../../exchanges/hyperliquid/hyperliquid.error-handler";
import type { AdapterPerpFullMetadata } from "../../exchanges/hyperliquid/hyperliquid.types";
import { nadoClient } from "../../exchanges/nado/nado";
import { normalizeNadoError } from "../../exchanges/nado/nado.error-handler";
import type {
	NadoFundingRatesResponse,
	NadoSymbol,
} from "../../exchanges/nado/nado.types";
import { pacificaRestClient } from "../../exchanges/pacifica/pacifica";
import { normalizePacificaError } from "../../exchanges/pacifica/pacifica.error-handler";
import type { MarketData } from "../../exchanges/pacifica/pacifica.types";
import {
	FUNDING_OVERVIEW_MARKETS_CACHE_TTL_MS,
	FUNDING_OVERVIEW_RESPONSE_CACHE_TTL_MS,
} from "./funding.constants";
import { normalizeFundingServiceError } from "./funding.error-handler";
import type { FundingExchangeError } from "./funding.types";
import type {
	FundingOverviewExchangeCell,
	FundingOverviewQuery,
	FundingOverviewResponse,
} from "./funding-overview.types";
import {
	annualizeHourlyFundingRate,
	createFundingOverviewCacheKey,
	createFundingOverviewRows,
	normalizeOptionalTimestamp,
	normalizeOverviewSymbol,
	scaleFundingOverviewCellsToTimeframe,
} from "./funding-overview.utils";

type FundingOverviewExchangeFetcher = () => Promise<FundingOverviewExchangeCell[]>;

type FundingOverviewSettledResult =
	| { data: FundingOverviewExchangeCell[]; error?: never }
	| { data?: never; error: FundingExchangeError };

export const getFundingOverview = async (
	query: FundingOverviewQuery,
): Promise<FundingOverviewResponse> =>
	getCachedValue(
		createFundingOverviewCacheKey(query.timeframe, query.exchanges),
		FUNDING_OVERVIEW_RESPONSE_CACHE_TTL_MS,
		() => getFreshFundingOverview(query),
	);

const getFreshFundingOverview = async (
	query: FundingOverviewQuery,
): Promise<FundingOverviewResponse> => {
	const results = await Promise.allSettled(
		query.exchanges.map((exchange) => getFundingOverviewByExchange(exchange)),
	);

	const mappedResults = results.map((result, index) =>
		mapFundingOverviewSettledResult({
			exchange: query.exchanges[index],
			result,
		}),
	);

	return {
		...query,
		data: createFundingOverviewRows(
			scaleFundingOverviewCellsToTimeframe(
				mappedResults.flatMap((result) => result.data ?? []),
				query.timeframe,
			),
		),
		errors: mappedResults.flatMap((result) =>
			result.error ? [result.error] : [],
		),
	};
};

const getFundingOverviewByExchange = (
	exchange: Exchange,
): Promise<FundingOverviewExchangeCell[]> =>
	FUNDING_OVERVIEW_EXCHANGE_FETCHERS[exchange]();

const getHyperliquidFundingOverview = async (): Promise<FundingOverviewExchangeCell[]> =>
	getCachedValue(
		"funding-overview:markets:hyperliquid",
		FUNDING_OVERVIEW_MARKETS_CACHE_TTL_MS,
		() =>
			hyperliquidRestClient
				.getFullMarketsMetadata()
				.then(mapHyperliquidFundingOverview)
				.catch((error) => {
					throw normalizeHyperliquidError(error);
				}),
	);

const getPacificaFundingOverview = async (): Promise<FundingOverviewExchangeCell[]> =>
	getCachedValue(
		"funding-overview:markets:pacifica",
		FUNDING_OVERVIEW_MARKETS_CACHE_TTL_MS,
		() =>
			pacificaRestClient
				.getMarkets()
				.then((markets) => mapPacificaFundingOverview(markets ?? []))
				.catch((error) => {
					throw normalizePacificaError(error);
				}),
	);

const getEtherealFundingOverview = async (): Promise<FundingOverviewExchangeCell[]> =>
	getCachedValue(
		"funding-overview:markets:ethereal",
		FUNDING_OVERVIEW_MARKETS_CACHE_TTL_MS,
		() =>
			etherealRestClient
				.getMarkets()
				.then((markets) => mapEtherealFundingOverview(markets?.data ?? []))
				.catch((error) => {
					throw normalizeEtherealError(error);
				}),
	);

const getNadoFundingOverview = async (): Promise<FundingOverviewExchangeCell[]> =>
	getCachedValue(
		"funding-overview:markets:nado",
		FUNDING_OVERVIEW_MARKETS_CACHE_TTL_MS,
		async () => {
			try {
				const symbols = await nadoClient.getSymbols();
				const perpSymbols = symbols.filter(isLiveNadoPerpSymbol);
				const productIds = perpSymbols.map((symbol) => symbol.product_id);
				const fundingRates = await nadoClient.getFundingRates(productIds);

				return mapNadoFundingOverview(perpSymbols, fundingRates);
			} catch (error) {
				throw normalizeNadoError(error);
			}
		},
	);

const mapHyperliquidFundingOverview = (
	markets: AdapterPerpFullMetadata,
): FundingOverviewExchangeCell[] =>
	markets.universe
		.filter((market) => !market.isDelisted)
		.map((market) => {
			const fundingRate = Number(market.funding);

			return {
				exchange: "hyperliquid",
				sourceSymbol: normalizeOverviewSymbol(market.name),
				fundingRate,
				apr: annualizeHourlyFundingRate(fundingRate),
			};
		});

const mapPacificaFundingOverview = (
	markets: MarketData[],
): FundingOverviewExchangeCell[] =>
	markets.map((market) => {
		const fundingRate = Number(market.funding_rate);
		const nextFundingRate = Number(market.next_funding_rate);

		return {
			exchange: "pacifica",
			sourceSymbol: normalizeOverviewSymbol(market.symbol),
			fundingRate,
			nextFundingRate,
			apr: annualizeHourlyFundingRate(fundingRate),
		};
	});

const mapEtherealFundingOverview = (
	markets: ProductData[],
): FundingOverviewExchangeCell[] =>
	markets
		.filter((market) => market.status === "ACTIVE")
		.map((market) => {
			const fundingRate = Number(market.fundingRate1h);

			return {
				exchange: "ethereal",
				sourceSymbol: normalizeOverviewSymbol(market.baseTokenName),
				fundingRate,
				apr: annualizeHourlyFundingRate(fundingRate),
				timestamp: normalizeOptionalTimestamp(market.fundingUpdatedAt),
			};
		});

const mapNadoFundingOverview = (
	symbols: NadoSymbol[],
	fundingRates: NadoFundingRatesResponse,
): FundingOverviewExchangeCell[] =>
	symbols.flatMap((symbol) => {
		const fundingRate = fundingRates[String(symbol.product_id)];

		if (!fundingRate) {
			return [];
		}

		const hourlyFundingRate = Number(fundingRate.funding_rate_x18) / 1e18 / 24;

		return {
			exchange: "nado",
			sourceSymbol: normalizeOverviewSymbol(symbol.symbol),
			fundingRate: hourlyFundingRate,
			apr: annualizeHourlyFundingRate(hourlyFundingRate),
			timestamp: normalizeOptionalTimestamp(Number(fundingRate.update_time)),
		};
	});

const isLiveNadoPerpSymbol = (symbol: NadoSymbol): boolean =>
	symbol.type === "perp" && symbol.trading_status === "live";

const mapFundingOverviewSettledResult = (context: {
	exchange: Exchange;
	result: PromiseSettledResult<FundingOverviewExchangeCell[]>;
}): FundingOverviewSettledResult => {
	if (context.result.status === "fulfilled") {
		return { data: context.result.value };
	}

	const normalizedError = normalizeFundingServiceError(
		context.exchange,
		context.result.reason,
	);

	return {
		error: {
			exchange: context.exchange,
			code: normalizedError.code,
			message: normalizedError.message,
		},
	};
};

const FUNDING_OVERVIEW_EXCHANGE_FETCHERS: Record<
	Exchange,
	FundingOverviewExchangeFetcher
> = {
	hyperliquid: getHyperliquidFundingOverview,
	pacifica: getPacificaFundingOverview,
	ethereal: getEtherealFundingOverview,
	nado: getNadoFundingOverview,
};
