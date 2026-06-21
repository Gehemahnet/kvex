<script setup lang="ts">
import { computed, ref } from "vue";
import Button from "primevue/button";
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import Message from "primevue/message";
import Tab from "primevue/tab";
import TabList from "primevue/tablist";
import TabPanel from "primevue/tabpanel";
import TabPanels from "primevue/tabpanels";
import Tabs from "primevue/tabs";
import Tag from "primevue/tag";
import { useUserTradingHistoryQuery, useUserTradingPositionsQuery } from "./Trading.query";
import {
	formatTradingDecimal,
	formatTradingQuoteValue,
	formatTradingUsd,
	getFlexibleLeverageTooltip,
	getTradingExchangeLabel,
	getTradingPnlClass,
	hasFlexibleLeverage,
} from "./Trading.utils";

const activeTab = ref("positions");
const positionsQuery = useUserTradingPositionsQuery();
const historyQuery = useUserTradingHistoryQuery();
const positions = computed(() => positionsQuery.data.value?.positions ?? []);
const historyPositions = computed(() => historyQuery.data.value?.positions ?? []);
const errors = computed(() => positionsQuery.data.value?.errors ?? []);
const historyErrors = computed(() => historyQuery.data.value?.errors ?? []);

const refresh = async () => {
	await positionsQuery.refetch();
	if (activeTab.value === "history") await historyQuery.refetch();
};
</script>

<template>
	<section class="flex min-h-[calc(100vh-var(--kvex-topbar-height)-4rem)] flex-col gap-4 max-lg:min-h-[calc(100vh-var(--kvex-topbar-height)-2rem)]">
		<div class="flex flex-wrap items-start justify-between gap-3">
			<div>
				<h1 class="m-0 text-[1.35rem] font-semibold text-[var(--p-text-color)]">
					Trading
				</h1>
				<p class="m-0 mt-1 text-[0.8125rem] text-[var(--p-text-muted-color)]">
					Read-only open and closed positions across connected exchanges · positions refresh every 5s.
				</p>
			</div>
			<Button
				icon="pi pi-refresh"
				label="Refresh"
				severity="secondary"
				:loading="positionsQuery.isFetching.value"
				@click="refresh"
			/>
		</div>

		<div class="kvex-data-surface min-h-0 flex-1 overflow-hidden rounded-xl border border-[var(--kvex-panel-border)] bg-[var(--kvex-panel-background)] p-5">
			<Tabs
				v-model:value="activeTab"
				class="flex min-h-0 h-full flex-col"
			>
				<TabList>
					<Tab value="positions">Positions</Tab>
					<Tab value="history">History</Tab>
				</TabList>

				<TabPanels class="min-h-0 flex-1 !bg-transparent !px-0 !pb-0 pt-4">
					<TabPanel value="positions">
						<div
							v-if="errors.length > 0"
							class="mb-4 grid gap-2"
						>
							<Message
								v-for="error in errors"
								:key="error.accountId"
								severity="warn"
							>
								{{ error.label }}: {{ error.message }}
							</Message>
						</div>

						<DataTable
							:value="positions"
							data-key="id"
							:loading="positionsQuery.isLoading.value"
							scrollable
							sort-field="notionalUsd"
							:sort-order="-1"
							table-style="min-width: 76rem"
						>
							<Column field="symbol" header="Market" sortable>
								<template #body="{ data }">
									<div class="font-bold text-[var(--kvex-symbol-color)]">{{ data.symbol }} / {{ data.quoteAsset }}</div>
									<div class="text-xs text-[var(--kvex-text-muted-color)]">{{ data.sourceSymbol }}</div>
								</template>
							</Column>
							<Column field="side" header="Side" sortable>
								<template #body="{ data }">
									<Tag
										:value="data.side.toUpperCase()"
										:severity="data.side === 'long' ? 'success' : 'danger'"
									/>
								</template>
							</Column>
							<Column field="size" header="Size" sortable>
								<template #body="{ data }">
									<div>{{ formatTradingDecimal(data.size) }} {{ data.symbol }}</div>
									<div class="text-xs text-[var(--kvex-text-muted-color)]">
										{{ formatTradingQuoteValue(data.notionalUsd, data.quoteAsset) }}
									</div>
								</template>
							</Column>
							<Column field="entryPrice" header="Entry">
								<template #body="{ data }">{{ formatTradingDecimal(data.entryPrice) }}</template>
							</Column>
							<Column field="markPrice" header="Mark">
								<template #body="{ data }">{{ formatTradingDecimal(data.markPrice) }}</template>
							</Column>
							<Column field="liquidationPrice" header="Liquidation">
								<template #body="{ data }">
									<span v-if="data.liquidationPrice !== undefined">
										{{ formatTradingDecimal(data.liquidationPrice) }}
									</span>
									<span v-else>-</span>
								</template>
							</Column>
							<Column field="leverage" header="Leverage">
								<template #body="{ data }">
									<span v-if="data.leverage !== undefined">{{ data.leverage }}x</span>
									<span
										v-else-if="hasFlexibleLeverage(data)"
										v-tooltip.top="getFlexibleLeverageTooltip(data.exchange)"
										class="inline-flex cursor-help items-center gap-1 border-b border-dotted border-current text-[var(--p-text-muted-color)]"
										tabindex="0"
									>
										Flexible
										<i class="pi pi-info-circle text-xs" aria-hidden="true" />
									</span>
									<span v-else>-</span>
								</template>
							</Column>
							<Column field="unrealizedPnlUsd" header="Unrealized PnL" sortable>
								<template #body="{ data }">
									<span :class="getTradingPnlClass(data.unrealizedPnlUsd)">
										{{ formatTradingUsd(data.unrealizedPnlUsd) }}
									</span>
								</template>
							</Column>
							<Column field="exchange" header="Exchange" sortable>
								<template #body="{ data }">
									{{ getTradingExchangeLabel(data.exchange) }}
								</template>
							</Column>
							<template #empty>
								<div class="flex h-64 items-center justify-center text-sm text-[var(--kvex-text-muted-color)]">
									No open positions across connected exchanges.
								</div>
							</template>
						</DataTable>
					</TabPanel>

					<TabPanel value="history">
						<div
							v-if="historyErrors.length > 0"
							class="mb-4 grid gap-2"
						>
							<Message
								v-for="error in historyErrors"
								:key="error.accountId"
								severity="warn"
							>
								{{ error.label }}: {{ error.message }}
							</Message>
						</div>

						<DataTable
							:value="historyPositions"
							data-key="id"
							:loading="historyQuery.isLoading.value"
							scrollable
							table-style="min-width: 64rem"
						>
							<Column field="openedAt" header="Opened" sortable>
								<template #body="{ data }">{{ new Date(data.openedAt).toLocaleString() }}</template>
							</Column>
							<Column field="closedAt" header="Closed" sortable>
								<template #body="{ data }">{{ new Date(data.closedAt).toLocaleString() }}</template>
							</Column>
							<Column field="symbol" header="Market" sortable>
								<template #body="{ data }">{{ data.symbol }} / {{ data.quoteAsset }}</template>
							</Column>
							<Column field="side" header="Side" sortable>
								<template #body="{ data }">
									<Tag :value="data.side.toUpperCase()" :severity="data.side === 'long' ? 'success' : 'danger'" />
								</template>
							</Column>
							<Column field="size" header="Size">
								<template #body="{ data }">{{ formatTradingDecimal(data.size) }} {{ data.symbol }}</template>
							</Column>
							<Column field="entryPrice" header="Entry">
								<template #body="{ data }">{{ formatTradingQuoteValue(data.entryPrice, data.quoteAsset) }}</template>
							</Column>
							<Column field="exitPrice" header="Exit">
								<template #body="{ data }">{{ formatTradingQuoteValue(data.exitPrice, data.quoteAsset) }}</template>
							</Column>
							<Column field="realizedPnlUsd" header="Realized PnL">
								<template #body="{ data }">
									<span :class="getTradingPnlClass(data.realizedPnlUsd)">{{ formatTradingUsd(data.realizedPnlUsd) }}</span>
								</template>
							</Column>
							<Column field="exchange" header="Exchange" sortable>
								<template #body="{ data }">{{ getTradingExchangeLabel(data.exchange) }}</template>
							</Column>
							<template #empty>
								<div class="flex h-64 items-center justify-center text-sm text-[var(--kvex-text-muted-color)]">
									No closed position history for connected Ethereal, Nado, or OKX accounts.
								</div>
							</template>
						</DataTable>
					</TabPanel>
				</TabPanels>
			</Tabs>
		</div>
	</section>
</template>
