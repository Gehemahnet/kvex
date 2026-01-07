import { computed, ref } from "vue";
import type { LowercaseExchange } from "../../common/types.ts";
import { buildColumns, useFundingInfo } from "../../hooks/useFundingInfo";

export const useFundingOverviewViewModel = () => {
	const currentIntervalMultiplier = ref(1);

	const { activeExchanges, summaryData, isFetching, refetchAllMarkets } =
		useFundingInfo(computed(() => activeExchanges.value));

	const columns = computed(() => buildColumns(summaryData.value.items));

	const toggleExchange = (exchange: LowercaseExchange) => {
		const newSet = new Set(activeExchanges.value);
		if (newSet.has(exchange)) {
			if (newSet.size > 1) {
				// Keep at least one exchange active
				newSet.delete(exchange);
			}
		} else {
			newSet.add(exchange);
		}
		activeExchanges.value = newSet;
	};

	return {
		currentIntervalMultiplier,
		summaryData,
		columns,
		isFetching,
		refetchAllMarkets,
		activeExchanges,
		toggleExchange,
	};
};
