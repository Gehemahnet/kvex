import type { ComputedRef, Ref } from "vue";
import type { LowercaseExchange } from "../../common/types";
import type { UnifiedMarketItem } from "../../types";
import { ACTIVE_EXCHANGES_LOCAL_STORAGE_KEY } from "./useFundingInfo.constants";
import type {
	ExchangeFundingData,
	MarketItemWithExchange,
	MergeExchangesDataResult,
} from "./useFundingInfo.types";

export const buildColumns = (data: MarketItemWithExchange[]) => {
	if (data.length < 1) return;
	// Эфир всегда есть как и биток
	const sampleItem = data.find((item) => item.symbol === "ETH");
	if (!sampleItem) return [];

	const columns = Object.keys(sampleItem)
		.filter((key) => key !== "shortExchange" && key !== "longExchange")
		.map((key) => {
			if (key === "symbol") {
				return {
					header: "Symbol",
					columnKey: "symbol",
					field: "symbol",
				};
			}
			if (key === "bestApr") {
				return {
					header: "Best APR",
					columnKey: "bestApr",
					field: "bestApr",
				};
			}
			const cleanedKey = key.replace(/1h$/, "");
			return {
				columnKey: cleanedKey,
				header: cleanedKey,
				field: key,
			};
		});

	const symbolCol = columns.find((col) => col.columnKey === "symbol");
	const bestAprCol = columns.find((col) => col.columnKey === "bestApr");
	const exchangeCols = columns.filter(
		(col) => col.columnKey !== "symbol" && col.columnKey !== "bestApr",
	);

	return [symbolCol, bestAprCol, ...exchangeCols];
};

export const mergeExchangesData = (
	sources: ExchangeFundingData[],
): MergeExchangesDataResult => {
	const exchangeNames = new Set<LowercaseExchange>();
	const symbolMap = new Map<
		string,
		Map<LowercaseExchange, UnifiedMarketItem>
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

		const exchangeRates: { exchange: LowercaseExchange; rate: number }[] = [];
		for (const [exchange, item] of exchangeMap) {
			unified[`${exchange}1h`] = item.fundingRate;
			if (item.fundingRate) {
				exchangeRates.push({
					exchange,
					rate: Number(item.fundingRate),
				});
			}
		}

		if (exchangeRates.length >= 2) {
			const maxRateItem = exchangeRates.reduce((prev, current) =>
				current.rate > prev.rate ? current : prev,
			);
			const minRateItem = exchangeRates.reduce((prev, current) =>
				current.rate < prev.rate ? current : prev,
			);

			unified.bestApr = String(maxRateItem.rate - minRateItem.rate);
			unified.shortExchange = maxRateItem.exchange;
			unified.longExchange = minRateItem.exchange;
		}

		unifiedItems.push(unified);
	}

	return {
		items: unifiedItems,
		exchangeNames,
	};
};

export const initActiveExchanges = (
	exchanges: ComputedRef<ExchangeFundingData[]>,
	source: Ref<Set<LowercaseExchange>>,
) => {
	const localStorageData = localStorage.getItem(
		ACTIVE_EXCHANGES_LOCAL_STORAGE_KEY,
	);
	if (localStorageData) {
		source.value = new Set(JSON.parse(localStorageData) as LowercaseExchange[]);
	} else {
		for (const exchange of exchanges.value) {
			source.value.add(exchange.name);
		}
	}
};
