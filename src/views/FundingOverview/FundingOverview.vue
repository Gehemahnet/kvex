<script setup lang="ts">
import { FilterMatchMode } from "@primevue/core/api";
import { Column, DataTable, InputText, MultiSelect, Select } from "primevue";
import { ref } from "vue";
import { EXCHANGES } from "../../common/constants";
import type { MarketItemWithExchange } from "../../hooks/useFundingInfo/useFundingInfo.types";
import { FUNDING_INTERVALS } from "./FundingOverview.constants";
import { useFundingOverviewViewModel } from "./FundingOverview.view-model";

const {
	currentIntervalMultiplier,
	columns,
	summaryData,
	isFetching,
	activeExchanges,
	setActiveExchanges,
} = useFundingOverviewViewModel();

const filters = ref({
	symbol: { value: null, matchMode: FilterMatchMode.CONTAINS },
});

//TODO refactor
const getDataAccordingToMultiplier = (
	row: MarketItemWithExchange,
	columnKey: string,
) => {
	// Handle bestApr column separately
	if (columnKey === "bestApr") {
		const value = row.bestApr;
		return value
			? (Number(value) * currentIntervalMultiplier.value * 100).toFixed(6)
			: "-";
	}

	const value = row[`${columnKey}1h` as keyof typeof row];

	return value
		? (Number(value) * currentIntervalMultiplier.value * 100).toFixed(6)
		: "-";
};

//TODO refactor
const getArbDisplay = (row: MarketItemWithExchange) => {
	if (!row.bestApr || !row.shortExchange || !row.longExchange) return "-";

	const arbValue = (
		Number(row.bestApr) *
		currentIntervalMultiplier.value *
		100
	).toFixed(6);
	const shortExchange = row.shortExchange.toUpperCase();
	const longExchange = row.longExchange.toUpperCase();

	return `${arbValue}% (S: ${shortExchange}, L: ${longExchange})`;
};

//TODO refactor to color token
const getValueColor = (row: MarketItemWithExchange, columnKey: string) => {
	// Handle bestApr column - always green as it's an arbitrage opportunity
	if (columnKey === "bestApr") {
		const value = row.bestApr;
		if (!value || value === "-") return "";
		const numValue = Number(value);
		return numValue > 0 ? "#22c55e" : "";
	}

	const value = row[`${columnKey}1h` as keyof typeof row];
	if (!value || value === "-") return "";

	const numValue = Number(value);
	if (numValue > 0) return "#22c55e";
	if (numValue < 0) return "#ef4444";
	return "";
};
</script>

<template>
  <div class="controls-wrapper">
    <div class="header-controls">
      <Select
          v-model="currentIntervalMultiplier"
          :options="FUNDING_INTERVALS"
          option-value="multiplier"
          option-label="label"
      />
      <MultiSelect
          :model-value="[...activeExchanges]"
          :options="EXCHANGES"
          @update:model-value="setActiveExchanges"
      />
      <div v-if="isFetching" class="loading-indicator">
        <span class="loading-dot"></span>
        Updating...
      </div>
    </div>
  </div>
  <DataTable filter-display="menu" v-model:filters="filters" scrollHeight="640px" scrollable class="dataTable" :value="summaryData.items" >
    <Column v-for="col of columns" :key="col.columnKey" :field="col.field" :header="col.header">
        <template v-if="col.columnKey ==='symbol'" #filter="{filterModel, filterCallback}">
          <InputText v-model="filterModel.value" type="text" @input="filterCallback()" placeholder="Search by symbol" />
        </template>
      <template v-if="col.columnKey === 'bestApr'" #body="{data}">
        <span :style="{ color: getValueColor(data, col.columnKey) }">
          {{getArbDisplay(data)}}
        </span>
      </template>
      <template v-else-if="col.columnKey !=='symbol'" #body="{data}">
        <span :style="{ color: getValueColor(data, col.columnKey) }">
          {{getDataAccordingToMultiplier(data, col.columnKey)}}
        </span>
      </template>
    </Column>
  </DataTable>
</template>


<style scoped>
.controls-wrapper {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.header-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.exchange-toggles {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.toggles-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #6b7280;
}

.exchange-toggle {
  padding: 0.375rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 500;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  background-color: #f9fafb;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s;
}

.exchange-toggle:hover {
  background-color: #f3f4f6;
  border-color: #9ca3af;
}

.exchange-toggle.active {
  background-color: #22c55e;
  border-color: #22c55e;
  color: white;
}

.exchange-toggle.active:hover {
  background-color: #16a34a;
  border-color: #16a34a;
}

.loading-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #6b7280;
}

.loading-dot {
  width: 8px;
  height: 8px;
  background-color: #22c55e;
  border-radius: 50%;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
}

.dataTable {
  max-height: 640px;
  overflow: auto;
}
</style>