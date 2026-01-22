<script setup lang="ts">
import {
	Column,
	DataTable,
	InputText,
	Select,
	Skeleton,
	Tag,
} from "primevue";
import { computed } from "vue";
import { useSpreadsViewModel } from "./SpreadsView.view-model";

const {
	tableData,
	isConnected,
	minSpreadPercent,
	setMinSpreadPercent,
	spreadFilters,
	connectedExchangesCount,
	filters,
	exchangeStatus,
} = useSpreadsViewModel();

const isLoading = computed(() => !isConnected.value && tableData.value.length === 0);
const skeletonRows = Array.from({ length: 10 }, (_, i) => ({ id: i }));

const getSpreadColorClass = (spreadPercent: number | string): string => {
	const val = typeof spreadPercent === "string" ? parseFloat(spreadPercent) : spreadPercent;
	if (val > 0.5) return "positive-spread-high";
	if (val > 0) return "positive-spread";
	if (val > -0.5) return "neutral-spread";
	return "negative-spread";
};

const formatSpreadPercent = (value: number | string): string => {
	const num = typeof value === "string" ? parseFloat(value) : value;
	const sign = num >= 0 ? "+" : "";
	return `${sign}${num.toFixed(3)}%`;
};

const formatPrice = (price: number | string): string => {
	const num = typeof price === "string" ? parseFloat(price) : price;
	if (num >= 1000) return num.toFixed(2);
	if (num >= 1) return num.toFixed(4);
	return num.toFixed(6);
};

const formatProfit = (value: number | string | undefined): string => {
	if (value === undefined || value === null) return "0.00";
	const num = typeof value === "string" ? parseFloat(value) : value;
	if (isNaN(num)) return "0.00";
	return num.toFixed(2);
};

const getExchangeColor = (exchange: string): string => {
	const colors: Record<string, string> = {
		paradex: "info",
		pacifica: "success",
		ethereal: "warn",
		hyperliquid: "danger",
	};
	return colors[exchange] || "secondary";
};

const exchanges = ["paradex", "hyperliquid", "pacifica", "ethereal"] as const;
</script>

<template>
  <div class="spreads-container">
    <div class="controls-wrapper">
      <div class="header-controls">
        <Select
            :model-value="minSpreadPercent"
            :options="spreadFilters"
            option-value="value"
            option-label="label"
            placeholder="Filter by spread"
            @update:model-value="setMinSpreadPercent"
        />
        <div class="connection-status">
          <span class="status-dot" :class="{ connected: isConnected }"></span>
          <span v-if="isConnected">{{ connectedExchangesCount }}/4 exchanges</span>
          <span v-else>Connecting...</span>
        </div>
      </div>

      <div class="exchange-status">
        <div
            v-for="exchange of exchanges"
            :key="exchange"
            class="exchange-badge"
            :class="{ connected: exchangeStatus[exchange] === 'connected' }"
        >
          <span class="badge-dot"></span>
          {{ exchange }}
        </div>
      </div>
    </div>

    <DataTable
        filter-display="menu"
        v-model:filters="filters"
        scrollHeight="600px"
        scrollable
        class="dataTable"
        :value="isLoading ? skeletonRows : tableData"
        sort-mode="multiple"
        :sort-order="-1"
        removable-sort
    >
      <template #empty>
        <div class="empty-state">
          <p>No spread opportunities found with current filters</p>
        </div>
      </template>

      <Column
          field="symbol"
          header="Symbol"
          sortable
          :style="{ minWidth: '120px' }"
      >
        <template #filter="{ filterModel, filterCallback }">
          <InputText
              v-model="filterModel.value"
              type="text"
              @input="filterCallback()"
              placeholder="Search symbol"
          />
        </template>
        <template #body="{ data }">
          <Skeleton v-if="isLoading" width="60px" height="1.5rem" />
          <span v-else class="symbol-text">{{ data.symbol }}</span>
        </template>
      </Column>

      <Column
          field="spreadPercent"
          header="Spread %"
          sortable
          :style="{ minWidth: '100px' }"
      >
        <template #body="{ data }">
          <Skeleton v-if="isLoading" width="70px" height="1.5rem" />
          <span v-else :class="getSpreadColorClass(data.spreadPercent)">
            {{ formatSpreadPercent(data.spreadPercent) }}
          </span>
        </template>
      </Column>

      <Column
          field="buyExchange"
          header="Buy @"
          sortable
          :style="{ minWidth: '120px' }"
      >
        <template #body="{ data }">
          <Skeleton v-if="isLoading" width="80px" height="1.5rem" />
          <Tag v-else :severity="getExchangeColor(data.buyExchange)">
            {{ data.buyExchange }}
          </Tag>
        </template>
      </Column>

      <Column
          field="sellExchange"
          header="Sell @"
          sortable
          :style="{ minWidth: '120px' }"
      >
        <template #body="{ data }">
          <Skeleton v-if="isLoading" width="80px" height="1.5rem" />
          <Tag v-else :severity="getExchangeColor(data.sellExchange)">
            {{ data.sellExchange }}
          </Tag>
        </template>
      </Column>

      <Column
          field="bestAsk"
          header="Best Ask"
          sortable
          :style="{ minWidth: '120px' }"
      >
        <template #body="{ data }">
          <Skeleton v-if="isLoading" width="80px" height="1.5rem" />
          <span v-else class="price-text">{{ formatPrice(data.bestAsk) }}</span>
        </template>
      </Column>

      <Column
          field="bestBid"
          header="Best Bid"
          sortable
          :style="{ minWidth: '120px' }"
      >
        <template #body="{ data }">
          <Skeleton v-if="isLoading" width="80px" height="1.5rem" />
          <span v-else class="price-text">{{ formatPrice(data.bestBid) }}</span>
        </template>
      </Column>

      <Column
          field="spreadAbsolute"
          header="Spread $"
          sortable
          :style="{ minWidth: '100px' }"
      >
        <template #body="{ data }">
          <Skeleton v-if="isLoading" width="70px" height="1.5rem" />
          <span v-else :class="getSpreadColorClass(data.spreadPercent)">
            ${{ formatPrice(data.spreadAbsolute) }}
          </span>
        </template>
      </Column>

      <Column
          field="potentialProfitUsd"
          sortable
          :style="{ minWidth: '120px' }"
      >
        <template #header>
          <div class="profit-header">
            <span>Est. Profit</span>
            <span class="profit-hint">per $1k</span>
          </div>
        </template>
        <template #body="{ data }">
          <Skeleton v-if="isLoading" width="70px" height="1.5rem" />
          <span v-else :class="getSpreadColorClass(data.spreadPercent)">
            ${{ formatProfit(data.potentialProfitUsd) }}
          </span>
        </template>
      </Column>
    </DataTable>
  </div>
</template>

<style scoped>
.spreads-container {
  padding: 1rem;
}

.positive-spread-high {
  color: var(--p-green-400);
  font-weight: 600;
}

.positive-spread {
  color: var(--p-green-500);
}

.neutral-spread {
  color: var(--p-text-muted-color);
}

.negative-spread {
  color: var(--p-red-500);
}

.symbol-text {
  font-weight: 500;
}

.price-text {
  font-family: monospace;
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
  flex-wrap: wrap;
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
}

.status-dot {
  width: 8px;
  height: 8px;
  background-color: var(--p-red-500);
  border-radius: 50%;
}

.status-dot.connected {
  background-color: var(--p-green-500);
  animation: pulse 2s ease-in-out infinite;
}

.exchange-status {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.exchange-badge {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.25rem 0.75rem;
  background: var(--p-surface-100);
  border-radius: 1rem;
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
}

.exchange-badge.connected {
  color: var(--p-text-color);
}

.badge-dot {
  width: 6px;
  height: 6px;
  background-color: var(--p-red-400);
  border-radius: 50%;
}

.exchange-badge.connected .badge-dot {
  background-color: var(--p-green-400);
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.dataTable {
  max-height: 600px;
  min-height: 400px;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  padding: 2rem;
}

.empty-state p {
  color: var(--p-text-muted-color);
  font-size: 1rem;
  text-align: center;
  margin: 0;
}

.profit-header {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.profit-hint {
  font-size: 0.7rem;
  font-weight: 400;
  color: var(--p-text-muted-color);
}
</style>
