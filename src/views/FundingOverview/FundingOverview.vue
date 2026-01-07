<script setup lang="ts">
import {
	Button,
	Column,
	DataTable,
	InputText,
	MultiSelect,
	Select,
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
      :value="hasMinimumExchanges ? summaryData.items : []"
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
        v-for="col of columns"
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
        <div class="apr-field">
          <span :class="getValueColorClass(data, col.columnKey)">
            {{getApr(data, currentIntervalMultiplier)}}
          </span>
          <Button severity="secondary">
            Подробнее
          </Button>
        </div>

      </template>
      <template
          v-else-if="col.columnKey !=='symbol'"
          #body="{data}"
      >
        <span :class="getValueColorClass(data, col.columnKey)">
          {{getDataAccordingToMultiplier(data, col.columnKey, currentIntervalMultiplier)}}
        </span>
      </template>
    </Column>
  </DataTable>
</template>


<style scoped>
.positive-value {
  color: var(--p-green-500);
}

.negative-value {
  color: var(--p-red-500);
}

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