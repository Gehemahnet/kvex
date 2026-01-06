<script setup lang="ts">
import { FilterMatchMode } from "@primevue/core/api";
import { Column, DataTable, InputText, SelectButton } from "primevue";
import { ref } from "vue";
import type { MarketItemWithExchange } from "../../hooks/useFundingInfo/useFundingInfo.types";
import { FUNDING_INTERVALS } from "./FundingOverview.constants";
import { useFundingOverviewViewModel } from "./FundingOverview.view-model";

const { currentIntervalMultiplier, columns, summaryData, isFetching } =
	useFundingOverviewViewModel();

const filters = ref({
	symbol: { value: null, matchMode: FilterMatchMode.CONTAINS },
});

const getDataAccordingToMultiplier = (
	row: MarketItemWithExchange,
	columnKey: string,
) => {
	const value = row[`${columnKey}1h` as keyof typeof row];

	return value
		? (Number(value) * currentIntervalMultiplier.value * 100).toFixed(6)
		: "-";
};

//TODO refactor to color token
const getValueColor = (row: MarketItemWithExchange, columnKey: string) => {
	const value = row[`${columnKey}1h` as keyof typeof row];
	if (!value || value === "-") return "";

	const numValue = Number(value);
	if (numValue > 0) return "#22c55e";
	if (numValue < 0) return "#ef4444";
	return "";
};
</script>

<template>
  <div>
    <SelectButton
        v-model="currentIntervalMultiplier"
        :options="FUNDING_INTERVALS"
        option-value="multiplier"
        option-label="label"
    />
  </div>
  <DataTable filter-display="menu" v-model:filters="filters" scrollHeight="640px" scrollable class="dataTable" :loading="isFetching" :value="summaryData.items" >
    <Column v-for="col of columns" :key="col.columnKey" :field="col.field" :header="col.header">
        <template v-if="col.columnKey ==='symbol'" #filter="{filterModel, filterCallback}">
          <InputText v-model="filterModel.value" type="text" @input="filterCallback()" placeholder="Search by symbol" />
        </template>
      <template v-if="col.columnKey !=='symbol'" #body="{data}">
        <span :style="{ color: getValueColor(data, col.columnKey) }">
          {{getDataAccordingToMultiplier(data, col.columnKey)}}
        </span>
      </template>
    </Column>
  </DataTable>
</template>


<style scoped>
.dataTable {
  max-height: 640px;
  overflow: auto;
}
</style>