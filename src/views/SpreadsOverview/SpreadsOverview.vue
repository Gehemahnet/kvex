<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";
import Checkbox from "primevue/checkbox";
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import InputNumber from "primevue/inputnumber";
import InputText from "primevue/inputtext";
import Message from "primevue/message";
import MultiSelect from "primevue/multiselect";
import Popover from "primevue/popover";
import FilterPanel from "@components/FilterPanel/FilterPanel.vue";
import { FUNDING_EXCHANGE_OPTIONS } from "../FundingOverview/FundingOverview.constants";
import { SPREADS_ROWS_PER_PAGE_OPTIONS } from "./SpreadsOverview.constants";
import { useSpreadsOverview } from "./SpreadsOverview.composable";
import {
	formatSnapshotAge,
	formatAverageSpread,
	formatExecutableNotionalReason,
	formatFundingImpact,
	formatSpreadFunding,
	formatSpreadMarketIdentity,
	formatSpreadPercent,
	formatSpreadPrice,
	formatSpreadSide,
	formatSpreadStability,
	formatSlippage,
	formatUsdNotional,
	formatConfidenceTooltip,
	formatFeeSourceTooltip,
	getConfidenceClass,
	getSpreadExchangeLabel,
	getSpreadValueClass,
	hasFeeAdjustedSpread,
	shouldWarnAboutFeeAdjustedSpread,
} from "./SpreadsOverview.utils";

const {
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
} = useSpreadsOverview();

const guidePopover = ref<{
	toggle: (event: Event) => void;
} | null>(null);

const toggleGuide = (event: Event) => {
	guidePopover.value?.toggle(event);
};

const handleTablePage = (event: { rows: number }) => {
	tableRowsPerPage.value = event.rows;
};
</script>

<template>
	<section class="flex h-[calc(100vh-var(--kvex-topbar-height)-4rem)] min-h-0 flex-col gap-4 max-lg:h-[calc(100vh-var(--kvex-topbar-height)-2rem)]">
		<div class="kvex-data-surface flex min-h-0 flex-col overflow-hidden rounded-xl border border-[var(--kvex-panel-border)] bg-[var(--kvex-panel-background)]">
			<div class="shrink-0 bg-[var(--kvex-panel-background)] px-6 pb-2 pt-6">
				<div class="flex items-start justify-between gap-3">
					<div>
						<h1 class="m-0 text-[1.35rem] font-semibold text-[var(--p-text-color)]">
							Spreads
						</h1>
						<p class="m-0 mt-1 text-[0.8125rem] text-[var(--p-text-muted-color)]">
							Perp spread monitor across live market-data sources.
						</p>
					</div>
					<Button
						aria-label="Spreads metrics guide"
						class="shrink-0"
						icon="pi pi-question-circle"
						rounded
						severity="secondary"
						text
						@click="toggleGuide"
					/>
				</div>
				<Popover ref="guidePopover">
					<div class="grid w-[min(34rem,calc(100vw-2rem))] gap-3 text-sm">
						<div>
							<span class="block font-semibold text-[var(--p-text-color)]">Confidence</span>
							<span class="text-[var(--kvex-text-muted-color)]">Quality score from price source, data age, funding, fee precision, and liquidity.</span>
						</div>
						<div>
							<span class="block font-semibold text-[var(--p-text-color)]">Net Est.</span>
							<span class="text-[var(--kvex-text-muted-color)]">Estimated spread after available fee and holding-period funding adjustments.</span>
						</div>
						<div>
							<span class="block font-semibold text-[var(--p-text-color)]">Funding Impact</span>
							<span class="text-[var(--kvex-text-muted-color)]">Expected funding contribution for the selected hold time.</span>
						</div>
						<div>
							<span class="block font-semibold text-[var(--p-text-color)]">Seen</span>
							<span class="text-[var(--kvex-text-muted-color)]">Number of live updates that saw the opportunity and its current lifetime.</span>
						</div>
						<div>
							<span class="block font-semibold text-[var(--p-text-color)]">Freshness</span>
							<span class="text-[var(--kvex-text-muted-color)]">Age of the latest price data used on each side of the spread.</span>
						</div>
					</div>
				</Popover>
			</div>

			<div class="flex shrink-0 flex-wrap items-end gap-4 border-b border-[var(--kvex-panel-border)] bg-[var(--kvex-panel-background)] p-4 pt-3">
				<div class="flex w-full max-w-[32rem] flex-col gap-1.5 max-[760px]:max-w-none">
					<label
						class="text-[0.846rem] font-bold text-[var(--kvex-text-muted-color)]"
						for="spreads-symbol-search"
					>
						Symbol
					</label>
					<InputText
						id="spreads-symbol-search"
						v-model="symbolSearch"
						autocomplete="off"
						placeholder="BTC"
					/>
				</div>

				<FilterPanel
					:config="filterPanelConfig"
				>
					<div class="grid grid-cols-2 gap-4 max-[640px]:grid-cols-1">
						<div class="col-span-2 flex flex-col gap-1.5 max-[640px]:col-span-1">
							<label
								class="text-[0.846rem] font-bold text-[var(--kvex-text-muted-color)]"
								for="spreads-exchanges"
							>
								Exchanges
							</label>
							<MultiSelect
								id="spreads-exchanges"
								v-model="draftFilters.selectedExchanges"
								:options="FUNDING_EXCHANGE_OPTIONS"
								option-label="label"
								option-value="value"
								:max-selected-labels="3"
								placeholder="Select Exchanges"
								show-clear
							/>
						</div>

						<div class="flex flex-col gap-1.5">
							<label
								class="text-[0.846rem] font-bold text-[var(--kvex-text-muted-color)]"
								for="spreads-min-price"
							>
								Min spread
							</label>
							<InputNumber
								id="spreads-min-price"
								v-model="draftFilters.minPriceSpreadPercentInput"
								:min="0"
								:max-fraction-digits="4"
								placeholder="0"
								suffix="%"
							/>
						</div>

						<div class="flex flex-col gap-1.5">
							<label
								class="text-[0.846rem] font-bold text-[var(--kvex-text-muted-color)]"
								for="spreads-max-age"
							>
								Max age
							</label>
							<InputNumber
								id="spreads-max-age"
								v-model="draftFilters.maxSnapshotAgeMs"
								:min="0"
								:max-fraction-digits="0"
								placeholder="30000"
								suffix=" ms"
							/>
						</div>

						<div class="flex flex-col gap-1.5">
							<label
								class="text-[0.846rem] font-bold text-[var(--kvex-text-muted-color)]"
								for="spreads-min-confidence"
							>
								Min confidence
							</label>
							<InputNumber
								id="spreads-min-confidence"
								v-model="draftFilters.minConfidenceInput"
								:min="0"
								:max="100"
								:max-fraction-digits="1"
								placeholder="0"
								suffix="%"
							/>
						</div>

						<div class="flex flex-col gap-1.5">
							<label
								class="text-[0.846rem] font-bold text-[var(--kvex-text-muted-color)]"
								for="spreads-position-size"
							>
								Position size
							</label>
							<InputNumber
								id="spreads-position-size"
								v-model="draftFilters.positionSizeUsd"
								:min="0"
								:max-fraction-digits="0"
								placeholder="0"
								prefix="$"
							/>
						</div>

						<div class="flex flex-col gap-1.5">
							<label
								class="text-[0.846rem] font-bold text-[var(--kvex-text-muted-color)]"
								for="spreads-min-seen"
							>
								Min seen
							</label>
							<InputNumber
								id="spreads-min-seen"
								v-model="draftFilters.minOccurrences"
								:min="0"
								:max-fraction-digits="0"
								placeholder="0"
							/>
						</div>

						<div class="flex flex-col gap-1.5">
							<label
								class="text-[0.846rem] font-bold text-[var(--kvex-text-muted-color)]"
								for="spreads-min-life"
							>
								Min life
							</label>
							<InputNumber
								id="spreads-min-life"
								v-model="draftFilters.minLifetimeMs"
								:min="0"
								:max-fraction-digits="0"
								placeholder="0"
								suffix=" ms"
							/>
						</div>

						<div class="flex flex-col gap-1.5">
							<label
								class="text-[0.846rem] font-bold text-[var(--kvex-text-muted-color)]"
								for="spreads-holding-period"
							>
								Hold
							</label>
							<InputNumber
								id="spreads-holding-period"
								v-model="draftFilters.holdingPeriodHours"
								:min="0"
								:max-fraction-digits="2"
								placeholder="8"
								suffix=" h"
							/>
						</div>
					</div>

					<div class="flex flex-wrap gap-4">
						<label class="inline-flex items-center gap-2 font-bold text-[var(--kvex-text-muted-color)]">
							<Checkbox
								v-model="draftFilters.hideStale"
								binary
							/>
							<span>Hide stale</span>
						</label>
						<label class="inline-flex items-center gap-2 font-bold text-[var(--kvex-text-muted-color)]">
							<Checkbox
								v-model="draftFilters.onlyFeeAdjusted"
								binary
							/>
							<span>Only fee-adjusted</span>
						</label>
					</div>
				</FilterPanel>

				<Button
					class="max-[760px]:w-full"
					label="Refresh"
					severity="secondary"
					:loading="spreadsQuery.isFetching.value"
					@click="spreadsQuery.refetch()"
				/>

				<div class="flex min-h-7 basis-full flex-wrap items-center gap-x-4 gap-y-2 text-[0.8125rem] text-[var(--kvex-text-muted-color)]">
					<span class="inline-flex items-center gap-2">
						<span
							class="h-2 w-2 rounded-full bg-[var(--kvex-accent-color)]"
							:class="{ 'animate-pulse': spreadsQuery.isFetching.value }"
						/>
						<span>{{ spreadsStatus }}</span>
					</span>
				</div>
			</div>

			<Message
				v-if="spreadsQuery.error.value"
				class="m-4"
				severity="error"
				:closable="false"
			>
				{{ spreadsQuery.error.value.message }}
			</Message>

			<div class="min-h-0 flex-1 overflow-auto">
				<DataTable
					:value="filteredOpportunities"
					:loading="spreadsQuery.isLoading.value"
					paginator
					:rows="tableRowsPerPage"
					:rows-per-page-options="SPREADS_ROWS_PER_PAGE_OPTIONS"
					sort-field="estimatedNetSpreadPercent"
					:sort-order="-1"
					removable-sort
					scrollable
					table-style="min-width: 84rem"
					@page="handleTablePage"
				>
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

					<Column header="Long">
						<template #body="{ data }">
							<div class="flex flex-col gap-1">
								<span class="font-bold">{{ formatSpreadSide(data.long) }}</span>
								<span class="text-xs text-[var(--kvex-text-muted-color)]">
									{{ data.long.priceSource }} {{ formatSpreadPrice(data.long.price) }}{{ formatSpreadMarketIdentity(data.long) }}
								</span>
							</div>
						</template>
					</Column>

					<Column header="Short">
						<template #body="{ data }">
							<div class="flex flex-col gap-1">
								<span class="font-bold">{{ formatSpreadSide(data.short) }}</span>
								<span class="text-xs text-[var(--kvex-text-muted-color)]">
									{{ data.short.priceSource }} {{ formatSpreadPrice(data.short.price) }}{{ formatSpreadMarketIdentity(data.short) }}
								</span>
							</div>
						</template>
					</Column>

					<Column
						field="priceSpreadPercent"
						header="Spread"
						sortable
					>
						<template #body="{ data }">
							<div class="flex flex-col gap-1">
								<span
									class="font-bold tabular-nums"
									:class="getSpreadValueClass(data.priceSpreadPercent)"
								>
									{{ formatSpreadPercent(data.priceSpreadPercent) }}
								</span>
								<span class="text-xs text-[var(--kvex-text-muted-color)]">
									{{ formatSpreadPrice(data.priceSpread) }}
									{{ formatSlippage(data.executionSlippagePercent) }}
								</span>
							</div>
						</template>
					</Column>

					<Column
						field="feeAdjustedPriceSpreadPercent"
						header="Fee Adjusted"
						sortable
					>
						<template #body="{ data }">
							<span
								v-if="hasFeeAdjustedSpread(data)"
								v-tooltip.top="formatFeeSourceTooltip(data)"
								class="inline-flex w-fit cursor-help items-center rounded-md px-2 py-1 font-bold tabular-nums"
								:class="shouldWarnAboutFeeAdjustedSpread(data)
									? 'bg-[var(--p-yellow-100)] text-[var(--p-yellow-900)] dark:bg-[var(--p-yellow-900)]/35 dark:text-[var(--p-yellow-200)]'
									: getSpreadValueClass(data.feeAdjustedPriceSpreadPercent)"
							>
								{{ formatSpreadPercent(data.feeAdjustedPriceSpreadPercent) }}
							</span>
							<span
								v-else
								class="font-bold tabular-nums text-[var(--kvex-text-muted-color)]"
							>
								-
							</span>
						</template>
					</Column>

					<Column
						field="estimatedNetSpreadPercent"
						sortable
					>
						<template #header>
							<span
								v-tooltip.top="'Estimated net spread after available fee and funding-impact adjustments.'"
								class="cursor-help"
							>
								Net Est.
							</span>
						</template>
						<template #body="{ data }">
							<span
								class="font-bold tabular-nums"
								:class="getSpreadValueClass(data.estimatedNetSpreadPercent)"
							>
								{{ formatSpreadPercent(data.estimatedNetSpreadPercent) }}
							</span>
						</template>
					</Column>

					<Column
						field="fundingAprSpread"
						header="Funding APR"
						sortable
					>
						<template #body="{ data }">
							<span
								class="font-bold tabular-nums"
								:class="getSpreadValueClass(data.fundingAprSpread)"
							>
								{{ formatSpreadFunding(data.fundingAprSpread) }}
							</span>
						</template>
					</Column>

					<Column
						field="fundingImpactPercent"
						sortable
					>
						<template #header>
							<span
								v-tooltip.top="'Expected funding contribution for the selected holding period.'"
								class="cursor-help"
							>
								Funding Impact
							</span>
						</template>
						<template #body="{ data }">
							<span
								class="font-bold tabular-nums"
								:class="getSpreadValueClass(data.fundingImpactPercent)"
							>
								{{ formatFundingImpact(data.fundingImpactPercent) }}
							</span>
						</template>
					</Column>

					<Column
						field="maxExecutableNotionalUsd"
						header="Top Size"
						sortable
					>
						<template #body="{ data }">
							<span
								v-if="data.maxExecutableNotionalUsd !== undefined"
								class="font-bold tabular-nums"
							>
								{{ formatUsdNotional(data.maxExecutableNotionalUsd) }}
							</span>
							<span
								v-else
								v-tooltip.top="formatExecutableNotionalReason(data.maxExecutableNotionalReason)"
								class="cursor-help font-bold tabular-nums text-[var(--kvex-text-muted-color)]"
							>
								-
							</span>
						</template>
					</Column>

					<Column
						field="confidence"
						sortable
					>
						<template #header>
							<span
								v-tooltip.top="'Quality score based on price source, freshness, funding, fees, and liquidity.'"
								class="cursor-help"
							>
								Confidence
							</span>
						</template>
						<template #body="{ data }">
							<span
								v-tooltip.top="formatConfidenceTooltip(data.confidenceBreakdown)"
								class="cursor-help font-bold tabular-nums"
								:class="getConfidenceClass(data.confidence)"
							>
								{{ formatSpreadPercent(data.confidence) }}
							</span>
						</template>
					</Column>

					<Column
						field="stability.occurrences"
						sortable
					>
						<template #header>
							<span
								v-tooltip.top="'How many live updates saw this opportunity and how long it has persisted.'"
								class="cursor-help"
							>
								Seen
							</span>
						</template>
						<template #body="{ data }">
							<div class="flex flex-col gap-1">
								<span class="font-bold tabular-nums">
									{{ formatSpreadStability(data.stability) }}
								</span>
								<span class="text-xs text-[var(--kvex-text-muted-color)]">
									Avg {{ formatAverageSpread(data.stability) }}
								</span>
							</div>
						</template>
					</Column>

					<Column
						sortable
						sort-field="long.ageMs"
					>
						<template #header>
							<span
								v-tooltip.top="'Age of the latest price data used for both sides of the spread.'"
								class="cursor-help"
							>
								Freshness
							</span>
						</template>
						<template #body="{ data }">
							<div class="flex flex-col gap-1">
								<span
									class="font-bold"
									:class="data.isStale ? 'text-[var(--kvex-danger-color)]' : 'text-[var(--kvex-success-color)]'"
								>
									{{ data.isStale ? "Stale" : "Fresh" }}
								</span>
								<span class="text-xs text-[var(--kvex-text-muted-color)]">
									{{ getSpreadExchangeLabel(data.long.exchange) }} {{ formatSnapshotAge(data.long.ageMs) }}
									/
									{{ getSpreadExchangeLabel(data.short.exchange) }} {{ formatSnapshotAge(data.short.ageMs) }}
								</span>
							</div>
						</template>
					</Column>

					<template #empty>
						<div class="flex h-[300px] items-center justify-center text-center text-sm text-[var(--kvex-text-muted-color)]">
							{{
								hasSelectedExchanges
									? "No spread opportunities for the selected filters."
									: selectionStatus
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
