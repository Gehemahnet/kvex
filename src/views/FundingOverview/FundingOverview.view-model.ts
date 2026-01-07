import { computed, ref } from "vue";
import { buildColumns, useFundingInfo } from "../../hooks/useFundingInfo";

export const useFundingOverviewViewModel = () => {
	const currentIntervalMultiplier = ref(1);

	const {
		activeExchanges,
		summaryData,
		isFetching,
		setActiveExchanges,
		refetchAllMarkets,
	} = useFundingInfo();

	const columns = computed(() => buildColumns(summaryData.value.items));

	return {
		currentIntervalMultiplier,
		summaryData,
		columns,
		setActiveExchanges,
		isFetching,
		refetchAllMarkets,
		activeExchanges,
	};
};
