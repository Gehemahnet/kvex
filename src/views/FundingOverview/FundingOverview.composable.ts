import { computed, ref, watch } from "vue";
import { useIndexedDbState } from "@utils/indexed-db-state.utils";
import {
	DEFAULT_FUNDING_EXCHANGES,
	DEFAULT_FUNDING_TIMEFRAME,
	FUNDING_EXCHANGE_OPTIONS,
	FUNDING_OVERVIEW_INITIAL_VISIBLE_ROWS,
	FUNDING_OVERVIEW_ACTIVE_EXCHANGES_INDEXED_DB_KEY,
	FUNDING_OVERVIEW_PINNED_SYMBOLS_INDEXED_DB_KEY,
	FUNDING_OVERVIEW_ROWS_INCREMENT,
	FUNDING_OVERVIEW_SCROLL_LOAD_OFFSET_PX,
	FUNDING_OVERVIEW_ACTIVE_TIMEFRAME_INDEXED_DB_KEY,
} from "./FundingOverview.constants";
import { useFundingOverviewQuery } from "./FundingOverview.query";
import {
	filterFundingOverviewRows,
	formatLastUpdatedAt,
	getFirstExchangeTimestamp,
} from "./FundingOverview.utils";

/** Coordinates funding overview filters, persisted preferences, query state, and table scrolling. */
export const useFundingOverview = () => {
	const selectedTimeframe = useIndexedDbState(
		FUNDING_OVERVIEW_ACTIVE_TIMEFRAME_INDEXED_DB_KEY,
		DEFAULT_FUNDING_TIMEFRAME,
	);
	const selectedExchanges = useIndexedDbState(
		FUNDING_OVERVIEW_ACTIVE_EXCHANGES_INDEXED_DB_KEY,
		[...DEFAULT_FUNDING_EXCHANGES],
	);
	const pinnedSymbols = useIndexedDbState<string[]>(
		FUNDING_OVERVIEW_PINNED_SYMBOLS_INDEXED_DB_KEY,
		[],
	);

	const symbolSearch = ref("");
	const visibleRegularRowCount = ref(FUNDING_OVERVIEW_INITIAL_VISIBLE_ROWS);

	const fundingQuery = useFundingOverviewQuery({
		timeframe: selectedTimeframe,
		exchanges: selectedExchanges,
	});

	const tableRows = computed(() => fundingQuery.data.value?.data ?? []);

	const filteredTableRows = computed(() =>
		filterFundingOverviewRows(tableRows.value, symbolSearch.value),
	);

	const pinnedSymbolSet = computed(() => new Set(pinnedSymbols.value));

	const pinnedTableRows = computed(() =>
		filteredTableRows.value.filter((row) => pinnedSymbolSet.value.has(row.symbol)),
	);

	const regularTableRows = computed(() =>
		filteredTableRows.value.filter(
			(row) => !pinnedSymbolSet.value.has(row.symbol),
		),
	);

	const visibleTableRows = computed(() =>
		regularTableRows.value.slice(0, visibleRegularRowCount.value),
	);

	const regularRowCount = computed(
		() => regularTableRows.value.length,
	);

	const hasMoreRows = computed(
		() => visibleRegularRowCount.value < regularRowCount.value,
	);

	const exchangeColumns = computed(() =>
		selectedExchanges.value.map((exchange) => ({
			exchange,
			label:
				FUNDING_EXCHANGE_OPTIONS.find((option) => option.value === exchange)
					?.label ?? exchange,
		})),
	);

	const exchangeErrors = computed(() => fundingQuery.data.value?.errors ?? []);

	const fundingLabel = computed(() => selectedTimeframe.value);

	const hasSelectedExchanges = computed(() => selectedExchanges.value.length > 0);

	const fundingStatus = computed(() => {
		if (!hasSelectedExchanges.value) {
			return "Select data sources to load funding overview.";
		}

		if (fundingQuery.isLoading.value) {
			return "Loading funding overview...";
		}

		if (fundingQuery.isFetching.value) {
			return "Refreshing funding overview...";
		}

		return formatLastUpdatedAt(
			getFirstExchangeTimestamp(filteredTableRows.value, selectedExchanges.value),
		);
	});

	const loadMoreRows = () => {
		if (!hasMoreRows.value) {
			return;
		}

		visibleRegularRowCount.value = Math.min(
			visibleRegularRowCount.value + FUNDING_OVERVIEW_ROWS_INCREMENT,
			regularRowCount.value,
		);
	};

	const handleTableScroll = (event: Event) => {
		const element = event.currentTarget;

		if (!(element instanceof HTMLElement)) {
			return;
		}

		const distanceToBottom =
			element.scrollHeight - element.scrollTop - element.clientHeight;

		if (distanceToBottom <= FUNDING_OVERVIEW_SCROLL_LOAD_OFFSET_PX) {
			loadMoreRows();
		}
	};

	const isRowPinned = (symbol: string) => pinnedSymbolSet.value.has(symbol);

	const togglePinnedRow = (symbol: string) => {
		const normalizedSymbol = symbol.trim().toUpperCase();

		if (!normalizedSymbol) {
			return;
		}

		pinnedSymbols.value = isRowPinned(normalizedSymbol)
			? pinnedSymbols.value.filter((pinnedSymbol) => pinnedSymbol !== normalizedSymbol)
			: [...pinnedSymbols.value, normalizedSymbol];
	};

	watch(filteredTableRows, () => {
		visibleRegularRowCount.value = FUNDING_OVERVIEW_INITIAL_VISIBLE_ROWS;
	});

	return {
		exchangeColumns,
		exchangeErrors,
		filteredTableRows,
		fundingLabel,
		fundingQuery,
		fundingStatus,
		handleTableScroll,
		hasMoreRows,
		hasSelectedExchanges,
		isRowPinned,
		pinnedSymbols,
		pinnedTableRows,
		selectedExchanges,
		selectedTimeframe,
		symbolSearch,
		togglePinnedRow,
		visibleTableRows,
	};
};
