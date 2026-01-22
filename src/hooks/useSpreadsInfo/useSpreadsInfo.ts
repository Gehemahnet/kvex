import { useLocalStorage } from "@vueuse/core";
import { computed } from "vue";
import { useEtherealBBOQuery } from "../../api/ethereal/useEtherealBBO.query";
import { useHyperliquidBBOQuery } from "../../api/hyperliquid/useHyperliquidBBO.query";
import { usePacificaBBOQuery } from "../../api/pacifica/usePacificaBBO.query";
import { useParadexBBOQuery } from "../../api/paradex/useParadexBBO.query";
import { EXCHANGES } from "../../common/constants";
import type { LowercaseExchange } from "../../common/types";
import {
	ACTIVE_EXCHANGES_SPREADS_LOCAL_STORAGE_KEY,
	DEFAULT_MIN_SPREAD_PERCENT,
	MIN_SPREAD_PERCENT_LOCAL_STORAGE_KEY,
} from "./useSpreadsInfo.constants";
import { findSpreadOpportunities } from "./useSpreadsInfo.helpers";
import type { ExchangePriceData, SpreadOpportunity } from "./useSpreadsInfo.types";

export const useSpreadsInfo = () => {
	const activeExchanges = useLocalStorage<Set<LowercaseExchange>>(
		ACTIVE_EXCHANGES_SPREADS_LOCAL_STORAGE_KEY,
		new Set(EXCHANGES),
	);

	const minSpreadPercent = useLocalStorage<number>(
		MIN_SPREAD_PERCENT_LOCAL_STORAGE_KEY,
		DEFAULT_MIN_SPREAD_PERCENT,
	);

	const setActiveExchanges = (value: LowercaseExchange[]) => {
		activeExchanges.value = new Set(value);
	};

	const setMinSpreadPercent = (value: number) => {
		minSpreadPercent.value = value;
	};

	const isParadexActive = computed(() => activeExchanges.value.has("paradex"));
	const isPacificaActive = computed(() => activeExchanges.value.has("pacifica"));
	const isEtherealActive = computed(() => activeExchanges.value.has("ethereal"));
	const isHyperliquidActive = computed(() => activeExchanges.value.has("hyperliquid"));

	const {
		data: paradexBBO,
		isFetching: isFetchingParadex,
		refetch: refetchParadex,
	} = useParadexBBOQuery({
		enabled: isParadexActive,
	});

	const {
		data: pacificaBBO,
		isFetching: isFetchingPacifica,
		refetch: refetchPacifica,
	} = usePacificaBBOQuery({
		enabled: isPacificaActive,
	});

	const {
		data: etherealBBO,
		isFetching: isFetchingEthereal,
		refetch: refetchEthereal,
	} = useEtherealBBOQuery({
		enabled: isEtherealActive,
	});

	const {
		data: hyperliquidBBO,
		isFetching: isFetchingHyperliquid,
		refetch: refetchHyperliquid,
	} = useHyperliquidBBOQuery({
		enabled: isHyperliquidActive,
	});

	const refetchAll = async () => {
		await Promise.allSettled([
			refetchParadex(),
			refetchPacifica(),
			refetchEthereal(),
			refetchHyperliquid(),
		]);
	};

	const exchangesData = computed<ExchangePriceData[]>(() => {
		const data: ExchangePriceData[] = [];

		if (isParadexActive.value) {
			data.push({
				name: "paradex",
				items: paradexBBO.value || [],
				isConnected: !isFetchingParadex.value && (paradexBBO.value?.length ?? 0) > 0,
				lastUpdatedAt: Date.now(),
			});
		}

		if (isPacificaActive.value) {
			data.push({
				name: "pacifica",
				items: pacificaBBO.value || [],
				isConnected: !isFetchingPacifica.value && (pacificaBBO.value?.length ?? 0) > 0,
				lastUpdatedAt: Date.now(),
			});
		}

		if (isEtherealActive.value) {
			data.push({
				name: "ethereal",
				items: etherealBBO.value || [],
				isConnected: !isFetchingEthereal.value && (etherealBBO.value?.length ?? 0) > 0,
				lastUpdatedAt: Date.now(),
			});
		}

		if (isHyperliquidActive.value) {
			data.push({
				name: "hyperliquid",
				items: hyperliquidBBO.value || [],
				isConnected: !isFetchingHyperliquid.value && (hyperliquidBBO.value?.length ?? 0) > 0,
				lastUpdatedAt: Date.now(),
			});
		}

		return data;
	});

	const spreadOpportunities = computed<SpreadOpportunity[]>(() => {
		return findSpreadOpportunities(exchangesData.value, minSpreadPercent.value);
	});

	const isFetching = computed(
		() =>
			(isParadexActive.value && isFetchingParadex.value) ||
			(isPacificaActive.value && isFetchingPacifica.value) ||
			(isEtherealActive.value && isFetchingEthereal.value) ||
			(isHyperliquidActive.value && isFetchingHyperliquid.value),
	);

	const connectedExchangesCount = computed(() => {
		return exchangesData.value.filter((e) => e.isConnected).length;
	});

	return {
		activeExchanges,
		setActiveExchanges,
		minSpreadPercent,
		setMinSpreadPercent,
		exchangesData,
		spreadOpportunities,
		isFetching,
		connectedExchangesCount,
		refetchAll,
	};
};
