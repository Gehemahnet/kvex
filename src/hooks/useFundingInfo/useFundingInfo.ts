import { computed, ref } from "vue";
import { useEtherealProductsQuery } from "../../api/ethereal/useEtherealProducts.query.ts";
import { usePacificaFundingDataQuery } from "../../api/pacifica/usePacificaFundingData.query.ts";
import { useParadexMarketsSummaryQuery } from "../../api/paradex/useParadexMarketsSummary.query.ts";
import type { LowercaseExchange } from "../../common/types.ts";
import {
	initActiveExchanges,
	mergeExchangesData,
} from "./useFundingInfo.helpers.ts";

export const useFundingInfo = () => {
	const activeExchanges = ref<Set<LowercaseExchange>>(new Set());

	const addActiveExchange = (activeExchange: LowercaseExchange) => {
		activeExchanges.value.add(activeExchange);
	};
	const removeActiveExchange = (activeExchange: LowercaseExchange) => {
		activeExchanges.value.delete(activeExchange);
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

	const exchanges = computed(() => [
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

	activeExchanges.value = initActiveExchanges(exchanges);

	return {
		exchanges,
		activeExchanges,
		addActiveExchange,
		removeActiveExchange,
		summaryData,
		isFetching,
		refetchAllMarkets,
	};
};
