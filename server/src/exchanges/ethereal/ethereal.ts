import { FetchHttpClient } from "#common/http-client";
import { DexRestClient } from "#common/rest-client";

import {
	FundingData,
	EtherealPaginatingResponse,
	EtherealPosition,
	EtherealPositionFill,
	EtherealSubaccount,
	EtherealSubaccountBalance,
	GetFundingQueryParams,
	GetFundingResponse,
	GetProductResponse,
	GetProductsQueryParams,
} from "./ethereal.types";
import { selectEtherealSubaccount } from "./ethereal.utils";

class EtherealDexClient extends DexRestClient {
	private endpoints = {
		product: "product",
		fundingRate: "funding",
		position: "position",
		positionFill: "position/fill",
		subaccount: "subaccount",
		subaccountBalance: "subaccount/balance",
	};

	async getMarkets(query: GetProductsQueryParams = {}) {
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

	async getSubaccounts(sender: string): Promise<EtherealSubaccount[]> {
		return this.fetchAllPages<EtherealSubaccount>(this.endpoints.subaccount, {
			sender,
		});
	}

	async resolveSubaccount(sender: string, name = "primary"): Promise<EtherealSubaccount | undefined> {
		return selectEtherealSubaccount(await this.getSubaccounts(sender), name);
	}

	async getSubaccountBalances(
		subaccountId: string,
	): Promise<EtherealSubaccountBalance[]> {
		return this.fetchAllPages<EtherealSubaccountBalance>(
			this.endpoints.subaccountBalance,
			{ subaccountId },
		);
	}

	async getPositions(subaccountId: string): Promise<EtherealPosition[]> {
		return this.fetchAllPages<EtherealPosition>(this.endpoints.position, {
			subaccountId,
			open: "true",
		});
	}

	async getPositionFills(positionId: string): Promise<EtherealPositionFill[]> {
		return this.fetchAllPages<EtherealPositionFill>(this.endpoints.positionFill, {
			positionId,
			order: "desc",
		});
	}

	async getAllPositions(subaccountId: string): Promise<EtherealPosition[]> {
		return this.fetchAllPages<EtherealPosition>(this.endpoints.position, {
			subaccountId,
			order: "desc",
		});
	}

	private async fetchAllPages<T>(
		path: string,
		query: Record<string, string>,
	): Promise<T[]> {
		const data: T[] = [];
		let cursor: string | undefined;

		do {
			const response = await this.fetchData<
				EtherealPaginatingResponse<T>,
				Record<string, string | undefined>
			>(path, { query: { ...query, limit: "100", cursor } });

			if (!response) break;
			data.push(...response.data);
			cursor = response.hasNext ? response.nextCursor : undefined;
		} while (cursor);

		return data;
	}
}

export const etherealRestClient = new EtherealDexClient({
	baseUrl: "https://api.ethereal.trade/v1",
	httpClient: new FetchHttpClient(),
});

export type EtherealDexClientType = typeof EtherealDexClient;
