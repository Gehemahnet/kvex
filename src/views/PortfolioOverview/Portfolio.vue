<script setup lang="ts">
import Tab from "primevue/tab";
import TabList from "primevue/tablist";
import TabPanel from "primevue/tabpanel";
import TabPanels from "primevue/tabpanels";
import Tabs from "primevue/tabs";
import CollapsibleCard from "@components/CollapsibleCard/CollapsibleCard.vue";
import PortfolioSummaryCard from "./components/PortfolioSummaryCard.vue";
import { usePortfolioOverviewPage } from "./Portfolio.composables";

const {
	activePortfolioTab,
	portfolioTabs,
	summaryCardProps,
} = usePortfolioOverviewPage();
</script>

<template>
	<section class="flex min-h-[calc(100vh-var(--kvex-topbar-height)-4rem)] flex-col gap-5 max-lg:min-h-[calc(100vh-var(--kvex-topbar-height)-2rem)]">
		<PortfolioSummaryCard v-bind="summaryCardProps" />

		<CollapsibleCard
			content-class="min-h-0 flex-1 overflow-hidden px-6 pb-6 pt-2"
			root-class="flex min-h-0 flex-1 flex-col overflow-hidden"
			title="Portfolio"
		>
			<Tabs
				v-model:value="activePortfolioTab"
				class="flex min-h-0 flex-1 flex-col gap-4"
			>
				<TabList>
					<Tab
						v-for="tab in portfolioTabs"
						:key="tab.value"
						:value="tab.value"
					>
						{{ tab.title }}
					</Tab>
				</TabList>

				<TabPanels class="min-h-0 flex-1 !bg-transparent !p-0 pt-4">
					<TabPanel
						v-for="tab in portfolioTabs"
						:key="tab.value"
						:value="tab.value"
						class="min-h-0"
					>
						<component :is="tab.component" />
					</TabPanel>
				</TabPanels>
			</Tabs>
		</CollapsibleCard>
	</section>
</template>
