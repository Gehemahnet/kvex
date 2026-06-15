import { computed, ref } from "vue";
import type { FilterPanelConfig } from "@components/FilterPanel/FilterPanel.types";
import { useIndexedDbState } from "@utils/indexed-db-state.utils";
import {
	DEFAULT_SPREADS_EXCHANGES,
	DEFAULT_SPREADS_HOLDING_PERIOD_HOURS,
	DEFAULT_SPREADS_HIDE_STALE,
	DEFAULT_SPREADS_MAX_SNAPSHOT_AGE_MS,
	DEFAULT_SPREADS_MIN_CONFIDENCE,
	DEFAULT_SPREADS_MIN_LIFETIME_MS,
	DEFAULT_SPREADS_MIN_OCCURRENCES,
	DEFAULT_SPREADS_MIN_PRICE_SPREAD_PERCENT,
	DEFAULT_SPREADS_ONLY_FEE_ADJUSTED,
	DEFAULT_SPREADS_POSITION_SIZE_USD,
	DEFAULT_SPREADS_ROWS_PER_PAGE,
	SPREADS_FILTERS_INDEXED_DB_KEY,
	SPREADS_ROWS_PER_PAGE_INDEXED_DB_KEY,
	SPREADS_SYMBOL_SEARCH_INDEXED_DB_KEY,
} from "./SpreadsOverview.constants";
import { useSpreadsQuery } from "./SpreadsOverview.query";
import { useSpreadsSocketUpdates } from "./SpreadsOverview.socket";
import type { FundingExchange } from "@api/funding";
import {
	filterSpreadOpportunities,
	getSpreadsSelectionStatus,
	hasEnoughSpreadsExchanges,
} from "./SpreadsOverview.utils";

type SpreadsDraftFilters = {
	hideStale: boolean;
	holdingPeriodHours: number | null;
	maxSnapshotAgeMs: number | null;
	minConfidenceInput: number | null;
	minLifetimeMs: number | null;
	minOccurrences: number | null;
	minPriceSpreadPercentInput: number | null;
	onlyFeeAdjusted: boolean;
	positionSizeUsd: number | null;
	selectedExchanges: FundingExchange[];
};

const createDefaultSpreadsFilters = (): SpreadsDraftFilters => ({
	hideStale: DEFAULT_SPREADS_HIDE_STALE,
	holdingPeriodHours: DEFAULT_SPREADS_HOLDING_PERIOD_HOURS,
	maxSnapshotAgeMs: DEFAULT_SPREADS_MAX_SNAPSHOT_AGE_MS,
	minConfidenceInput: DEFAULT_SPREADS_MIN_CONFIDENCE * 100,
	minLifetimeMs: DEFAULT_SPREADS_MIN_LIFETIME_MS,
	minOccurrences: DEFAULT_SPREADS_MIN_OCCURRENCES,
	minPriceSpreadPercentInput: DEFAULT_SPREADS_MIN_PRICE_SPREAD_PERCENT * 100,
	onlyFeeAdjusted: DEFAULT_SPREADS_ONLY_FEE_ADJUSTED,
	positionSizeUsd: DEFAULT_SPREADS_POSITION_SIZE_USD,
	selectedExchanges: [...DEFAULT_SPREADS_EXCHANGES],
});

/**
 * Owns persisted Spreads page state, REST query state, live socket updates, and
 * final client-side filters consumed by the view.
 */
export const useSpreadsOverview = () => {
	const appliedFilters = useIndexedDbState(
		SPREADS_FILTERS_INDEXED_DB_KEY,
		createDefaultSpreadsFilters(),
	);
	const symbolSearch = useIndexedDbState(
		SPREADS_SYMBOL_SEARCH_INDEXED_DB_KEY,
		"",
	);
	const tableRowsPerPage = useIndexedDbState(
		SPREADS_ROWS_PER_PAGE_INDEXED_DB_KEY,
		DEFAULT_SPREADS_ROWS_PER_PAGE,
	);

	const selectedExchanges = computed(() => appliedFilters.value.selectedExchanges);
	const minPriceSpreadPercent = computed(() =>
		(appliedFilters.value.minPriceSpreadPercentInput ?? 0) / 100,
	);
	const maxSnapshotAgeMs = computed(() =>
		appliedFilters.value.maxSnapshotAgeMs ?? DEFAULT_SPREADS_MAX_SNAPSHOT_AGE_MS,
	);
	const minConfidence = computed(() =>
		(appliedFilters.value.minConfidenceInput ?? 0) / 100,
	);
	const positionSizeUsd = computed(() =>
		appliedFilters.value.positionSizeUsd ?? DEFAULT_SPREADS_POSITION_SIZE_USD,
	);
	const minOccurrences = computed(() =>
		appliedFilters.value.minOccurrences ?? DEFAULT_SPREADS_MIN_OCCURRENCES,
	);
	const minLifetimeMs = computed(() =>
		appliedFilters.value.minLifetimeMs ?? DEFAULT_SPREADS_MIN_LIFETIME_MS,
	);
	const holdingPeriodHours = computed(() =>
		appliedFilters.value.holdingPeriodHours ?? DEFAULT_SPREADS_HOLDING_PERIOD_HOURS,
	);
	const hideStale = computed(() => appliedFilters.value.hideStale);
	const onlyFeeAdjusted = computed(() => appliedFilters.value.onlyFeeAdjusted);
	const draftFilters = ref<SpreadsDraftFilters>({ ...appliedFilters.value });

	const spreadsQuery = useSpreadsQuery({
		exchanges: selectedExchanges,
		minPriceSpreadPercent,
		maxSnapshotAgeMs,
		positionSizeUsd,
		minOccurrences,
		minLifetimeMs,
		holdingPeriodHours,
	});
	useSpreadsSocketUpdates({
		enabled: computed(() => spreadsQuery.isFetched.value),
		exchanges: selectedExchanges,
		minPriceSpreadPercent,
		maxSnapshotAgeMs,
		positionSizeUsd,
		minOccurrences,
		minLifetimeMs,
		holdingPeriodHours,
	});

	const opportunities = computed(() => spreadsQuery.data.value?.data ?? []);
	const filteredOpportunities = computed(() =>
		filterSpreadOpportunities(opportunities.value, symbolSearch.value, {
			hideStale: hideStale.value,
			minConfidence: minConfidence.value,
			onlyFeeAdjusted: onlyFeeAdjusted.value,
		}),
	);
	const exchangeErrors = computed(() => spreadsQuery.data.value?.errors ?? []);
	const hasSelectedExchanges = computed(() =>
		hasEnoughSpreadsExchanges(selectedExchanges.value),
	);
	const selectionStatus = computed(() =>
		getSpreadsSelectionStatus(selectedExchanges.value.length),
	);
	const spreadsStatus = computed(() => {
		if (selectionStatus.value) {
			return selectionStatus.value;
		}

		if (spreadsQuery.isLoading.value) {
			return "Loading spread opportunities...";
		}

		if (spreadsQuery.isFetching.value) {
			return "Refreshing spread opportunities...";
		}

		return `${filteredOpportunities.value.length} opportunities`;
	});
	const activeFilterCount = computed(() =>
		[
			selectedExchanges.value.join(",") !== DEFAULT_SPREADS_EXCHANGES.join(","),
			minPriceSpreadPercent.value !== DEFAULT_SPREADS_MIN_PRICE_SPREAD_PERCENT,
			maxSnapshotAgeMs.value !== DEFAULT_SPREADS_MAX_SNAPSHOT_AGE_MS,
			minConfidence.value !== DEFAULT_SPREADS_MIN_CONFIDENCE,
			positionSizeUsd.value !== DEFAULT_SPREADS_POSITION_SIZE_USD,
			minOccurrences.value !== DEFAULT_SPREADS_MIN_OCCURRENCES,
			minLifetimeMs.value !== DEFAULT_SPREADS_MIN_LIFETIME_MS,
			holdingPeriodHours.value !== DEFAULT_SPREADS_HOLDING_PERIOD_HOURS,
			hideStale.value !== DEFAULT_SPREADS_HIDE_STALE,
			onlyFeeAdjusted.value !== DEFAULT_SPREADS_ONLY_FEE_ADJUSTED,
		].filter(Boolean).length,
	);

	/** Copies committed filters into the popover draft state before editing. */
	const syncDraftFilters = () => {
		draftFilters.value = { ...appliedFilters.value };
	};

	/** Commits popover draft filters to persisted state and refreshes query keys. */
	const applyDraftFilters = () => {
		appliedFilters.value = { ...draftFilters.value };
	};

	/** Restores default spread filters and applies them immediately. */
	const resetDraftFilters = () => {
		draftFilters.value = createDefaultSpreadsFilters();
		applyDraftFilters();
	};
	const filterPanelConfig = computed<FilterPanelConfig>(() => ({
		activeFilterCount: activeFilterCount.value,
		buttonClass: "max-[760px]:w-full",
		onApply: applyDraftFilters,
		onBeforeOpen: syncDraftFilters,
		onReset: resetDraftFilters,
		panelClass: "w-[min(42rem,calc(100vw-2rem))]",
		title: "Spread Filters",
	}));

	return {
		draftFilters,
		exchangeErrors,
		filterPanelConfig,
		filteredOpportunities,
		hasSelectedExchanges,
		selectionStatus,
		spreadsQuery,
		spreadsStatus,
		symbolSearch,
		tableRowsPerPage,
	};
};
