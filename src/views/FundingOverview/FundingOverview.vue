<script setup lang="ts">
import { FilterMatchMode } from "@primevue/core/api";
import { Column, DataTable, InputText, SelectButton } from "primevue";
import { ref } from "vue";
import { FUNDING_INTERVALS } from "./FundingOverview.constants";

import { useFundingOverviewViewModel } from "./FundingOverview.view-model.ts";

const { currentIntervalMultiplier, columns, summaryData, isFetching } =
	useFundingOverviewViewModel();

const filters = ref({
	symbol: { value: null, matchMode: FilterMatchMode.CONTAINS },
});
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
  <DataTable v-model:filters="filters" scrollHeight="640px" scrollable class="dataTable" v-if="!isFetching" :value="summaryData.items" >
    <Column v-for="col of columns" :key="col.columnKey" :field="col.field" :header="col.header">
      <template v-if="col.columnKey ==='symbol'"  #filter="{filterModel, filterCallback}">
          <InputText v-model="filterModel.value" type="text" @input="filterCallback" placeholder="Search by symbol" />
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