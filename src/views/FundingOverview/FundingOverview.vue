<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";
import Button from "primevue/button";
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import InputText from "primevue/inputtext";
import Message from "primevue/message";
import MultiSelect from "primevue/multiselect";
import ProgressSpinner from "primevue/progressspinner";
import Select from "primevue/select";
import Tag from "primevue/tag";
import { computed, ref } from "vue";
import { getFunding } from "./FundingOverview.api";
import {
	FUNDING_EXCHANGE_OPTIONS,
	FUNDING_TIMEFRAME_OPTIONS,
} from "./FundingOverview.constants";
import type {
	FundingExchange,
	FundingTableRow,
	FundingTimeframe,
} from "./FundingOverview.types";

const symbol = ref("BTC");
const selectedTimeframe = ref<FundingTimeframe>("DAY");
const selectedExchanges = ref<FundingExchange[]>([
	"hyperliquid",
	"pacifica",
	"ethereal",
]);

const normalizedSymbol = computed(() => symbol.value.trim().toUpperCase());

const fundingQuery = useQuery({
	queryKey: computed(() => [
		"funding",
		normalizedSymbol.value,
		selectedTimeframe.value,
		selectedExchanges.value.join(","),
	]),
	queryFn: () =>
		getFunding({
			symbol: normalizedSymbol.value,
			timeframe: selectedTimeframe.value,
			exchanges: selectedExchanges.value,
		}),
	enabled: computed(() => normalizedSymbol.value.length > 0),
});

const tableRows = computed<FundingTableRow[]>(() =>
	(fundingQuery.data.value?.data ?? []).map((series) => ({
		exchange: series.exchange,
		symbol: series.symbol,
		sourceSymbol: series.sourceSymbol,
		fundingRate: series.latest?.fundingRate,
		nextFundingRate: series.latest?.nextFundingRate,
		timestamp: series.latest?.timestamp,
		pointsCount: series.points.length,
		isFundingAdapted: series.isFundingAdapted,
		requestedTimeframe: series.requestedTimeframe,
		sourceTimeframe: series.sourceTimeframe,
	})),
);

const exchangeErrors = computed(() => fundingQuery.data.value?.errors ?? []);

const formatFundingRate = (rate?: number): string => {
	if (rate === undefined || Number.isNaN(rate)) {
		return "-";
	}

	return `${(rate * 100).toFixed(6)}%`;
};

const formatTimestamp = (timestamp?: number): string => {
	if (!timestamp) {
		return "-";
	}

	return new Intl.DateTimeFormat("en", {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(timestamp);
};

const getRateSeverity = (rate?: number): "success" | "danger" | "secondary" => {
	if (!rate) {
		return "secondary";
	}

	return rate > 0 ? "success" : "danger";
};
</script>

<template>
	<section class="funding-page">
		<div class="funding-toolbar">
			<div class="field symbol-field">
				<label for="funding-symbol">Symbol</label>
				<InputText
					id="funding-symbol"
					v-model="symbol"
					autocomplete="off"
					placeholder="BTC"
				/>
			</div>

			<div class="field">
				<label for="funding-timeframe">Timeframe</label>
				<Select
					id="funding-timeframe"
					v-model="selectedTimeframe"
					:options="FUNDING_TIMEFRAME_OPTIONS"
					option-label="label"
					option-value="value"
				/>
			</div>

			<div class="field exchanges-field">
				<label for="funding-exchanges">Exchanges</label>
				<MultiSelect
					id="funding-exchanges"
					v-model="selectedExchanges"
					:options="FUNDING_EXCHANGE_OPTIONS"
					option-label="label"
					option-value="value"
					display="chip"
				/>
			</div>

			<Button
				class="refresh-button"
				label="Refresh"
				severity="secondary"
				:loading="fundingQuery.isFetching.value"
				@click="fundingQuery.refetch()"
			/>
		</div>

		<Message
			v-if="fundingQuery.error.value"
			severity="error"
			:closable="false"
		>
			{{ fundingQuery.error.value.message }}
		</Message>

		<div
			v-if="fundingQuery.isLoading.value"
			class="loading-state"
		>
			<ProgressSpinner />
		</div>

		<DataTable
			v-else
			:value="tableRows"
			data-key="exchange"
			striped-rows
			table-style="min-width: 64rem"
		>
			<Column
				field="exchange"
				header="Exchange"
			>
				<template #body="{ data }">
					<span class="exchange-name">{{ data.exchange }}</span>
				</template>
			</Column>

			<Column
				field="sourceSymbol"
				header="Market"
			/>

			<Column
				field="fundingRate"
				header="Latest funding"
			>
				<template #body="{ data }">
					<Tag
						:value="formatFundingRate(data.fundingRate)"
						:severity="getRateSeverity(data.fundingRate)"
					/>
				</template>
			</Column>

			<Column
				field="nextFundingRate"
				header="Next funding"
			>
				<template #body="{ data }">
					{{ formatFundingRate(data.nextFundingRate) }}
				</template>
			</Column>

			<Column
				field="timestamp"
				header="Latest point"
			>
				<template #body="{ data }">
					{{ formatTimestamp(data.timestamp) }}
				</template>
			</Column>

			<Column
				field="pointsCount"
				header="Points"
			/>

			<Column header="Source">
				<template #body="{ data }">
					<span>{{ data.sourceTimeframe }}</span>
					<Tag
						v-if="data.isFundingAdapted"
						class="adapted-tag"
						value="adapted"
						severity="warn"
					/>
				</template>
			</Column>

			<template #empty>
				No funding rows for the selected filters.
			</template>
		</DataTable>

		<div
			v-if="exchangeErrors.length"
			class="exchange-errors"
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

<style scoped>
.funding-page {
	display: flex;
	flex-direction: column;
	gap: 1rem;
	padding: 1.25rem;
}

.funding-toolbar {
	align-items: flex-end;
	border-bottom: 1px solid var(--p-border-color);
	display: grid;
	gap: 1rem;
	grid-template-columns: minmax(8rem, 12rem) minmax(9rem, 12rem) minmax(16rem, 1fr) auto;
	padding-bottom: 1rem;
}

.field {
	display: flex;
	flex-direction: column;
	gap: 0.375rem;
}

.field label {
	color: var(--p-text-muted-color);
	font-size: 0.8125rem;
	font-weight: 600;
}

.exchange-name {
	text-transform: capitalize;
}

.adapted-tag {
	margin-left: 0.5rem;
}

.loading-state {
	align-items: center;
	display: flex;
	justify-content: center;
	min-height: 16rem;
}

.exchange-errors {
	display: flex;
	flex-direction: column;
	gap: 0.5rem;
}

@media (max-width: 760px) {
	.funding-toolbar {
		grid-template-columns: 1fr;
	}

	.refresh-button {
		width: 100%;
	}
}
</style>
