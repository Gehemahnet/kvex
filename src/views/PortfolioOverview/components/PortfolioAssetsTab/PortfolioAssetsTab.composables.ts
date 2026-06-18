import { createSharedComposable } from "@vueuse/core";
import { useQueryClient } from "@tanstack/vue-query";
import { computed, ref, watch } from "vue";
import type { FilterPanelConfig } from "@components/FilterPanel/FilterPanel.types";
import { useIndexedDbState } from "@utils/indexed-db-state.utils";
import {
	DEFAULT_PORTFOLIO_HIDE_SMALL_ASSETS,
	DEFAULT_PORTFOLIO_MIN_ASSET_VALUE_USD,
	PORTFOLIO_ASSET_FILTERS_INDEXED_DB_KEY,
} from "../../Portfolio.constants";
import {
	useAssetPricesQuery,
	useUserPortfolioBalancesQuery,
	USER_EXCHANGE_TOKENS_QUERY_KEY,
} from "../../Portfolio.query";
import {
	createExchangeAssetRows,
	createPortfolioAssetRows,
	formatUsdValue,
	getPortfolioPriceSymbols,
	getTotalPortfolioValueUsd,
} from "../../Portfolio.utils";
import { usePortfolioSourcesTab } from "../PortfolioSourcesTab/PortfolioSourcesTab.composables";

type PortfolioAssetFilters = {
	hideSmallAssets: boolean;
	minAssetValueUsd: number | null;
};

const DEFAULT_PORTFOLIO_ASSET_FILTERS: PortfolioAssetFilters = {
	hideSmallAssets: DEFAULT_PORTFOLIO_HIDE_SMALL_ASSETS,
	minAssetValueUsd: DEFAULT_PORTFOLIO_MIN_ASSET_VALUE_USD,
};

const createAssetTableFilters = () => ({
	chainName: {
		value: null as string | null,
		matchMode: "equals",
	},
});

/** Owns portfolio asset reads, asset filters, and asset table state. */
export const usePortfolioAssetsTab = createSharedComposable(() => {
	const queryClient = useQueryClient();
	const { walletSourceRows } = usePortfolioSourcesTab();
	const activeWalletSourceRows = computed(() =>
		walletSourceRows.value.filter((source) => source.status === "active"),
	);
	const appliedFilters = useIndexedDbState(
		PORTFOLIO_ASSET_FILTERS_INDEXED_DB_KEY,
		DEFAULT_PORTFOLIO_ASSET_FILTERS,
	);
	const draftFilters = ref<PortfolioAssetFilters>({ ...appliedFilters.value });
	const assetTableFilters = ref(createAssetTableFilters());
	const portfolioBalancesQuery = useUserPortfolioBalancesQuery();
	watch(
		() => portfolioBalancesQuery.data.value?.exchangeBalances,
		(data) => {
			if (data !== undefined) {
				void queryClient.invalidateQueries({ queryKey: USER_EXCHANGE_TOKENS_QUERY_KEY });
			}
		},
	);
	const walletBalances = computed(() =>
		portfolioBalancesQuery.data.value?.walletBalances.balances ?? [],
	);
	const exchangeBalances = computed(() =>
		portfolioBalancesQuery.data.value?.exchangeBalances.balances ?? [],
	);
	const exchangeAccountsCount = computed(() =>
		exchangeBalances.value.length +
		(portfolioBalancesQuery.data.value?.exchangeBalances.errors.length ?? 0),
	);
	const priceSymbols = computed(() =>
		getPortfolioPriceSymbols(walletBalances.value),
	);
	const assetPricesQuery = useAssetPricesQuery({
		symbols: priceSymbols,
	});
	const assetPrices = computed(() => assetPricesQuery.data.value ?? []);
	const assetRows = computed(() =>
		createPortfolioAssetRows(
			walletBalances.value,
			assetPrices.value,
		),
	);
	const exchangeAssetRows = computed(() =>
		createExchangeAssetRows(exchangeBalances.value),
	);
	const allAssetRows = computed(() =>
		[...assetRows.value, ...exchangeAssetRows.value]
			.sort((left, right) => (right.valueUsd ?? 0) - (left.valueUsd ?? 0)),
	);
	const filteredAssetRows = computed(() =>
		allAssetRows.value.filter((row) =>
			!appliedFilters.value.hideSmallAssets ||
			(row.valueUsd ?? 0) >= (appliedFilters.value.minAssetValueUsd ?? 0),
		),
	);
	const walletBalancesCount = computed(() =>
		walletBalances.value.length +
		exchangeBalances.value.reduce((total, balance) => total + balance.assets.length, 0),
	);
	const hiddenAssetRowsCount = computed(() =>
		allAssetRows.value.length - filteredAssetRows.value.length,
	);
	const unpricedBalancesCount = computed(() =>
		Math.max(walletBalancesCount.value - allAssetRows.value.length, 0),
	);
	const assetNetworkOptions = computed(() =>
		[...new Set(allAssetRows.value.map((row) => row.chainName))]
			.sort((left, right) => left.localeCompare(right))
			.map((chainName) => ({
				label: chainName,
				value: chainName,
			})),
	);
	const totalPortfolioValueUsd = computed(() =>
		getTotalPortfolioValueUsd(allAssetRows.value),
	);
	const totalPortfolioValueLabel = computed(() =>
		totalPortfolioValueUsd.value > 0 ? formatUsdValue(totalPortfolioValueUsd.value) : "-",
	);
	const balanceErrors = computed(() =>
		portfolioBalancesQuery.data.value?.walletBalances.errors ?? [],
	);
	const balanceSourceResults = computed(() =>
		portfolioBalancesQuery.data.value?.walletBalances.sourceResults ?? [],
	);
	const balanceErrorMessages = computed(() =>
		balanceErrors.value.map((error) => {
			const chainLabel = error.chainId === undefined ? "" : `Chain ${error.chainId}: `;

			return `${chainLabel}${error.message}`;
		}),
	);
	const balanceQueryErrors = computed(() =>
		[
			portfolioBalancesQuery.error.value,
			assetPricesQuery.error.value,
		].filter(
			(error): error is Error => error instanceof Error,
		),
	);
	const exchangeBalanceErrorMessages = computed(() =>
		(portfolioBalancesQuery.data.value?.exchangeBalances.errors ?? []).map((error) =>
			`${error.exchange}: ${error.message}`
		),
	);
	const exchangeBalanceErrorsCount = computed(() =>
		portfolioBalancesQuery.data.value?.exchangeBalances.errors.length ?? 0
	);
	const totalWalletSourcesCount = computed(() => activeWalletSourceRows.value.length);
	const loadedWalletSourcesCount = computed(() =>
		balanceSourceResults.value.filter((result) => result.status !== "failed").length,
	);
	const loadingWalletSourcesCount = computed(() =>
		portfolioBalancesQuery.isFetching.value || portfolioBalancesQuery.isLoading.value
			? Math.max(totalWalletSourcesCount.value - balanceSourceResults.value.length, 0)
			: 0,
	);
	const failedWalletSourcesCount = computed(() =>
		balanceSourceResults.value.filter((result) => result.status === "failed").length +
		(portfolioBalancesQuery.isError.value ? totalWalletSourcesCount.value : 0),
	);
	const failedBalanceSourcesCount = computed(() =>
		failedWalletSourcesCount.value + exchangeBalanceErrorsCount.value
	);
	const walletLoadStatus = computed(() => {
		if (totalWalletSourcesCount.value === 0) {
			if (portfolioBalancesQuery.isFetching.value || portfolioBalancesQuery.isLoading.value) {
				return "Checking exchange accounts";
			}

			if (exchangeAccountsCount.value > 0) {
				return `${exchangeAccountsCount.value} exchange accounts checked`;
			}

			return "No wallet or exchange sources";
		}

		const baseStatus =
			`${loadedWalletSourcesCount.value} / ${totalWalletSourcesCount.value} sources loaded`;

		if (failedWalletSourcesCount.value > 0) {
			return `${baseStatus}, ${failedWalletSourcesCount.value} failed`;
		}

		return loadingWalletSourcesCount.value > 0
			? `${baseStatus}, loading...`
			: baseStatus;
	});
	const isBalancesFetching = computed(() =>
		portfolioBalancesQuery.isFetching.value ||
		portfolioBalancesQuery.isLoading.value
	);
	const shouldShowAssetTableLoader = computed(() =>
		portfolioBalancesQuery.isLoading.value &&
		filteredAssetRows.value.length === 0
	);
	const assetTableEmptyMessage = computed(() => {
		if (isBalancesFetching.value) {
			return "Loading priced assets from saved portfolio sources.";
		}

		if (totalWalletSourcesCount.value === 0 && exchangeAccountsCount.value === 0) {
			return "Add wallet or exchange sources with priced assets to load portfolio value.";
		}

		return "No priced assets match the current portfolio filters.";
	});
	const isAssetPricesFetching = computed(() => assetPricesQuery.isFetching.value);
	const activeFilterCount = computed(() =>
		[
			appliedFilters.value.hideSmallAssets,
			assetTableFilters.value.chainName.value !== null,
		].filter(Boolean).length,
	);

	const refreshWalletBalances = async () => {
		await portfolioBalancesQuery.refetch();
	};

	const retryFailedWalletBalances = async () => {
		await portfolioBalancesQuery.refetch();
	};

	const syncDraftFilters = () => {
		draftFilters.value = { ...appliedFilters.value };
	};

	const applyDraftFilters = () => {
		appliedFilters.value = { ...draftFilters.value };
	};

	const resetDraftFilters = () => {
		draftFilters.value = { ...DEFAULT_PORTFOLIO_ASSET_FILTERS };
		assetTableFilters.value = createAssetTableFilters();
		applyDraftFilters();
	};
	const filterPanelConfig = computed<FilterPanelConfig>(() => ({
		activeFilterCount: activeFilterCount.value,
		buttonSize: "small",
		onApply: applyDraftFilters,
		onBeforeOpen: syncDraftFilters,
		onReset: resetDraftFilters,
		title: "Portfolio Filters",
	}));

	return {
		assetNetworkOptions,
		assetRows: allAssetRows,
		assetTableFilters,
		balanceErrorMessages,
		balanceQueryErrors,
		draftFilters,
		exchangeBalanceErrorMessages,
		exchangeAccountsCount,
		failedBalanceSourcesCount,
		filterPanelConfig,
		filteredAssetRows,
		hiddenAssetRowsCount,
		isAssetPricesFetching,
		isBalancesFetching,
		refreshWalletBalances,
		retryFailedWalletBalances,
		assetTableEmptyMessage,
		shouldShowAssetTableLoader,
		totalPortfolioValueLabel,
		totalPortfolioValueUsd,
		unpricedBalancesCount,
		walletBalancesCount,
		walletLoadStatus,
	};
});
