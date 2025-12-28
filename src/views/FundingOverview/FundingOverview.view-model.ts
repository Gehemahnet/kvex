import { ref } from "vue";
import { useFundingInfo } from "../../hooks/useFundingInfo.ts";

export const useFundingOverviewViewModel = () => {
	const currentIntervalMultiplier = ref(1);

	const { summaryData, isFetching, columns } = useFundingInfo();

	return { currentIntervalMultiplier, summaryData, columns, isFetching };
};
