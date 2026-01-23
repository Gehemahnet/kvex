<script setup lang="ts">
import {
	Button,
	Column,
	DataTable,
	InputText,
	MultiSelect,
	Select,
	Skeleton,
} from "primevue";
import { computed } from "vue";
import { EXCHANGES } from "../../common/constants";
import { FUNDING_INTERVALS } from "./FundingOverview.constants";
import {
	getApr,
	getDataAccordingToMultiplier,
	getValueColorClass,
} from "./FundingOverview.helpers";
import { useFundingOverviewViewModel } from "./FundingOverview.view-model";

const {
	currentIntervalMultiplier,
	columns,
	summaryData,
	isFetching,
	activeExchanges,
	setActiveExchanges,
	filters,
} = useFundingOverviewViewModel();

const hasMinimumExchanges = computed(() => activeExchanges.value.size >= 2);
const isInitialLoading = computed(
	() => isFetching.value && summaryData.value.items.length === 0,
);
const skeletonRows = Array.from({ length: 10 }, (_, i) => ({ id: i }));

const skeletonColumns = [
	{ columnKey: "symbol", header: "Symbol", field: "symbol" },
	{ columnKey: "bestApr", header: "Best APR", field: "bestApr" },
	{ columnKey: "paradex", header: "paradex", field: "paradex1h" },
	{ columnKey: "pacifica", header: "pacifica", field: "pacifica1h" },
	{ columnKey: "ethereal", header: "ethereal", field: "ethereal1h" },
];

const displayColumns = computed(() =>
	isInitialLoading.value && columns.value.length === 0
		? skeletonColumns
		: columns.value,
);

// Преобразуем данные для правильной сортировки
const tableData = computed(() => {
	if (isInitialLoading.value) return skeletonRows;
	if (!hasMinimumExchanges.value) return [];

	// Преобразуем строковые числа в числа для корректной сортировки
	return summaryData.value.items.map((item) => {
		const converted: any = { ...item };

		// Преобразуем все числовые поля
		for (const key in converted) {
			if (
				key !== "symbol" &&
				key !== "shortExchange" &&
				key !== "longExchange"
			) {
				const num = Number(converted[key]);
				if (!isNaN(num)) {
					converted[key] = num;
				}
			}
		}

		return converted;
	});
});
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
  <DataTable
      filter-display="menu"
      v-model:filters="filters"
      scrollHeight="640px"
      scrollable
      class="dataTable"
      :value="tableData"
      sort-mode="multiple"
  >
    <template #empty>
      <div class="empty-state">
        <p v-if="!hasMinimumExchanges">
          Выберите минимум 2 биржи для отображения арбитражных возможностей
        </p>
        <p v-else>
          Нет данных для отображения
        </p>
      </div>
    </template>
    <Column
        v-for="col of displayColumns"
        :key="col.columnKey"
        :field="col.field"
        :header="col.header"
        sortable
    >
        <template
            v-if="col.columnKey ==='symbol'"
            #filter="{filterModel, filterCallback}"
        >
          <InputText
              v-model="filterModel.value"
              type="text" @input="filterCallback()"
              placeholder="Search by symbol"
          />
        </template>
      <template
          v-if="col.columnKey === 'bestApr'"
          #body="{data}"
      >
        <div v-if="isInitialLoading" class="apr-field">
          <Skeleton width="80px" height="1.5rem" />
          <Skeleton width="90px" height="2rem" />
        </div>
        <div v-else class="apr-field">
          <span :class="getValueColorClass(data, col.columnKey)">
            {{getApr(data)}}
          </span>
          <Button severity="secondary">
            Подробнее
          </Button>
        </div>
      </template>
      <template
          v-else-if="col.columnKey === 'symbol'"
          #body="{data}"
      >
        <Skeleton v-if="isInitialLoading" width="60px" height="1.5rem" />
        <span v-else>{{ data.symbol }}</span>
      </template>
      <template
          v-else
          #body="{data}"
      >
        <Skeleton v-if="isInitialLoading" width="70px" height="1.5rem" />
        <span v-else :class="getValueColorClass(data, col.columnKey)">
          {{getDataAccordingToMultiplier(data, col.columnKey, currentIntervalMultiplier)}}
        </span>
      </template>
    </Column>
  </DataTable>
</template>


<style scoped>
.apr-field {
  display: flex;
  align-items: center;
  gap: 12px;
}

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

.loading-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
}

.loading-dot {
  width: 8px;
  height: 8px;
  background-color: var(--p-green-500);
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
  min-height: 640px;
  overflow: auto;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  padding: 2rem;
}

.empty-state p {
  color: var(--p-text-muted-color);
  font-size: 1rem;
  text-align: center;
  margin: 0;
}
</style>