import { DURATIONS } from "../../common/constants";
import { FetchHttpClient } from "../../common/http-client";
import { DexRestClient } from "../../common/rest-client";
import { Period } from "../../common/types";
import { getFullMarketsMetadataAdapter } from "./adapters";
import {
	AdapterPerpFullMetadata,
	GetPerpFullMetadataResponse,
	GetPerpMetadataRequestBody,
	GetPerpMetadataResponse,
	HistoricalFunding,
	HistoricalFundingRequestBody,
	HyperliquidInfoRequestType,
} from "./hyperliquid.types";

class HyperliquidDexClient extends DexRestClient {
	private endpoints = {
		info: "info",
	};

	getInfoUrl() {
		return new URL(`${this.baseUrl}/${this.endpoints.info}`);
	}

	private async getMarkets(
		fullData: boolean = false,
	): Promise<AdapterPerpFullMetadata | GetPerpMetadataResponse> {
		const markets = await this.httpClient.post<
			GetPerpMetadataResponse | GetPerpFullMetadataResponse,
			GetPerpMetadataRequestBody
		>(this.getInfoUrl().href, {
			type: fullData
				? HyperliquidInfoRequestType.MetaAndAssetCtxs
				: HyperliquidInfoRequestType.Meta,
		});

		return fullData
			? getFullMarketsMetadataAdapter(markets as GetPerpFullMetadataResponse)
			: (markets as GetPerpMetadataResponse);
	}
	async getMarketsMetadata() {
		return (await this.getMarkets()) as GetPerpMetadataResponse;
	}

	async getFullMarketsMetadata() {
		return (await this.getMarkets(true)) as AdapterPerpFullMetadata;
	}

	async getHistoricalFunding(period: Period, coin: string) {
		const allData: HistoricalFunding[] = [];

		const duration = DURATIONS[period];
		let currentStart = Date.now() - duration;
		while (currentStart < Date.now()) {
			const page = await this.httpClient.post<
				HistoricalFunding[],
				HistoricalFundingRequestBody
			>(this.getInfoUrl().href, {
				type: HyperliquidInfoRequestType.FundingHistory,
				coin,
				startTime: currentStart,
			});

			if (
				!page ||
				page.length === 0 ||
				(allData.length > 0 &&
					page[page.length - 1].time === allData[allData.length - 1].time)
			)
				break;

			allData.push(...page);

			currentStart = page[page.length - 1].time + 1;

			if (currentStart >= Date.now()) {
				break;
			}
		}

		return allData;
	}
}

export const hyperliquidRestClient = new HyperliquidDexClient({
	baseUrl: "https://api.hyperliquid.xyz",
	httpClient: new FetchHttpClient(),
});

export type HyperliquidDexClientType = typeof HyperliquidDexClient;
