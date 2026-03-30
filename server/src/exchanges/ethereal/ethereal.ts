import { FetchHttpClient } from "../../common/http-client";
import { DexRestClient } from "../../common/rest-client";

import {
	FundingData,
	GetFundingQueryParams,
	GetFundingResponse,
	GetProductResponse,
	GetProductsQueryParams,
} from "./ethereal.types";

class EtherealDexClient extends DexRestClient {
	private endpoints = {
		product: "product",
		fundingRate: "funding",
	};

	async getProducts(query: GetProductsQueryParams = {}) {
		return this.fetchData<GetProductResponse, GetProductsQueryParams>(
			this.endpoints.product,
			{ query },
		);
	}

	async getFundingHistory(query: GetFundingQueryParams) {
		try {
			const dataList: FundingData[] = [];
			let nextListToken: string | undefined;
			let hasNext: boolean = false;
			do {
				const response = await this.fetchData<
					GetFundingResponse,
					GetFundingQueryParams
				>(this.endpoints.fundingRate, {
					query: {
						limit: 100,
						...query,
						cursor: nextListToken,
					},
				});

				if (!response) {
					break;
				}

				dataList.push(...response.data);
				nextListToken = response.nextCursor;
				hasNext = response.hasNext;
			} while (hasNext);

			return dataList;
		} catch (error) {
			console.error(error);
		}
	}
}

export const etherealRestClient = new EtherealDexClient({
	baseUrl: "https://api.ethereal.trade/v1",
	httpClient: new FetchHttpClient(),
});
