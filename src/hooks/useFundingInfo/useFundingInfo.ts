import { useLocalStorage } from "@vueuse/core";
import { computed } from "vue";
import { useEtherealProductsQuery } from "../../api/ethereal/useEtherealProducts.query";
import { usePacificaFundingDataQuery } from "../../api/pacifica/usePacificaFundingData.query";
import { useParadexMarketsSummaryQuery } from "../../api/paradex/useParadexMarketsSummary.query";
import { EXCHANGES } from "../../common/constants";
import type { LowercaseExchange } from "../../common/types";
import { ACTIVE_EXCHANGES_LOCAL_STORAGE_KEY } from "./useFundingInfo.constants";
import { mergeExchangesData } from "./useFundingInfo.helpers";
import type { ExchangeFundingData } from "./useFundingInfo.types";

export const useFundingInfo = () => {
	const activeExchanges = useLocalStorage<Set<LowercaseExchange>>(
		ACTIVE_EXCHANGES_LOCAL_STORAGE_KEY,
		new Set(EXCHANGES),
	);

	const setActiveExchanges = (value: LowercaseExchange[]) => {
		activeExchanges.value = new Set(value);
	};

	const isParadexActive = computed(() => activeExchanges.value.has("paradex"));

	const isPacificaActive = computed(() =>
		activeExchanges.value.has("pacifica"),
	);
	const isEtherealActive = computed(() =>
		activeExchanges.value.has("ethereal"),
	);

	const {
		data: paradexMarketsSummary,
		isFetching: isFetchingParadexMarketsSummary,
		refetch: refetchParadex,
	} = useParadexMarketsSummaryQuery({
		enabled: isParadexActive,
	});

	const {
		data: pacificaMarkets,
		isFetching: isFetchingPacificaMarkets,
		refetch: refetchPacifica,
	} = usePacificaFundingDataQuery({
		enabled: isPacificaActive,
	});

	const {
		data: etherealProducts,
		isFetching: isFetchingEtherealProducts,
		refetch: refetchEthereal,
	} = useEtherealProductsQuery({
		enabled: isEtherealActive,
	});

	const refetchAllMarkets = async () => {
		await Promise.allSettled([
			refetchParadex,
			refetchPacifica,
			refetchEthereal,
		]);
	};

	const exchanges = computed<ExchangeFundingData[]>(() => [
		{ name: "paradex", items: paradexMarketsSummary.value || [] },
		{ name: "pacifica", items: pacificaMarkets.value || [] },
		{ name: "ethereal", items: etherealProducts.value || [] },
	]);

	const summaryData = computed(() =>
		mergeExchangesData(
			exchanges.value.filter((exchange) =>
				activeExchanges.value.has(exchange.name),
			),
		),
	);

	const isFetching = computed(
		() =>
			(isParadexActive.value && isFetchingParadexMarketsSummary.value) ||
			(isPacificaActive.value && isFetchingPacificaMarkets.value) ||
			(isEtherealActive.value && isFetchingEtherealProducts.value),
	);

	return {
		exchanges,
		activeExchanges,
		setActiveExchanges,
		summaryData,
		isFetching,
		refetchAllMarkets,
	};
};
