import { computed } from "vue";
import { useEtherealProductsQuery } from "../../api/ethereal/useEtherealProducts.query.ts";
import { usePacificaFundingDataQuery } from "../../api/pacifica/usePacificaFundingData.query.ts";
import { useParadexMarketsSummaryQuery } from "../../api/paradex/useParadexMarketsSummary.query.ts";
import type { Exchange } from "../../common/types.ts";
import type { UnifiedMarketItem } from "../../types";
import type { MarketItemWithExchange } from "./useFundingInfo.types.ts";

const mergeExchangesData = (
	sources: {
		name: Lowercase<Exchange>;
		items: UnifiedMarketItem[];
	}[],
): {
	items: MarketItemWithExchange[];
	exchangeNames: Set<Lowercase<Exchange>>;
} => {
	const exchangeNames = new Set<Lowercase<Exchange>>();
	const symbolMap = new Map<
		string,
		Map<Lowercase<Exchange>, UnifiedMarketItem>
	>();

	for (const { name, items } of sources) {
		exchangeNames.add(name);

		for (const item of items) {
			if (!symbolMap.has(item.symbol)) {
				symbolMap.set(item.symbol, new Map());
			}

			symbolMap.get(item.symbol)?.set(name, item);
		}
	}

	const unifiedItems: MarketItemWithExchange[] = [];

	for (const [symbol, exchangeMap] of symbolMap) {
		if (exchangeMap.size < 2) continue;
		const unified: MarketItemWithExchange = {
			symbol,
		};

		for (const [exchange, item] of exchangeMap) {
			unified[`${exchange}1h`] = item.fundingRate;
		}

		unifiedItems.push(unified);
	}

	return {
		items: unifiedItems,
		exchangeNames,
	};
};

const buildColumns = (data: MarketItemWithExchange[]) => {
	if (data.length < 1) return;
	// Эфир всегда есть как и биток
	const sampleItem = data.find((item) => item.symbol === "ETH");
	if (!sampleItem) return [];
	return Object.keys(sampleItem).map((key) => {
		if (key === "symbol") {
			return {
				header: "Symbol",
				columnKey: "symbol",
				field: "symbol",
			};
		}
		const cleanedKey = key.replace(/1h$/, "");
		return {
			columnKey: cleanedKey,
			header: cleanedKey,
			field: key,
		};
	});
};

export const useFundingInfo = () => {
	const {
		data: paradexMarkets,
		isFetching: isFetchingParadex,
		refetch: refetchParadex,
	} = useParadexMarketsSummaryQuery();

	const {
		data: pacificaMarkets,
		isFetching: isFetchingPacificaMarkets,
		refetch: refetchPacifica,
	} = usePacificaFundingDataQuery();
	const {
		data: etherealProducts,
		isFetching: isFetchingEtherealProducts,
		refetch: refetchEthereal,
	} = useEtherealProductsQuery();

	const refetchAllMarkets = async () => {
		await Promise.allSettled([
			refetchParadex,
			refetchPacifica,
			refetchEthereal,
		]);
	};

	const summaryData = computed(() =>
		mergeExchangesData([
			{ name: "paradex", items: paradexMarkets.value || [] },
			{ name: "pacifica", items: pacificaMarkets.value || [] },
			{ name: "ethereal", items: etherealProducts.value || [] },
		]),
	);

	const isFetching = computed(
		() =>
			isFetchingParadex.value ||
			isFetchingEtherealProducts.value ||
			isFetchingPacificaMarkets.value,
	);

	const columns = computed(() => buildColumns(summaryData.value.items));

	return { summaryData, isFetching, columns, refetchAllMarkets };
};
