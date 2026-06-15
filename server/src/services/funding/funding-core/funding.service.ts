import { Exchange, Period } from "#common/types";
import { etherealRestClient } from "#exchanges/ethereal/ethereal";
import { normalizeEtherealError } from "#exchanges/ethereal/ethereal.error-handler";
import type {
	EtherealFundingRange,
	FundingData as EtherealFundingData,
	ProductData,
} from "#exchanges/ethereal/ethereal.types";
import { hyperliquidRestClient } from "#exchanges/hyperliquid/hyperliquid";
import { normalizeHyperliquidError } from "#exchanges/hyperliquid/hyperliquid.error-handler";
import type { HistoricalFunding } from "#exchanges/hyperliquid/hyperliquid.types";
import { nadoClient } from "#exchanges/nado/nado";
import { normalizeNadoError } from "#exchanges/nado/nado.error-handler";
import type { NadoFundingRate } from "#exchanges/nado/nado.types";
import { pacificaRestClient } from "#exchanges/pacifica/pacifica";
import { normalizePacificaError } from "#exchanges/pacifica/pacifica.error-handler";
import type { FundingRateHistory } from "#exchanges/pacifica/pacifica.types";
import { variationalClient } from "#exchanges/variational/variational";
import { normalizeVariationalError } from "#exchanges/variational/variational.error-handler";
import type { VariationalListing } from "#exchanges/variational/variational.types";
import { PERIOD_POINTS } from "#common/constants";
import { SUPPORTED_ETHEREAL_PERIODS } from "#services/funding/funding-core/funding.constants";
import { mapFundingSettledResult } from "#services/funding/funding-core/funding.error-handler";
import type {
	FundingPoint,
	FundingQuery,
	FundingResponse,
	FundingSeries,
} from "#services/funding/funding-core/funding.types";
import {
	annualizeFundingPoints,
	createFundingSeries,
} from "./funding.utils";

type FundingExchangeFetcher = (
	symbol: string,
	timeframe: Period,
) => Promise<FundingSeries>;

/** Aggregate funding data across requested exchanges. */
export const getFunding = async (
	query: FundingQuery,
): Promise<FundingResponse> => {
	const results = await Promise.allSettled(
		query.exchanges.map((exchange) =>
			getFundingByExchange(exchange, query.symbol, query.timeframe),
		),
	);

	const mappedResults = results.map((result, index) =>
		mapFundingSettledResult({
			exchange: query.exchanges[index],
			result,
		}),
	);

	return {
		...query,
		data: mappedResults.flatMap((result) => (result.data ? [result.data] : [])),
		errors: mappedResults.flatMap((result) =>
			result.error ? [result.error] : [],
		),
	};
};

/** Resolve the funding fetcher for a given exchange through a static handler map. */
const getFundingByExchange = async (
	exchange: Exchange,
	symbol: string,
	timeframe: Period,
): Promise<FundingSeries> => {
	const fetcher = FUNDING_EXCHANGE_FETCHERS[exchange];

	if (!fetcher) {
		throw new Error(`${exchange} historical funding is not supported yet`);
	}

	return fetcher(symbol, timeframe);
};

/** Fetch and normalize Hyperliquid funding history. */
const getHyperliquidFunding = async (
	symbol: string,
	timeframe: Period,
): Promise<FundingSeries> =>
	hyperliquidRestClient
		.getHistoricalFunding(timeframe, symbol)
		.then((points) =>
			createFundingSeries(
				"hyperliquid",
				symbol,
				symbol,
				points.map(mapHyperliquidFundingPoint),
				{
					requestedTimeframe: timeframe,
					sourceTimeframe: timeframe,
				},
			),
		)
		.catch((error) => {
			throw normalizeHyperliquidError(error);
		});

/** Fetch and normalize Pacifica funding history. */
const getPacificaFunding = async (
	symbol: string,
	timeframe: Period,
): Promise<FundingSeries> =>
	pacificaRestClient
	.getMarkets()
	.then((markets) => {
			const market = markets?.find(
				(item) => item.symbol.toUpperCase() === symbol.toUpperCase(),
			);

			if (!market) {
				throw new Error(`Symbol ${symbol} was not found on pacifica`);
			}

			const sourceTimeframe = getPacificaSourceTimeframe(timeframe);

			return pacificaRestClient
				.getFundingRateHistory(sourceTimeframe, {
					symbol: market.symbol,
				})
				.then((points) => {
					const normalizedPoints =
						timeframe === "YEAR"
							? annualizeFundingPoints(
									points.map(mapPacificaFundingPoint),
									12,
								)
							: points.map(mapPacificaFundingPoint);

					return createFundingSeries(
						"pacifica",
						symbol,
						market.symbol,
						normalizedPoints,
						{
							isFundingAdapted: timeframe === "YEAR",
							requestedTimeframe: timeframe,
							sourceTimeframe,
						},
					);
				});
		})
		.catch((error) => {
			throw normalizePacificaError(error);
		});

/** Fetch and normalize Ethereal funding history, including adapted yearly data. */
const getEtherealFunding = async (
	symbol: string,
	timeframe: Period,
): Promise<FundingSeries> =>
	etherealRestClient
		.getMarkets({ ticker: symbol })
		.then((markets) => {
			if (!markets) {
				throw new Error("Failed to fetch ethereal markets");
			}

			const market = findEtherealMarket(markets.data, symbol);

			if (!market) {
				throw new Error(`Symbol ${symbol} was not found on ethereal`);
			}

			const sourceTimeframe = getEtherealSourceTimeframe(timeframe);

			return etherealRestClient
				.getFundingHistory({
					productId: market.id,
					range: sourceTimeframe as EtherealFundingRange,
				})
				.then((points) => {
					const normalizedPoints =
						timeframe === "YEAR"
							? annualizeFundingPoints(
									(points ?? []).map(mapEtherealFundingPoint),
									12,
								)
							: (points ?? []).map(mapEtherealFundingPoint);

					return createFundingSeries(
						"ethereal",
						symbol,
						market.ticker,
						normalizedPoints,
						{
							isFundingAdapted: timeframe === "YEAR",
							requestedTimeframe: timeframe,
							sourceTimeframe,
						},
					);
				});
		})
		.catch((error) => {
			throw normalizeEtherealError(error);
		});

/** Fetch latest Nado 24h funding and adapt it to the requested timeframe. */
const getNadoFunding = async (
	symbol: string,
	timeframe: Period,
): Promise<FundingSeries> =>
	nadoClient
		.getSymbols()
		.then((symbols) => {
			const market = symbols.find(
				(item) =>
					item.type === "perp" &&
					item.trading_status === "live" &&
					item.symbol.toUpperCase().startsWith(symbol.toUpperCase()),
			);

			if (!market) {
				throw new Error(`Symbol ${symbol} was not found on nado`);
			}

			return nadoClient.getFundingRate(market.product_id).then((fundingRate) =>
				createFundingSeries(
					"nado",
					symbol,
					market.symbol,
					[mapNadoFundingPoint(fundingRate, timeframe)],
					{
						isFundingAdapted: timeframe !== "DAY",
						requestedTimeframe: timeframe,
						sourceTimeframe: "DAY",
					},
				),
			);
		})
		.catch((error) => {
			throw normalizeNadoError(error);
		});

/** Fetch latest Variational funding and adapt it to the requested timeframe. */
const getVariationalFunding = async (
	symbol: string,
	timeframe: Period,
): Promise<FundingSeries> =>
	variationalClient
		.getStats()
		.then((stats) => {
			const market = stats.listings?.find(
				(item) => item.ticker.toUpperCase() === symbol.toUpperCase(),
			);

			if (!market) {
				throw new Error(`Symbol ${symbol} was not found on variational`);
			}

			return createFundingSeries(
				"variational",
				symbol,
				market.ticker,
				[mapVariationalFundingPoint(market, timeframe)],
				{
					isFundingAdapted: true,
					requestedTimeframe: timeframe,
					sourceTimeframe: "DAY",
				},
			);
		})
		.catch((error) => {
			throw normalizeVariationalError(error);
		});

/** Resolve the actual Ethereal timeframe used for a requested funding window. */
const getEtherealSourceTimeframe = (timeframe: Period): Period => {
	if (timeframe === "YEAR") {
		return "MONTH";
	}

	if (!SUPPORTED_ETHEREAL_PERIODS.includes(timeframe)) {
		throw new Error(`Timeframe ${timeframe} is not supported on ethereal`);
	}

	return timeframe;
};

/** Resolve the Pacifica timeframe used while avoiding heavy yearly pagination. */
const getPacificaSourceTimeframe = (timeframe: Period): Period => {
	if (timeframe === "YEAR") {
		return "MONTH";
	}

	return timeframe;
};

/** Convert Hyperliquid funding payloads into the shared funding point shape. */
const mapHyperliquidFundingPoint = (item: HistoricalFunding): FundingPoint => ({
	timestamp: item.time,
	fundingRate: Number(item.fundingRate),
});

/** Convert Pacifica funding payloads into the shared funding point shape. */
const mapPacificaFundingPoint = (item: FundingRateHistory): FundingPoint => ({
	timestamp: item.created_at,
	fundingRate: Number(item.funding_rate),
	nextFundingRate: Number(item.next_funding_rate),
});

/** Convert Ethereal funding payloads into the shared funding point shape. */
const mapEtherealFundingPoint = (item: EtherealFundingData): FundingPoint => ({
	timestamp: item.createdAt,
	fundingRate: Number(item.fundingRate1h),
});

/** Convert Nado 24h funding payloads into the requested shared funding point shape. */
const mapNadoFundingPoint = (
	item: NadoFundingRate,
	timeframe: Period,
): FundingPoint => ({
	timestamp: Number(item.update_time) * 1000,
	fundingRate:
		(Number(item.funding_rate_x18) / 1e18) *
		getNadoTimeframeMultiplier(timeframe),
});

/** Convert Variational interval funding into the requested shared funding point shape. */
const mapVariationalFundingPoint = (
	item: VariationalListing,
	timeframe: Period,
): FundingPoint => ({
	timestamp: normalizeVariationalFundingTimestamp(item),
	fundingRate:
		parseVariationalFundingRate(item) *
		getVariationalTimeframeMultiplier(item, timeframe),
});

/** Resolve the multiplier from Nado's 24h funding source value. */
const getNadoTimeframeMultiplier = (timeframe: Period): number => {
	if (timeframe === "WEEK") {
		return 7;
	}

	if (timeframe === "MONTH") {
		return 30;
	}

	if (timeframe === "YEAR") {
		return 365;
	}

	return 1;
};

/** Resolve the multiplier from Variational's documented interval funding value. */
const getVariationalTimeframeMultiplier = (
	item: VariationalListing,
	timeframe: Period,
): number => {
	const fundingIntervalHours = getVariationalFundingIntervalHours(item);

	return PERIOD_POINTS[timeframe] / fundingIntervalHours;
};

const getVariationalFundingIntervalHours = (item: VariationalListing): number => {
	const fundingIntervalHours = (item.funding_interval_s ?? 3600) / 3600;

	if (fundingIntervalHours <= 0) {
		throw new Error(
			`Funding interval is unavailable for ${item.ticker} on variational`,
		);
	}

	return fundingIntervalHours;
};

const parseVariationalFundingRate = (item: VariationalListing): number => {
	const fundingRate = Number(item.funding_rate);

	if (Number.isNaN(fundingRate)) {
		throw new Error(`Funding rate is unavailable for ${item.ticker} on variational`);
	}

	return fundingRate;
};

const normalizeVariationalFundingTimestamp = (item: VariationalListing): number => {
	const parsedTimestamp = Date.parse(item.quotes?.updated_at ?? "");

	return Number.isNaN(parsedTimestamp) ? Date.now() : parsedTimestamp;
};

/** Find the first Ethereal market matching the requested normalized symbol. */
const findEtherealMarket = (
	markets: ProductData[],
	symbol: string,
): ProductData | undefined =>
	markets.find((market) => market.ticker.toUpperCase().startsWith(symbol));

const FUNDING_EXCHANGE_FETCHERS: Partial<Record<Exchange, FundingExchangeFetcher>> = {
	hyperliquid: getHyperliquidFunding,
	pacifica: getPacificaFunding,
	ethereal: getEtherealFunding,
	nado: getNadoFunding,
	variational: getVariationalFunding,
};
