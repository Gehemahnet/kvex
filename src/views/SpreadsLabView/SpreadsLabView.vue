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
import type { OpportunityStatus, LowercaseExchange } from "../../common/types";
import { useSpreadsLabViewModel } from "./SpreadsLabView.view-model";

const {
	tableData,
	stats,
	isConnected,
	statusFilter,
	minNetSpreadBps,
	setStatusFilter,
	setMinNetSpreadBps,
	statusFilters,
	minSpreadFilters,
	connectedExchangesCount,
	filters,
	exchangeStatus,
} = useSpreadsLabViewModel();

const isLoading = computed(() => !isConnected.value && tableData.value.length === 0);
const skeletonRows = Array.from({ length: 10 }, (_, i) => ({ id: i }));

const getStatusColor = (status: OpportunityStatus): string => {
	const colors: Record<OpportunityStatus, string> = {
		executable: "success",
		marginal: "warn",
		theoretical: "danger",
	};
	return colors[status] || "secondary";
};

const getSpreadColorClass = (netSpreadBps: number): string => {
	if (netSpreadBps >= 15) return "spread-excellent";
	if (netSpreadBps >= 8) return "spread-good";
	if (netSpreadBps > 0) return "spread-marginal";
	return "spread-negative";
};

const getScoreColorClass = (score: number): string => {
	if (score >= 80) return "score-excellent";
	if (score >= 50) return "score-good";
	if (score >= 20) return "score-marginal";
	return "score-low";
};

const formatPrice = (price: number): string => {
	if (price >= 1000) return price.toFixed(2);
	if (price >= 1) return price.toFixed(4);
	return price.toFixed(6);
};

const formatSize = (size: number): string => {
	if (size >= 1000000) return `${(size / 1000000).toFixed(1)}M`;
	if (size >= 1000) return `${(size / 1000).toFixed(1)}k`;
	return size.toFixed(0);
};

const getExchangeColor = (exchange: LowercaseExchange): string => {
	const colors: Record<string, string> = {
		paradex: "info",
		pacifica: "success",
		ethereal: "warn",
		hyperliquid: "danger",
	};
	return colors[exchange] || "secondary";
};

const exchanges: LowercaseExchange[] = ["paradex", "hyperliquid", "pacifica", "ethereal"];
</script>

<template>
  <div class="spreads-lab-container">
    <div class="header-section">
      <h2>Spreads Lab</h2>
      <div class="stats-bar">
        <div class="stat-item">
          <span class="stat-label">Total</span>
          <span class="stat-value">{{ stats.total }}</span>
        </div>
        <div class="stat-item executable">
          <span class="stat-label">Executable</span>
          <span class="stat-value">{{ stats.executable }}</span>
        </div>
        <div class="stat-item positive">
          <span class="stat-label">Positive</span>
          <span class="stat-value">{{ stats.positive }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Avg Score</span>
          <span class="stat-value">{{ stats.avgScore }}</span>
        </div>
      </div>
    </div>

    <div class="controls-wrapper">
      <div class="header-controls">
        <Select
            :model-value="statusFilter"
            :options="statusFilters"
            option-value="value"
            option-label="label"
            placeholder="Status"
            @update:model-value="setStatusFilter"
        />
        <Select
            :model-value="minNetSpreadBps"
            :options="minSpreadFilters"
            option-value="value"
            option-label="label"
            placeholder="Min Net Spread"
            @update:model-value="setMinNetSpreadBps"
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
          <p class="empty-hint">Try adjusting the filters or wait for data</p>
        </div>
      </template>

      <!-- Symbol -->
      <Column
          field="symbol"
          header="Token"
          sortable
          :style="{ minWidth: '100px' }"
      >
        <template #filter="{ filterModel, filterCallback }">
          <InputText
              v-model="filterModel.value"
              type="text"
              @input="filterCallback()"
              placeholder="Search"
          />
        </template>
        <template #body="{ data }">
          <Skeleton v-if="isLoading" width="60px" height="1.5rem" />
          <span v-else class="symbol-text">{{ data.symbol }}</span>
        </template>
      </Column>

      <!-- Buy Exchange -->
      <Column
          field="buyExchange"
          header="Buy @"
          sortable
          :style="{ minWidth: '100px' }"
      >
        <template #body="{ data }">
          <Skeleton v-if="isLoading" width="70px" height="1.5rem" />
          <Tag v-else :severity="getExchangeColor(data.buyExchange)" size="small">
            {{ data.buyExchange }}
          </Tag>
        </template>
      </Column>

      <!-- Sell Exchange -->
      <Column
          field="sellExchange"
          header="Sell @"
          sortable
          :style="{ minWidth: '100px' }"
      >
        <template #body="{ data }">
          <Skeleton v-if="isLoading" width="70px" height="1.5rem" />
          <Tag v-else :severity="getExchangeColor(data.sellExchange)" size="small">
            {{ data.sellExchange }}
          </Tag>
        </template>
      </Column>

      <!-- Net Spread -->
      <Column
          field="netSpreadBps"
          sortable
          :style="{ minWidth: '110px' }"
      >
        <template #header>
          <div class="column-header">
            <span>Net Spread</span>
            <span class="header-hint">bps</span>
          </div>
        </template>
        <template #body="{ data }">
          <Skeleton v-if="isLoading" width="60px" height="1.5rem" />
          <span v-else :class="getSpreadColorClass(data.netSpreadBps)">
            {{ data.netSpreadBpsDisplay }}
          </span>
        </template>
      </Column>

      <!-- Max Size -->
      <Column
          field="maxExecutableSize"
          sortable
          :style="{ minWidth: '100px' }"
      >
        <template #header>
          <div class="column-header">
            <span>Max Size</span>
            <span class="header-hint">$</span>
          </div>
        </template>
        <template #body="{ data }">
          <Skeleton v-if="isLoading" width="60px" height="1.5rem" />
          <span v-else class="size-text">${{ formatSize(data.maxExecutableSize) }}</span>
        </template>
      </Column>

      <!-- Depth @ 10bps -->
      <Column
          :style="{ minWidth: '130px' }"
      >
        <template #header>
          <div class="column-header">
            <span>Depth</span>
            <span class="header-hint">@10bps</span>
          </div>
        </template>
        <template #body="{ data }">
          <Skeleton v-if="isLoading" width="80px" height="1.5rem" />
          <div v-else class="depth-cell">
            <span class="depth-bid">${{ formatSize(parseFloat(data.depthBidDisplay)) }}</span>
            <span class="depth-separator">/</span>
            <span class="depth-ask">${{ formatSize(parseFloat(data.depthAskDisplay)) }}</span>
          </div>
        </template>
      </Column>

      <!-- Fees -->
      <Column
          field="totalFeesBps"
          sortable
          :style="{ minWidth: '80px' }"
      >
        <template #header>
          <div class="column-header">
            <span>Fees</span>
            <span class="header-hint">bps</span>
          </div>
        </template>
        <template #body="{ data }">
          <Skeleton v-if="isLoading" width="50px" height="1.5rem" />
          <span v-else class="fees-text">{{ data.totalFeesDisplay }}</span>
        </template>
      </Column>

      <!-- Funding -->
      <Column
          field="fundingCostBps"
          sortable
          :style="{ minWidth: '90px' }"
      >
        <template #header>
          <div class="column-header">
            <span>Funding</span>
            <span class="header-hint">bps</span>
          </div>
        </template>
        <template #body="{ data }">
          <Skeleton v-if="isLoading" width="50px" height="1.5rem" />
          <span v-else class="funding-text">{{ data.fundingDisplay }}</span>
        </template>
      </Column>

      <!-- Lifetime -->
      <Column
          field="lifetimeMs"
          sortable
          :style="{ minWidth: '90px' }"
      >
        <template #header>
          <div class="column-header">
            <span>Lifetime</span>
            <span class="header-hint">sec</span>
          </div>
        </template>
        <template #body="{ data }">
          <Skeleton v-if="isLoading" width="50px" height="1.5rem" />
          <span v-else class="lifetime-text">{{ data.lifetimeDisplay }}s</span>
        </template>
      </Column>

      <!-- Score -->
      <Column
          field="score"
          sortable
          :style="{ minWidth: '80px' }"
      >
        <template #header>
          <span>Score</span>
        </template>
        <template #body="{ data }">
          <Skeleton v-if="isLoading" width="50px" height="1.5rem" />
          <span v-else :class="getScoreColorClass(data.score)">
            {{ data.scoreDisplay }}
          </span>
        </template>
      </Column>

      <!-- Status -->
      <Column
          field="status"
          header="Status"
          sortable
          :style="{ minWidth: '110px' }"
      >
        <template #body="{ data }">
          <Skeleton v-if="isLoading" width="80px" height="1.5rem" />
          <Tag v-else :severity="getStatusColor(data.status)" size="small">
            {{ data.status }}
          </Tag>
        </template>
      </Column>
    </DataTable>
  </div>
</template>

<style scoped>
.spreads-lab-container {
  padding: 1rem;
}

.header-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.header-section h2 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
}

.stats-bar {
  display: flex;
  gap: 1.5rem;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.5rem 1rem;
  background: var(--p-surface-100);
  border-radius: 0.5rem;
}

.stat-item.executable .stat-value {
  color: var(--p-green-500);
}

.stat-item.positive .stat-value {
  color: var(--p-blue-500);
}

.stat-label {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
}

.stat-value {
  font-size: 1.25rem;
  font-weight: 600;
}

.spread-excellent {
  color: var(--p-green-400);
  font-weight: 600;
}

.spread-good {
  color: var(--p-green-500);
}

.spread-marginal {
  color: var(--p-yellow-500);
}

.spread-negative {
  color: var(--p-red-500);
}

.score-excellent {
  color: var(--p-green-400);
  font-weight: 600;
}

.score-good {
  color: var(--p-green-500);
}

.score-marginal {
  color: var(--p-yellow-500);
}

.score-low {
  color: var(--p-text-muted-color);
}

.symbol-text {
  font-weight: 500;
}

.size-text,
.fees-text,
.funding-text,
.lifetime-text {
  font-family: monospace;
}

.depth-cell {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-family: monospace;
  font-size: 0.875rem;
}

.depth-bid {
  color: var(--p-green-500);
}

.depth-ask {
  color: var(--p-red-500);
}

.depth-separator {
  color: var(--p-text-muted-color);
}

.column-header {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.header-hint {
  font-size: 0.7rem;
  font-weight: 400;
  color: var(--p-text-muted-color);
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
  margin-left: auto;
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
  flex-direction: column;
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

.empty-hint {
  font-size: 0.875rem !important;
  margin-top: 0.5rem !important;
}
</style>
