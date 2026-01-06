import { ref } from "vue";
import { useFundingInfo } from "../../hooks/useFundingInfo/useFundingInfo.ts";

export const useFundingOverviewViewModel = () => {
	const currentIntervalMultiplier = ref(1);

	const { summaryData, isFetching, columns, refetchAllMarkets } =
		useFundingInfo();

	return {
		currentIntervalMultiplier,
		summaryData,
		columns,
		isFetching,
		refetchAllMarkets,
	};
};
