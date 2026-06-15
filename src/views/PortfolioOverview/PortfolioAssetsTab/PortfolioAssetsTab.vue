<script setup lang="ts">
import Button from "primevue/button";
import Checkbox from "primevue/checkbox";
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import InputNumber from "primevue/inputnumber";
import Select from "primevue/select";
import FilterPanel from "@components/FilterPanel/FilterPanel.vue";
import { formatUsdValue } from "../PortfolioOverview.utils";
import { usePortfolioAssetsTab } from "./PortfolioAssetsTab.composables";

const {
	assetNetworkOptions,
	assetRows,
	assetTableFilters,
	assetTableEmptyMessage,
	exchangeBalanceErrorMessages,
	draftFilters,
	failedBalanceSourcesCount,
	filterPanelConfig,
	filteredAssetRows,
	hiddenAssetRowsCount,
	isAssetPricesFetching,
	isBalancesFetching,
	refreshWalletBalances,
	retryFailedWalletBalances,
	shouldShowAssetTableLoader,
	unpricedBalancesCount,
	walletLoadStatus,
} = usePortfolioAssetsTab();

const getAssetIconFallbackLabel = (symbol: string): string =>
	symbol.length <= 4 ? symbol : symbol.slice(0, 3);
</script>

<template>
	<div class="mb-4 flex flex-wrap items-center justify-between gap-3">
		<div>
			<p class="m-0 text-xs font-bold uppercase tracking-wide text-[var(--kvex-text-muted-color)]">
				Assets
			</p>
			<p class="m-0 mt-1 text-sm text-[var(--kvex-text-muted-color)]">
				{{ filteredAssetRows.length }} shown / {{ assetRows.length }} priced
			</p>
			<p
				v-if="hiddenAssetRowsCount > 0 || unpricedBalancesCount > 0"
				class="m-0 mt-1 text-xs text-[var(--kvex-text-muted-color)]"
			>
				{{ hiddenAssetRowsCount }} hidden by filters / {{ unpricedBalancesCount }} without USD price
			</p>
			<p class="m-0 mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--kvex-text-muted-color)]">
				<span
					v-if="isBalancesFetching"
					class="size-2 rounded-full bg-[var(--kvex-accent-color)]"
				/>
				<span>{{ walletLoadStatus }}</span>
			</p>
			<p
				v-if="isAssetPricesFetching"
				class="m-0 mt-1 text-xs text-[var(--kvex-text-muted-color)]"
			>
				Updating missing prices...
			</p>
		</div>

		<div class="flex flex-wrap gap-2">
			<Button
				v-if="failedBalanceSourcesCount > 0"
				icon="pi pi-replay"
				:label="`Retry failed (${failedBalanceSourcesCount})`"
				severity="warn"
				size="small"
				@click="retryFailedWalletBalances"
			/>
			<FilterPanel
				:config="filterPanelConfig"
			>
				<div class="flex flex-col gap-1.5">
					<label
						class="text-[0.846rem] font-bold text-[var(--kvex-text-muted-color)]"
						for="portfolio-min-value"
					>
						Min USD value
					</label>
					<InputNumber
						id="portfolio-min-value"
						v-model="draftFilters.minAssetValueUsd"
						:min="0"
						:max-fraction-digits="2"
						prefix="$"
						placeholder="1"
					/>
				</div>

				<label class="inline-flex items-center gap-2 font-bold text-[var(--kvex-text-muted-color)]">
					<Checkbox
						v-model="draftFilters.hideSmallAssets"
						binary
					/>
					<span>Hide assets below minimum</span>
				</label>

			</FilterPanel>
			<Button
				icon="pi pi-refresh"
				label="Refresh"
				severity="secondary"
				size="small"
				:loading="isBalancesFetching"
				@click="refreshWalletBalances"
			/>
		</div>
	</div>

	<div
		v-if="exchangeBalanceErrorMessages.length > 0"
		class="mb-4 flex flex-col gap-1 rounded-md border border-[rgba(245,158,11,0.35)] bg-[rgba(245,158,11,0.12)] px-3 py-2 text-xs font-semibold text-[var(--p-yellow-400)]"
	>
		<span
			v-for="message in exchangeBalanceErrorMessages"
			:key="message"
		>
			{{ message }}
		</span>
	</div>

	<DataTable
		v-model:filters="assetTableFilters"
		:value="filteredAssetRows"
		data-key="id"
		filter-display="menu"
		:loading="shouldShowAssetTableLoader"
		removable-sort
		scrollable
		sort-field="valueUsd"
		:sort-order="-1"
		table-style="min-width: 68rem"
	>
		<Column
			field="symbol"
			header="Asset"
			sortable
		>
			<template #body="{ data }">
				<div class="flex min-w-0 items-center gap-3">
					<img
						v-if="data.logoUrl"
						:src="data.logoUrl"
						:alt="data.symbol"
						class="size-9 shrink-0 rounded-full object-contain"
					>
					<span
						v-else
						class="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--kvex-panel-muted-background)] text-[0.65rem] font-black uppercase text-[var(--kvex-accent-color)]"
					>
						{{ getAssetIconFallbackLabel(data.symbol) }}
					</span>
					<div class="min-w-0">
						<div class="truncate font-bold text-[var(--kvex-symbol-color)]">
							{{ data.symbol }}
						</div>
						<div class="truncate text-xs text-[var(--kvex-text-muted-color)]">
							{{ data.name }}
						</div>
					</div>
				</div>
			</template>
		</Column>

		<Column
			field="amount"
			header="Amount"
			sortable
		>
			<template #body="{ data }">
				<span class="font-bold tabular-nums text-[var(--p-text-color)]">
					{{ data.amount }}
				</span>
			</template>
		</Column>

		<Column
			field="chainName"
			header="Network"
			:show-filter-match-modes="false"
			sortable
		>
			<template #body="{ data }">
				<div class="flex flex-col gap-1">
					<span class="font-bold text-[var(--p-text-color)]">
						{{ data.chainName }}
					</span>
					<span class="text-xs uppercase text-[var(--kvex-text-muted-color)]">
						{{ data.sourceNetwork }}
					</span>
				</div>
			</template>
			<template #filter="{ filterModel }">
				<Select
					v-model="filterModel.value"
					class="w-full"
					:options="assetNetworkOptions"
					option-label="label"
					option-value="value"
					placeholder="Any network"
					show-clear
				/>
			</template>
		</Column>

		<Column
			field="sourceLabel"
			header="Data Source"
			sortable
		>
			<template #body="{ data }">
				<div class="flex flex-col gap-1">
					<span class="font-semibold text-[var(--p-text-color)]">
						{{ data.sourceType }}
					</span>
					<span class="text-xs text-[var(--kvex-text-muted-color)]">
						{{ data.sourceLabel }}
					</span>
				</div>
			</template>
		</Column>

		<Column
			field="valueUsd"
			header="Value"
			sortable
		>
			<template #body="{ data }">
				<div class="flex flex-col gap-1 text-right">
					<span class="font-bold tabular-nums text-[var(--p-text-color)]">
						{{ formatUsdValue(data.valueUsd ?? 0) }}
					</span>
					<span
						v-if="data.priceUsd"
						class="text-xs tabular-nums text-[var(--kvex-text-muted-color)]"
					>
						{{ formatUsdValue(data.priceUsd ?? 0) }} / {{ data.symbol }}
					</span>
				</div>
			</template>
		</Column>

		<template #empty>
			<div class="flex h-[300px] items-center justify-center text-center text-sm text-[var(--kvex-text-muted-color)]">
				{{ assetTableEmptyMessage }}
			</div>
		</template>
	</DataTable>
</template>
