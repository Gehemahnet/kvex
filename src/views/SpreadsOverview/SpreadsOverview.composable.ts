import { computed, ref } from "vue";
import { useValidatedLocalStorage } from "../../common/local-storage.utils";
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
	SPREADS_ACTIVE_EXCHANGES_LOCAL_STORAGE_KEY,
	SPREADS_HOLDING_PERIOD_LOCAL_STORAGE_KEY,
	SPREADS_HIDE_STALE_LOCAL_STORAGE_KEY,
	SPREADS_MAX_SNAPSHOT_AGE_LOCAL_STORAGE_KEY,
	SPREADS_MIN_CONFIDENCE_LOCAL_STORAGE_KEY,
	SPREADS_MIN_LIFETIME_LOCAL_STORAGE_KEY,
	SPREADS_MIN_OCCURRENCES_LOCAL_STORAGE_KEY,
	SPREADS_MIN_PRICE_SPREAD_LOCAL_STORAGE_KEY,
	SPREADS_ONLY_FEE_ADJUSTED_LOCAL_STORAGE_KEY,
	SPREADS_POSITION_SIZE_LOCAL_STORAGE_KEY,
	SPREADS_ROWS_PER_PAGE_LOCAL_STORAGE_KEY,
	SPREADS_SYMBOL_SEARCH_LOCAL_STORAGE_KEY,
} from "./SpreadsOverview.constants";
import { useSpreadsQuery } from "./SpreadsOverview.query";
import { useSpreadsSocketUpdates } from "./SpreadsOverview.socket";
import type { FundingExchange } from "../FundingOverview/FundingOverview.types";
import {
	filterSpreadOpportunities,
	getSpreadsSelectionStatus,
	hasEnoughSpreadsExchanges,
	isBoolean,
	isSpreadsExchangeList,
	normalizeSpreadsExchanges,
	normalizeSpreadsNumber,
} from "./SpreadsOverview.utils";

const isString = (value: unknown): value is string => typeof value === "string";

const isNonNegativeNumber = (value: unknown): value is number =>
	typeof value === "number" && !Number.isNaN(value) && value >= 0;

const isPositiveNumber = (value: unknown): value is number =>
	typeof value === "number" && !Number.isNaN(value) && value > 0;

/**
 * Owns persisted Spreads page state, REST query state, live socket updates, and
 * final client-side filters consumed by the view.
 */
export const useSpreadsOverview = () => {
	const storedExchanges = useValidatedLocalStorage(
		SPREADS_ACTIVE_EXCHANGES_LOCAL_STORAGE_KEY,
		[...DEFAULT_SPREADS_EXCHANGES],
		isSpreadsExchangeList,
	);
	const symbolSearch = useValidatedLocalStorage(
		SPREADS_SYMBOL_SEARCH_LOCAL_STORAGE_KEY,
		"",
		isString,
	);
	const storedMinPriceSpreadPercent = useValidatedLocalStorage(
		SPREADS_MIN_PRICE_SPREAD_LOCAL_STORAGE_KEY,
		DEFAULT_SPREADS_MIN_PRICE_SPREAD_PERCENT,
		isNonNegativeNumber,
	);
	const storedMaxSnapshotAgeMs = useValidatedLocalStorage(
		SPREADS_MAX_SNAPSHOT_AGE_LOCAL_STORAGE_KEY,
		DEFAULT_SPREADS_MAX_SNAPSHOT_AGE_MS,
		isNonNegativeNumber,
	);
	const minConfidence = useValidatedLocalStorage(
		SPREADS_MIN_CONFIDENCE_LOCAL_STORAGE_KEY,
		DEFAULT_SPREADS_MIN_CONFIDENCE,
		isNonNegativeNumber,
	);
	const storedPositionSizeUsd = useValidatedLocalStorage(
		SPREADS_POSITION_SIZE_LOCAL_STORAGE_KEY,
		DEFAULT_SPREADS_POSITION_SIZE_USD,
		isNonNegativeNumber,
	);
	const storedMinOccurrences = useValidatedLocalStorage(
		SPREADS_MIN_OCCURRENCES_LOCAL_STORAGE_KEY,
		DEFAULT_SPREADS_MIN_OCCURRENCES,
		isNonNegativeNumber,
	);
	const storedMinLifetimeMs = useValidatedLocalStorage(
		SPREADS_MIN_LIFETIME_LOCAL_STORAGE_KEY,
		DEFAULT_SPREADS_MIN_LIFETIME_MS,
		isNonNegativeNumber,
	);
	const storedHoldingPeriodHours = useValidatedLocalStorage(
		SPREADS_HOLDING_PERIOD_LOCAL_STORAGE_KEY,
		DEFAULT_SPREADS_HOLDING_PERIOD_HOURS,
		isNonNegativeNumber,
	);
	const hideStale = useValidatedLocalStorage(
		SPREADS_HIDE_STALE_LOCAL_STORAGE_KEY,
		DEFAULT_SPREADS_HIDE_STALE,
		isBoolean,
	);
	const onlyFeeAdjusted = useValidatedLocalStorage(
		SPREADS_ONLY_FEE_ADJUSTED_LOCAL_STORAGE_KEY,
		DEFAULT_SPREADS_ONLY_FEE_ADJUSTED,
		isBoolean,
	);
	const tableRowsPerPage = useValidatedLocalStorage(
		SPREADS_ROWS_PER_PAGE_LOCAL_STORAGE_KEY,
		DEFAULT_SPREADS_ROWS_PER_PAGE,
		isPositiveNumber,
	);

	const selectedExchanges = computed({
		get: () => normalizeSpreadsExchanges(storedExchanges.value),
		set: (exchanges) => {
			storedExchanges.value = normalizeSpreadsExchanges(exchanges);
		},
	});
	const draftSelectedExchanges = ref<FundingExchange[]>([
		...selectedExchanges.value,
	]);
	const minPriceSpreadPercent = computed({
		get: () =>
			normalizeSpreadsNumber(
				storedMinPriceSpreadPercent.value,
				DEFAULT_SPREADS_MIN_PRICE_SPREAD_PERCENT,
			),
		set: (value) => {
			storedMinPriceSpreadPercent.value = normalizeSpreadsNumber(
				value,
				DEFAULT_SPREADS_MIN_PRICE_SPREAD_PERCENT,
			);
		},
	});
	const maxSnapshotAgeMs = computed({
		get: () =>
			normalizeSpreadsNumber(
				storedMaxSnapshotAgeMs.value,
				DEFAULT_SPREADS_MAX_SNAPSHOT_AGE_MS,
			),
		set: (value) => {
			storedMaxSnapshotAgeMs.value = normalizeSpreadsNumber(
				value,
				DEFAULT_SPREADS_MAX_SNAPSHOT_AGE_MS,
			);
		},
	});
	const minPriceSpreadPercentInput = computed({
		get: () => minPriceSpreadPercent.value * 100,
		set: (value) => {
			minPriceSpreadPercent.value = normalizeSpreadsNumber(value, 0) / 100;
		},
	});
	const draftMinPriceSpreadPercentInput = ref(
		minPriceSpreadPercent.value * 100,
	);
	const minConfidenceInput = computed({
		get: () => minConfidence.value * 100,
		set: (value) => {
			minConfidence.value = Math.min(1, normalizeSpreadsNumber(value, 0) / 100);
		},
	});
	const draftMinConfidenceInput = ref(minConfidence.value * 100);
	const positionSizeUsd = computed({
		get: () =>
			normalizeSpreadsNumber(
				storedPositionSizeUsd.value,
				DEFAULT_SPREADS_POSITION_SIZE_USD,
			),
		set: (value) => {
			storedPositionSizeUsd.value = normalizeSpreadsNumber(
				value,
				DEFAULT_SPREADS_POSITION_SIZE_USD,
			);
		},
	});
	const minOccurrences = computed({
		get: () =>
			Math.floor(
				normalizeSpreadsNumber(
					storedMinOccurrences.value,
					DEFAULT_SPREADS_MIN_OCCURRENCES,
				),
			),
		set: (value) => {
			storedMinOccurrences.value = Math.floor(
				normalizeSpreadsNumber(value, DEFAULT_SPREADS_MIN_OCCURRENCES),
			);
		},
	});
	const minLifetimeMs = computed({
		get: () =>
			normalizeSpreadsNumber(
				storedMinLifetimeMs.value,
				DEFAULT_SPREADS_MIN_LIFETIME_MS,
			),
		set: (value) => {
			storedMinLifetimeMs.value = normalizeSpreadsNumber(
				value,
				DEFAULT_SPREADS_MIN_LIFETIME_MS,
			);
		},
	});
	const holdingPeriodHours = computed({
		get: () =>
			normalizeSpreadsNumber(
				storedHoldingPeriodHours.value,
				DEFAULT_SPREADS_HOLDING_PERIOD_HOURS,
			),
		set: (value) => {
			storedHoldingPeriodHours.value = normalizeSpreadsNumber(
				value,
				DEFAULT_SPREADS_HOLDING_PERIOD_HOURS,
			);
		},
	});
	const draftMaxSnapshotAgeMs = ref(maxSnapshotAgeMs.value);
	const draftPositionSizeUsd = ref(positionSizeUsd.value);
	const draftMinOccurrences = ref(minOccurrences.value);
	const draftMinLifetimeMs = ref(minLifetimeMs.value);
	const draftHoldingPeriodHours = ref(holdingPeriodHours.value);
	const draftHideStale = ref(hideStale.value);
	const draftOnlyFeeAdjusted = ref(onlyFeeAdjusted.value);

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
		draftSelectedExchanges.value = [...selectedExchanges.value];
		draftMinPriceSpreadPercentInput.value = minPriceSpreadPercent.value * 100;
		draftMaxSnapshotAgeMs.value = maxSnapshotAgeMs.value;
		draftMinConfidenceInput.value = minConfidence.value * 100;
		draftPositionSizeUsd.value = positionSizeUsd.value;
		draftMinOccurrences.value = minOccurrences.value;
		draftMinLifetimeMs.value = minLifetimeMs.value;
		draftHoldingPeriodHours.value = holdingPeriodHours.value;
		draftHideStale.value = hideStale.value;
		draftOnlyFeeAdjusted.value = onlyFeeAdjusted.value;
	};

	/** Commits popover draft filters to persisted state and refreshes query keys. */
	const applyDraftFilters = () => {
		selectedExchanges.value = draftSelectedExchanges.value;
		minPriceSpreadPercentInput.value = draftMinPriceSpreadPercentInput.value;
		maxSnapshotAgeMs.value = draftMaxSnapshotAgeMs.value;
		minConfidenceInput.value = draftMinConfidenceInput.value;
		positionSizeUsd.value = draftPositionSizeUsd.value;
		minOccurrences.value = draftMinOccurrences.value;
		minLifetimeMs.value = draftMinLifetimeMs.value;
		holdingPeriodHours.value = draftHoldingPeriodHours.value;
		hideStale.value = draftHideStale.value;
		onlyFeeAdjusted.value = draftOnlyFeeAdjusted.value;
	};

	/** Restores default spread filters and applies them immediately. */
	const resetDraftFilters = () => {
		draftSelectedExchanges.value = [...DEFAULT_SPREADS_EXCHANGES];
		draftMinPriceSpreadPercentInput.value =
			DEFAULT_SPREADS_MIN_PRICE_SPREAD_PERCENT * 100;
		draftMaxSnapshotAgeMs.value = DEFAULT_SPREADS_MAX_SNAPSHOT_AGE_MS;
		draftMinConfidenceInput.value = DEFAULT_SPREADS_MIN_CONFIDENCE * 100;
		draftPositionSizeUsd.value = DEFAULT_SPREADS_POSITION_SIZE_USD;
		draftMinOccurrences.value = DEFAULT_SPREADS_MIN_OCCURRENCES;
		draftMinLifetimeMs.value = DEFAULT_SPREADS_MIN_LIFETIME_MS;
		draftHoldingPeriodHours.value = DEFAULT_SPREADS_HOLDING_PERIOD_HOURS;
		draftHideStale.value = DEFAULT_SPREADS_HIDE_STALE;
		draftOnlyFeeAdjusted.value = DEFAULT_SPREADS_ONLY_FEE_ADJUSTED;
		applyDraftFilters();
	};

	return {
		activeFilterCount,
		applyDraftFilters,
		draftHideStale,
		draftHoldingPeriodHours,
		draftMaxSnapshotAgeMs,
		draftMinConfidenceInput,
		draftMinLifetimeMs,
		draftMinOccurrences,
		draftMinPriceSpreadPercentInput,
		draftOnlyFeeAdjusted,
		draftPositionSizeUsd,
		draftSelectedExchanges,
		exchangeErrors,
		filteredOpportunities,
		hasSelectedExchanges,
		selectionStatus,
		spreadsQuery,
		spreadsStatus,
		symbolSearch,
		tableRowsPerPage,
		resetDraftFilters,
		syncDraftFilters,
	};
};
