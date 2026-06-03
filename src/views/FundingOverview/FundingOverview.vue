<script setup lang="ts">
import Button from "primevue/button";
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import InputText from "primevue/inputtext";
import Message from "primevue/message";
import MultiSelect from "primevue/multiselect";
import Select from "primevue/select";
import {
	FUNDING_EXCHANGE_OPTIONS,
	FUNDING_TIMEFRAME_OPTIONS,
} from "./FundingOverview.constants";
import { useFundingOverview } from "./FundingOverview.composable";
import {
	formatFundingRate,
	formatPercent,
	getExchangeCell,
	getFundingTextClass,
	getFundingValueClass,
	shouldShowFunding,
} from "./FundingOverview.utils";

const {
	exchangeColumns,
	exchangeErrors,
	fundingLabel,
	fundingQuery,
	fundingStatus,
	handleTableScroll,
	hasMoreRows,
	hasSelectedExchanges,
	pinnedTableRows,
	selectedExchanges,
	selectedTimeframe,
	symbolSearch,
	togglePinnedRow,
	visibleTableRows,
} = useFundingOverview();
</script>

<template>
	<section class="flex h-[calc(100vh-var(--kvex-topbar-height)-4rem)] min-h-0 flex-col gap-4 max-lg:h-[calc(100vh-var(--kvex-topbar-height)-2rem)]">
		<div class="kvex-data-surface flex min-h-0 flex-col overflow-hidden rounded-xl border border-[var(--kvex-panel-border)] bg-[var(--kvex-panel-background)]">
			<div class="shrink-0 bg-[var(--kvex-panel-background)] px-6 pb-2 pt-6">
				<h1 class="m-0 text-[1.35rem] font-semibold text-[var(--p-text-color)]">
					Funding
				</h1>
				<p class="m-0 mt-1 text-[0.8125rem] text-[var(--p-text-muted-color)]">
					Perp funding monitor across enabled exchanges.
				</p>
			</div>

			<div class="grid shrink-0 grid-cols-[minmax(9rem,12rem)_minmax(9rem,12rem)_minmax(16rem,1fr)_auto] items-end gap-4 border-b border-[var(--kvex-panel-border)] bg-[var(--kvex-panel-background)] p-4 pt-3 max-[900px]:grid-cols-[minmax(9rem,1fr)_minmax(9rem,1fr)] max-[640px]:grid-cols-1">
				<div class="flex flex-col gap-1.5">
					<label
						class="text-[0.846rem] font-bold text-[var(--kvex-text-muted-color)]"
						for="funding-timeframe"
					>
						Timeframe
					</label>
					<Select
						id="funding-timeframe"
						v-model="selectedTimeframe"
						:options="FUNDING_TIMEFRAME_OPTIONS"
						option-label="label"
						option-value="value"
					/>
				</div>

				<div class="flex flex-col gap-1.5">
					<label
						class="text-[0.846rem] font-bold text-[var(--kvex-text-muted-color)]"
						for="funding-symbol-search"
					>
						Symbol
					</label>
					<InputText
						id="funding-symbol-search"
						v-model="symbolSearch"
						autocomplete="off"
						placeholder="BTC"
					/>
				</div>

				<div class="flex flex-col gap-1.5">
					<label
						class="text-[0.846rem] font-bold text-[var(--kvex-text-muted-color)]"
						for="funding-exchanges"
					>
						Exchanges
					</label>
					<MultiSelect
						id="funding-exchanges"
						v-model="selectedExchanges"
						:options="FUNDING_EXCHANGE_OPTIONS"
						option-label="label"
						option-value="value"
						:max-selected-labels="3"
						placeholder="Select Exchanges"
						show-clear
					/>
				</div>

				<Button
					class="max-[760px]:w-full"
					label="Refresh"
					severity="secondary"
					:loading="fundingQuery.isFetching.value"
					@click="fundingQuery.refetch()"
				/>

				<div class="col-span-full flex min-h-7 items-center gap-2 text-[0.8125rem] text-[var(--kvex-text-muted-color)]">
					<span
						class="h-2 w-2 rounded-full bg-[var(--kvex-accent-color)]"
						:class="{ 'animate-pulse': fundingQuery.isFetching.value }"
					/>
					<span>{{ fundingStatus }}</span>
					<span v-if="hasMoreRows">Scroll for more rows</span>
				</div>
			</div>

			<Message
				v-if="fundingQuery.error.value"
				class="m-4"
				severity="error"
				:closable="false"
			>
				{{ fundingQuery.error.value.message }}
			</Message>

			<div
				class="min-h-0 flex-1 overflow-auto"
				@scroll.passive="handleTableScroll"
			>
				<DataTable
					:value="visibleTableRows"
					:frozen-value="pinnedTableRows"
					data-key="symbol"
					:loading="fundingQuery.isLoading.value"
					scrollable
					table-style="min-width: 68rem"
				>
					<Column
						header=""
						class="w-20"
					>
						<template #body="{ data, frozenRow }">
							<Button
								class="!min-h-[1.9rem] !px-2 !py-1"
								:label="frozenRow ? 'Pinned' : 'Pin'"
								:severity="frozenRow ? 'info' : 'secondary'"
								size="small"
								text
								@click="togglePinnedRow(data.symbol)"
							/>
						</template>
					</Column>

					<Column
						field="symbol"
						header="Symbol"
					>
						<template #body="{ data }">
							<span class="font-bold text-[var(--kvex-symbol-color)]">
								{{ data.symbol }}
							</span>
						</template>
					</Column>

					<Column
						v-for="column in exchangeColumns"
						:key="column.exchange"
						:header="column.label"
					>
						<template #body="{ data }">
							<div
								v-if="shouldShowFunding(getExchangeCell(data.exchanges, column.exchange)?.apr)"
								class="inline-flex w-max flex-col items-start gap-1.5"
							>
								<div class="inline-grid grid-cols-[max-content_max-content] items-baseline gap-2">
									<span class="text-[0.769rem] font-semibold uppercase text-[var(--kvex-text-muted-color)]">
										APR
									</span>
									<span
										class="inline-block rounded-[4px] px-1.5 py-0.5 text-xs font-bold tabular-nums"
										:class="getFundingValueClass(getExchangeCell(data.exchanges, column.exchange)?.apr)"
									>
										{{ formatPercent(getExchangeCell(data.exchanges, column.exchange)?.apr) }}
									</span>
								</div>
								<div
									v-if="shouldShowFunding(getExchangeCell(data.exchanges, column.exchange)?.fundingRate)"
									class="inline-grid grid-cols-[max-content_max-content] items-baseline gap-2"
								>
									<span class="text-[0.769rem] font-semibold uppercase text-[var(--kvex-text-muted-color)]">
										{{ fundingLabel }}
									</span>
									<span
										class="text-[0.8125rem] font-bold tabular-nums"
										:class="getFundingTextClass(getExchangeCell(data.exchanges, column.exchange)?.fundingRate)"
									>
										{{ formatFundingRate(getExchangeCell(data.exchanges, column.exchange)?.fundingRate) }}
									</span>
								</div>
							</div>
							<span v-else>-</span>
						</template>
					</Column>

					<template #empty>
						<div class="flex h-[300px] items-center justify-center text-center text-sm text-[var(--kvex-text-muted-color)]">
							{{
								hasSelectedExchanges
									? "No funding rows for the selected filters."
									: "Вы еще не выбрали источники данных."
							}}
						</div>
					</template>
				</DataTable>
			</div>
		</div>

		<div
			v-if="exchangeErrors.length"
			class="flex flex-col gap-2"
		>
			<Message
				v-for="error in exchangeErrors"
				:key="`${error.exchange}-${error.code}`"
				severity="warn"
				:closable="false"
			>
				{{ error.exchange }}: {{ error.message }}
			</Message>
		</div>
	</section>
</template>
