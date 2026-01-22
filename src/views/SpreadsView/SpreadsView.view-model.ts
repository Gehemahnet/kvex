import { FilterMatchMode } from "@primevue/core/api";
import { computed, ref } from "vue";
import type { Column } from "../../common/types";
import { useSpreadsSocket } from "../../hooks/useSpreadsSocket";

const SPREAD_FILTERS = [
	{ label: "All", value: null },
	{ label: "> -1%", value: -1 },
	{ label: "> 0%", value: 0 },
	{ label: "> 0.1%", value: 0.1 },
	{ label: "> 0.5%", value: 0.5 },
	{ label: "> 1%", value: 1 },
] as const;

export const useSpreadsViewModel = () => {
	const {
		spreads,
		opportunities,
		exchangeStatus,
		isConnected,
		connectedExchanges,
	} = useSpreadsSocket();

	const minSpreadPercent = ref<number | null>(null);

	const filters = ref({
		symbol: { value: null, matchMode: FilterMatchMode.CONTAINS },
	});

	const columns = computed<Column[]>(() => [
		{ header: "Symbol", columnKey: "symbol", field: "symbol" },
		{ header: "Spread %", columnKey: "spreadPercent", field: "spreadPercent" },
		{ header: "Buy", columnKey: "buyExchange", field: "buyExchange" },
		{ header: "Sell", columnKey: "sellExchange", field: "sellExchange" },
		{ header: "Best Ask", columnKey: "bestAsk", field: "bestAsk" },
		{ header: "Best Bid", columnKey: "bestBid", field: "bestBid" },
		{
			header: "Spread $",
			columnKey: "spreadAbsolute",
			field: "spreadAbsolute",
		},
		{
			header: "Profit $",
			columnKey: "potentialProfitUsd",
			field: "potentialProfitUsd",
		},
	]);

	const filteredSpreads = computed(() => {
		if (minSpreadPercent.value === null) {
			return spreads.value;
		}
		return spreads.value.filter(
			(s) => s.spreadPercent >= minSpreadPercent.value,
		);
	});

	const tableData = computed(() => {
		return filteredSpreads.value.map((s) => ({
			...s,
			spreadPercent: s.spreadPercent,
			spreadAbsolute: s.spreadAbsolute,
			bestBid: s.bestBid,
			bestAsk: s.bestAsk,
			potentialProfitUsd: s.potentialProfitUsd ?? 0,
			availableSize: s.availableSize,
		}));
	});

	const currentSpreadFilter = computed(() => {
		return (
			SPREAD_FILTERS.find((f) => f.value === minSpreadPercent.value) ||
			SPREAD_FILTERS[0]
		);
	});

	const setMinSpreadPercent = (value: number | null) => {
		minSpreadPercent.value = value;
	};

	const connectedExchangesCount = computed(
		() => connectedExchanges.value.length,
	);

	return {
		// Данные
		spreads: filteredSpreads,
		opportunities,
		tableData,
		columns,

		// Фильтры
		filters,
		spreadFilters: SPREAD_FILTERS,
		currentSpreadFilter,
		minSpreadPercent,
		setMinSpreadPercent,

		// Статусы
		exchangeStatus,
		isConnected,
		connectedExchangesCount,
	};
};
