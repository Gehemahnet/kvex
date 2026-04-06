import { FetchHttpClient } from "../../common/http-client";
import { DexRestClient } from "../../common/rest-client";
import { Period } from "../../common/types";
import { getFromTimestamp } from "../../common/utils";
import {
	FundingRateHistory,
	GetFundingRateHistoryParams,
	GetFundingRateHistoryResponse,
	GetMarketsResponse,
	GetPricesResponse,
	MarketData,
	PriceData,
} from "./pacifica.types";

class PacificaDexClient extends DexRestClient {
	endpoints = {
		info: "info",
		prices: "info/prices",
		fundingRateHistory: "funding_rate/history",
	};

	async getMarkets(): Promise<MarketData[] | undefined> {
		const response = await this.fetchData<GetMarketsResponse>(
			this.endpoints.info,
		);

		if (response?.success) {
			return response.data;
		}

		return [];
	}

	async getPrices(): Promise<PriceData[] | undefined> {
		const response = await this.fetchData<GetPricesResponse>(
			this.endpoints.prices,
		);

		if (response?.success) {
			return response.data;
		}

		return [];
	}

	async getFundingRateHistory(
		period: Period,
		params: GetFundingRateHistoryParams,
	): Promise<FundingRateHistory[]> {
		const allData: FundingRateHistory[] = [];
		let currentCursor: string | undefined = params.cursor;
		let hasMore: boolean = true;

		const fromTimestamp = getFromTimestamp(period);

		while (hasMore) {
			const response = await this.fetchData<
				GetFundingRateHistoryResponse,
				GetFundingRateHistoryParams
			>(this.endpoints.fundingRateHistory, {
				query: { ...params, cursor: currentCursor },
			});

			if (!response?.success || !response.data) break;
			const data = response.data;

			for (const item of data) {
				if (item.created_at < fromTimestamp) {
					hasMore = false;
					break;
				}
				allData.push(item);
			}
			if (!hasMore) break;

			currentCursor = response.next_cursor;
			hasMore = response.has_more;
		}

		return allData.sort((a, b) => (a.created_at > b.created_at ? 1 : -1));
	}
}

export const pacificaRestClient = new PacificaDexClient({
	baseUrl: "https://api.pacifica.fi/api/v1",
	httpClient: new FetchHttpClient(),
});

export type PacificaDexClientType = typeof PacificaDexClient;
