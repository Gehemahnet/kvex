import { FilterMatchMode } from "@primevue/core/api";
import { useLocalStorage } from "@vueuse/core";
import { computed, ref } from "vue";
import type { Column } from "../../common/types";
import { buildColumns, useFundingInfo } from "../../hooks/useFundingInfo";
import { FUNDING_OVERVIEW_ACTIVE_TIMEFRAME_LOCAL_STORAGE_KEY } from "./FundingOverview.constants";

export const useFundingOverviewViewModel = () => {
	const currentIntervalMultiplier = useLocalStorage(
		FUNDING_OVERVIEW_ACTIVE_TIMEFRAME_LOCAL_STORAGE_KEY,
		1,
	);

	const filters = ref({
		symbol: { value: null, matchMode: FilterMatchMode.CONTAINS },
	});
	const {
		activeExchanges,
		summaryData,
		isFetching,
		setActiveExchanges,
		refetchAllMarkets,
	} = useFundingInfo();

	const columns = computed<Column[]>(() =>
		buildColumns(summaryData.value.items),
	);

	return {
		currentIntervalMultiplier,
		summaryData,
		columns,
		setActiveExchanges,
		isFetching,
		refetchAllMarkets,
		filters,
		activeExchanges,
	};
};
