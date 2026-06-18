import { computed, ref } from "vue";
import PortfolioAssetsTab from "@views/PortfolioOverview/components/PortfolioAssetsTab/PortfolioAssetsTab.vue";
import { usePortfolioAssetsTab } from "@views/PortfolioOverview/components/PortfolioAssetsTab/PortfolioAssetsTab.composables";
import PortfolioSourcesTab from "@views/PortfolioOverview/components/PortfolioSourcesTab/PortfolioSourcesTab.vue";
import { usePortfolioSourcesTab } from "@views/PortfolioOverview/components/PortfolioSourcesTab/PortfolioSourcesTab.composables";
import { PORTFOLIO_TAB_TITLES, PORTFOLIO_TAB_VALUES } from "./Portfolio.constants";

const PORTFOLIO_TABS = [
	{
		component: PortfolioSourcesTab,
		title: PORTFOLIO_TAB_TITLES[PORTFOLIO_TAB_VALUES.sources],
		value: PORTFOLIO_TAB_VALUES.sources,
	},
	{
		component: PortfolioAssetsTab,
		title: PORTFOLIO_TAB_TITLES[PORTFOLIO_TAB_VALUES.assets],
		value: PORTFOLIO_TAB_VALUES.assets,
	},
];

/** Wires the Portfolio page shell and tab registry. */
export const usePortfolioOverviewPage = () => {
	const activePortfolioTab = ref(PORTFOLIO_TAB_VALUES.sources);
	const {
		assetRows,
		exchangeAccountsCount,
		totalPortfolioValueLabel,
		walletBalancesCount,
	} =
		usePortfolioAssetsTab();
	const { walletAddresses } = usePortfolioSourcesTab();

	const summaryCardProps = computed(() => ({
		assetsCount: assetRows.value.length,
		balancesCount: walletBalancesCount.value,
		exchangeAccountsCount: exchangeAccountsCount.value,
		totalValueLabel: totalPortfolioValueLabel.value,
		walletSourcesCount: walletAddresses.value.length,
	}));

	return {
		activePortfolioTab,
		portfolioTabs: PORTFOLIO_TABS,
		summaryCardProps,
	};
};
