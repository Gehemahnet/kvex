import { useQuery } from "@tanstack/vue-query";
import type { ComputedRef } from "vue";
import type { UnifiedMarketItem } from "../../types";
import marketEndpoints, {
	ProductEndpointsKeys,
} from "./rest/products.endpoints";
import type {
	GetProductsQueryDto,
	PageOfProductDtos,
	ProductDto,
} from "./rest/products.types";

type Params = {
	enabled: ComputedRef<boolean>;
	query: GetProductsQueryDto;
};
const etherealItemToUnified = (item: ProductDto): UnifiedMarketItem => ({
	symbol: item.baseTokenName,
	fundingRate: item.fundingRate1h,
	tickSize: item.tickSize,
	maxOrderSize: item.maxPositionNotionalUsd,
});

export const useEtherealProductsQuery = (params: Params) =>
	useQuery({
		queryKey: [ProductEndpointsKeys.GET_PRODUCTS],
		queryFn: async () => {
			try {
				const response = await fetch(marketEndpoints.getProducts(params.query));

				if (!response.ok) return [];

				const { data }: PageOfProductDtos = await response.json();
				return data
					.filter((item) => item.engineType === 0)
					.map(etherealItemToUnified);
			} catch (e) {
				console.error(e);
				return [];
			}
		},
		refetchInterval: 60000,
		enabled: params.enabled,
	});
