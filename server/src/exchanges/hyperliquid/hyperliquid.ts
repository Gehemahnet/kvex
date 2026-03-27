import { FetchHttpClient } from "../../common/http-client";
import { DexRestClient } from "../../common/rest-client";
import { Period } from "../../types";
import {
	GetPerpMetadataRequestBody,
	GetPerpMetadataResponse,
	HistoricalFunding,
	HistoricalFundingRequestBody,
	HyperliquidInfoRequestType,
} from "./hyperliquid.types";

class HyperliquidDexClient extends DexRestClient {
	endpoints = {
		info: "info",
	};

	getInfoUrl() {
		return new URL(`${this.baseUrl}/${this.endpoints.info}`);
	}
	// TODO нужен адаптер ответа
	async getMarkets(fullData: boolean = false) {
		return this.httpClient.post<
			GetPerpMetadataResponse,
			GetPerpMetadataRequestBody
		>(this.getInfoUrl().href, {
			type: fullData
				? HyperliquidInfoRequestType.MetaAndAssetCtxs
				: HyperliquidInfoRequestType.Meta,
		});
	}

	async getHistoricalFunding(period: Period, coin: string) {
		const durations: Record<Period, number> = {
			DAY: 86400000,
			WEEK: 7 * 86400000,
			MONTH: 30 * 86400000,
			YEAR: 365 * 86400000,
		};

		const allData = [];

		const duration = durations[period];
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
