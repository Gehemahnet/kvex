import { getCachedValue } from "#common/cache.utils";
import { normalizeOptionalNumber } from "#common/number.utils";
import type { Exchange } from "#common/types";
import { etherealRestClient } from "#exchanges/ethereal/ethereal";
import { normalizeEtherealError } from "#exchanges/ethereal/ethereal.error-handler";
import type { ProductData } from "#exchanges/ethereal/ethereal.types";
import { hyperliquidRestClient } from "#exchanges/hyperliquid/hyperliquid";
import { normalizeHyperliquidError } from "#exchanges/hyperliquid/hyperliquid.error-handler";
import type { AdapterPerpFullMetadata } from "#exchanges/hyperliquid/hyperliquid.types";
import { nadoClient } from "#exchanges/nado/nado";
import { normalizeNadoError } from "#exchanges/nado/nado.error-handler";
import type {
	NadoFundingRatesResponse,
	NadoPerpPricesResponse,
	NadoSymbol,
} from "#exchanges/nado/nado.types";
import { okxClient } from "#exchanges/okx/okx";
import { mapOkxTickerToFundingOverviewCell } from "#exchanges/okx/okx.utils";
import { pacificaRestClient } from "#exchanges/pacifica/pacifica";
import { normalizePacificaError } from "#exchanges/pacifica/pacifica.error-handler";
import type { MarketData } from "#exchanges/pacifica/pacifica.types";
import type { PriceData } from "#exchanges/pacifica/pacifica.types";
import { variationalClient } from "#exchanges/variational/variational";
import { normalizeVariationalError } from "#exchanges/variational/variational.error-handler";
import type { VariationalListing } from "#exchanges/variational/variational.types";
import {
	FUNDING_INTERVAL_HOURS,
	FUNDING_OVERVIEW_MARKETS_CACHE_TTL_MS,
	FUNDING_OVERVIEW_RESPONSE_CACHE_TTL_MS,
	DOCUMENTED_BASE_PERP_FEES,
} from "#services/funding/funding-core/funding.constants";
import { normalizeFundingServiceError } from "#services/funding/funding-core/funding.error-handler";
import type { FundingExchangeError } from "#services/funding/funding-core/funding.types";
import type {
	FundingOverviewExchangeCellsResponse,
	FundingOverviewExchangeCell,
	FundingOverviewQuery,
	FundingOverviewResponse,
} from "./funding-overview.types";
import {
	annualizeFundingRate,
	annualizeHourlyFundingRate,
	createFundingOverviewCacheKey,
	createFundingOverviewRows,
	normalizeFundingRateToHourly,
	normalizeOptionalTimestamp,
	normalizeOverviewSymbol,
	scaleFundingOverviewCellsToTimeframe,
} from "./funding-overview.utils";

type FundingOverviewExchangeFetcher = () => Promise<FundingOverviewExchangeCell[]>;

type FundingOverviewSettledResult =
	| { data: FundingOverviewExchangeCell[]; error?: never }
	| { data?: never; error: FundingExchangeError };

/** Returns cached funding overview rows for the requested timeframe and exchanges. */
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
	const cells = await getFundingOverviewExchangeCells(query.exchanges);

	return {
		...query,
		data: createFundingOverviewRows(
			scaleFundingOverviewCellsToTimeframe(
				cells.data,
				query.timeframe,
			),
		),
		errors: cells.errors,
	};
};

/** Loads raw funding overview cells from every requested exchange with partial error capture. */
export const getFundingOverviewExchangeCells = async (
	exchanges: Exchange[],
): Promise<FundingOverviewExchangeCellsResponse> => {
	const results = await Promise.allSettled(
		exchanges.map((exchange) => getFundingOverviewByExchange(exchange)),
	);

	const mappedResults = results.map((result, index) =>
		mapFundingOverviewSettledResult({
			exchange: exchanges[index],
			result,
		}),
	);

	return {
		exchanges,
		data: mappedResults.flatMap((result) => result.data ?? []),
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
		async () => {
			try {
				const [markets, prices] = await Promise.all([
					pacificaRestClient.getMarkets(),
					pacificaRestClient.getPrices(),
				]);

				return mapPacificaFundingOverview(markets ?? [], prices ?? []);
			} catch (error) {
				throw normalizePacificaError(error);
			}
		},
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
				const [fundingRates, perpPrices] = await Promise.all([
					nadoClient.getFundingRates(productIds),
					nadoClient.getPerpPrices(productIds),
				]);

				return mapNadoFundingOverview(perpSymbols, fundingRates, perpPrices);
			} catch (error) {
				throw normalizeNadoError(error);
			}
		},
	);

const getOkxFundingOverview = async (): Promise<FundingOverviewExchangeCell[]> =>
	getCachedValue(
		"funding-overview:markets:okx",
		FUNDING_OVERVIEW_MARKETS_CACHE_TTL_MS,
		async () => {
			const tickers = await okxClient.getSwapTickers();

			return tickers.map((ticker) => ({
				...mapOkxTickerToFundingOverviewCell(ticker),
				...getDocumentedBasePerpFees("okx"),
			}));
		},
	);

const getVariationalFundingOverview = async (): Promise<FundingOverviewExchangeCell[]> =>
	getCachedValue(
		"funding-overview:markets:variational",
		FUNDING_OVERVIEW_MARKETS_CACHE_TTL_MS,
		() =>
			variationalClient
				.getStats()
				.then((stats) => mapVariationalFundingOverview(stats.listings ?? []))
				.catch((error) => {
					throw normalizeVariationalError(error);
				}),
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
				fundingIntervalHours: FUNDING_INTERVAL_HOURS.HYPERLIQUID,
				apr: annualizeHourlyFundingRate(fundingRate),
				markPrice: normalizeOptionalNumber(market.markPx),
				indexPrice: normalizeOptionalNumber(market.oraclePx),
				midPrice: normalizeOptionalNumber(market.midPx),
				openInterest: normalizeOptionalNumber(market.openInterest),
				volume24h: normalizeOptionalNumber(market.dayNtlVlm),
				...getDocumentedBasePerpFees("hyperliquid"),
				maxLeverage: market.maxLeverage,
			};
		});

const mapPacificaFundingOverview = (
	markets: MarketData[],
	prices: PriceData[],
): FundingOverviewExchangeCell[] =>
	markets.map((market) => {
		const price = prices.find((item) => item.symbol === market.symbol);
		const fundingRate = Number(market.funding_rate);
		const nextFundingRate = Number(market.next_funding_rate);

		return {
			exchange: "pacifica",
			sourceSymbol: normalizeOverviewSymbol(market.symbol),
			fundingRate,
			nextFundingRate,
			fundingIntervalHours: FUNDING_INTERVAL_HOURS.PACIFICA,
			apr: annualizeHourlyFundingRate(fundingRate),
			markPrice: normalizeOptionalNumber(price?.mark),
			indexPrice: normalizeOptionalNumber(price?.oracle),
			midPrice: normalizeOptionalNumber(price?.mid),
			openInterest: normalizeOptionalNumber(price?.open_interest),
			volume24h: normalizeOptionalNumber(price?.volume_24h),
			...getDocumentedBasePerpFees("pacifica"),
			maxLeverage: market.max_leverage,
			minOrderSize: normalizeOptionalNumber(market.min_order_size),
			maxOrderSize: normalizeOptionalNumber(market.max_order_size),
			timestamp: normalizeOptionalTimestamp(price?.timestamp),
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
				fundingIntervalHours: FUNDING_INTERVAL_HOURS.ETHEREAL,
				apr: annualizeHourlyFundingRate(fundingRate),
				openInterest: normalizeOptionalNumber(market.openInterest),
				volume24h: normalizeOptionalNumber(market.volume24h),
				makerFeeRate: normalizeOptionalNumber(market.makerFee),
				takerFeeRate: normalizeOptionalNumber(market.takerFee),
				feeSource: "api",
				maxLeverage: market.maxLeverage,
				minOrderSize: normalizeOptionalNumber(market.minQuantity),
				maxOrderSize: normalizeOptionalNumber(market.maxQuantity),
				timestamp: normalizeOptionalTimestamp(market.fundingUpdatedAt),
			};
		});

const mapNadoFundingOverview = (
	symbols: NadoSymbol[],
	fundingRates: NadoFundingRatesResponse,
	perpPrices: NadoPerpPricesResponse,
): FundingOverviewExchangeCell[] =>
	symbols.flatMap((symbol) => {
		const fundingRate = fundingRates[String(symbol.product_id)];
		const perpPrice = perpPrices[String(symbol.product_id)];

		if (!fundingRate) {
			return [];
		}

		const sourceFundingRate = Number(fundingRate.funding_rate_x18) / 1e18;
		const hourlyFundingRate = normalizeFundingRateToHourly(
			sourceFundingRate,
			FUNDING_INTERVAL_HOURS.NADO,
		);

		return {
			exchange: "nado",
			sourceSymbol: normalizeOverviewSymbol(symbol.symbol),
			...(hourlyFundingRate !== undefined ? { fundingRate: hourlyFundingRate } : {}),
			fundingIntervalHours: FUNDING_INTERVAL_HOURS.NADO,
			apr: annualizeFundingRate(sourceFundingRate, FUNDING_INTERVAL_HOURS.NADO),
			markPrice: normalizeX18Number(perpPrice?.mark_price_x18),
			indexPrice: normalizeX18Number(perpPrice?.index_price_x18),
			makerFeeRate: normalizeX18Number(symbol.maker_fee_rate_x18),
			takerFeeRate: normalizeX18Number(symbol.taker_fee_rate_x18),
			feeSource: "api",
			timestamp: normalizeOptionalTimestamp(
				Number(perpPrice?.update_time ?? fundingRate.update_time),
			),
		};
	});

const mapVariationalFundingOverview = (
	listings: VariationalListing[],
): FundingOverviewExchangeCell[] =>
	listings.flatMap((listing) => {
		const fundingIntervalHours = getVariationalFundingIntervalHours(listing);
		const sourceFundingRate = normalizeOptionalNumber(listing.funding_rate);
		const hourlyFundingRate = normalizeFundingRateToHourly(
			sourceFundingRate,
			fundingIntervalHours,
		);

		if (hourlyFundingRate === undefined) {
			return [];
		}

		return {
			exchange: "variational",
			sourceSymbol: normalizeOverviewSymbol(listing.ticker),
			fundingRate: hourlyFundingRate,
			fundingIntervalHours,
			apr: annualizeFundingRate(sourceFundingRate, fundingIntervalHours),
			bidPrice: normalizeOptionalNumber(listing.quotes?.size_1k?.bid),
			askPrice: normalizeOptionalNumber(listing.quotes?.size_1k?.ask),
			markPrice: normalizeOptionalNumber(listing.mark_price),
			openInterest: sumOptionalNumbers(
				listing.open_interest?.long_open_interest,
				listing.open_interest?.short_open_interest,
			),
			volume24h: normalizeOptionalNumber(listing.volume_24h),
			timestamp: normalizeVariationalTimestamp(listing),
		};
	});

const normalizeX18Number = (value?: string): number | undefined => {
	const numberValue = normalizeOptionalNumber(value);

	return numberValue === undefined ? undefined : numberValue / 1e18;
};

const getVariationalFundingIntervalHours = (
	listing: VariationalListing,
): number => (listing.funding_interval_s ?? 3600) / 3600;

const normalizeVariationalTimestamp = (
	listing: VariationalListing,
): number | undefined => {
	const timestamp = Date.parse(listing.quotes?.updated_at ?? "");

	return Number.isNaN(timestamp) ? undefined : timestamp;
};

const sumOptionalNumbers = (
	...values: (string | undefined)[]
): number | undefined => {
	const normalizedValues = values.flatMap((value) => {
		const normalizedValue = normalizeOptionalNumber(value);

		return normalizedValue === undefined ? [] : [normalizedValue];
	});

	return normalizedValues.length === 0
		? undefined
		: normalizedValues.reduce((sum, value) => sum + value, 0);
};

const getDocumentedBasePerpFees = (
	exchange: Exchange,
): Pick<
	FundingOverviewExchangeCell,
	"makerFeeRate" | "takerFeeRate" | "feeSource"
> => {
	const fees = DOCUMENTED_BASE_PERP_FEES[exchange];

	return fees === undefined
		? {}
		: {
			...fees,
			feeSource: "documentation",
		};
};

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
	okx: getOkxFundingOverview,
	variational: getVariationalFundingOverview,
};
