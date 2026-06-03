import { Exchange, Period } from "../../common/types";
import { etherealRestClient } from "../../exchanges/ethereal/ethereal";
import { normalizeEtherealError } from "../../exchanges/ethereal/ethereal.error-handler";
import type {
	EtherealFundingRange,
	FundingData as EtherealFundingData,
	ProductData,
} from "../../exchanges/ethereal/ethereal.types";
import { hyperliquidRestClient } from "../../exchanges/hyperliquid/hyperliquid";
import { normalizeHyperliquidError } from "../../exchanges/hyperliquid/hyperliquid.error-handler";
import type { HistoricalFunding } from "../../exchanges/hyperliquid/hyperliquid.types";
import { pacificaRestClient } from "../../exchanges/pacifica/pacifica";
import { normalizePacificaError } from "../../exchanges/pacifica/pacifica.error-handler";
import type { FundingRateHistory } from "../../exchanges/pacifica/pacifica.types";
import { SUPPORTED_ETHEREAL_PERIODS } from "./funding.constants";
import { mapFundingSettledResult } from "./funding.error-handler";
import type {
	FundingPoint,
	FundingQuery,
	FundingResponse,
	FundingSeries,
} from "./funding.types";
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
): Promise<FundingSeries> => FUNDING_EXCHANGE_FETCHERS[exchange](symbol, timeframe);

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

			return pacificaRestClient
				.getFundingRateHistory(timeframe, {
					symbol: market.symbol,
				})
				.then((points) =>
					createFundingSeries(
						"pacifica",
						symbol,
						market.symbol,
						points.map(mapPacificaFundingPoint),
						{
							requestedTimeframe: timeframe,
							sourceTimeframe: timeframe,
						},
					),
				);
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

/** Find the first Ethereal market matching the requested normalized symbol. */
const findEtherealMarket = (
	markets: ProductData[],
	symbol: string,
): ProductData | undefined =>
	markets.find((market) => market.ticker.toUpperCase().startsWith(symbol));

const FUNDING_EXCHANGE_FETCHERS: Record<Exchange, FundingExchangeFetcher> = {
	hyperliquid: getHyperliquidFunding,
	pacifica: getPacificaFunding,
	ethereal: getEtherealFunding,
};
