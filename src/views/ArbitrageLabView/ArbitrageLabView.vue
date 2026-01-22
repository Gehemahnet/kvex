<script setup lang="ts">
import {
	Badge,
	Column,
	DataTable,
	InputText,
	Select,
	Skeleton,
	Tag,
} from "primevue";
import { computed } from "vue";
import type { LowercaseExchange } from "../../common/types";
import type {
	ArbitrageOpportunity,
	OpportunityStatus,
} from "../../hooks/useArbitrageLabSocket";
import { useArbitrageLabViewModel } from "./ArbitrageLabView.view-model";
import OpportunityDetailModal from "./components/OpportunityDetailModal.vue";

const {
	tableData,
	stats,
	isConnected,
	statusFilter,
	minNetSpreadBps,
	minScore,
	setStatusFilter,
	setMinNetSpreadBps,
	setMinScore,
	statusFilters,
	minSpreadFilters,
	minScoreFilters,
	connectedExchangesCount,
	filters,
	exchangeStatus,
	selectedOpportunity,
	isDetailModalVisible,
	openDetailModal,
} = useArbitrageLabViewModel();

const handleRowClick = (event: { data: ArbitrageOpportunity }) => {
	openDetailModal(event.data);
};

const isLoading = computed(
	() => !isConnected.value && tableData.value.length === 0,
);
const skeletonRows = Array.from({ length: 10 }, (_, i) => ({ id: i }));

const getStatusSeverity = (
	status: OpportunityStatus,
): "success" | "warn" | "danger" | "secondary" => {
	const severities: Record<OpportunityStatus, "success" | "warn" | "danger"> = {
		executable: "success",
		marginal: "warn",
		theoretical: "danger",
	};
	return severities[status] || "secondary";
};

const getSpreadColorClass = (netSpreadBps: number): string => {
	if (netSpreadBps >= 15) return "spread-excellent";
	if (netSpreadBps >= 8) return "spread-good";
	if (netSpreadBps > 0) return "spread-marginal";
	return "spread-negative";
};

const getScoreSeverity = (
	score: number,
): "success" | "warn" | "danger" | "secondary" => {
	if (score >= 70) return "success";
	if (score >= 40) return "warn";
	if (score >= 20) return "danger";
	return "secondary";
};

const getExchangeSeverity = (
	exchange: LowercaseExchange,
): "info" | "success" | "warn" | "danger" | "secondary" => {
	const severities: Record<string, "info" | "success" | "warn" | "danger"> = {
		paradex: "info",
		pacifica: "success",
		ethereal: "warn",
		hyperliquid: "danger",
	};
	return severities[exchange] || "secondary";
};

const exchanges: LowercaseExchange[] = [
	"paradex",
	"hyperliquid",
	"pacifica",
	"ethereal",
];
</script>

<template>
  <div class="arbitrage-lab-container">
    <div class="header-section">
      <div class="title-area">
        <h2>
          Арбитраж
          <Badge value="V2" severity="info" />
        </h2>
        <p class="subtitle">Поиск исполнимых арбитражных возможностей</p>
      </div>
      <div class="stats-bar">
        <div class="stat-item">
          <span class="stat-label">Всего</span>
          <Badge :value="stats.total" severity="secondary" />
        </div>
        <div class="stat-item">
          <span class="stat-label">Исполнимых</span>
          <Badge :value="stats.executable" severity="success" />
        </div>
        <div class="stat-item">
          <span class="stat-label">Прибыльных</span>
          <Badge :value="stats.positive" severity="info" />
        </div>
        <div class="stat-item">
          <span class="stat-label">Ср. оценка</span>
          <Badge :value="stats.avgScore.toFixed(1)" :severity="getScoreSeverity(stats.avgScore)" />
        </div>
      </div>
    </div>

    <div class="controls-wrapper">
      <div class="header-controls">
        <Select
            :model-value="statusFilter"
            :options="[...statusFilters]"
            option-value="value"
            option-label="label"
            placeholder="Статус"
            @update:model-value="setStatusFilter"
        />
        <Select
            :model-value="minNetSpreadBps"
            :options="[...minSpreadFilters]"
            option-value="value"
            option-label="label"
            placeholder="Мин. спред"
            @update:model-value="setMinNetSpreadBps"
        />
        <Select
            :model-value="minScore"
            :options="[...minScoreFilters]"
            option-value="value"
            option-label="label"
            placeholder="Мин. оценка"
            @update:model-value="setMinScore"
        />
        <div class="connection-status">
          <Badge
              :value="isConnected ? `${connectedExchangesCount}/4` : '...'"
              :severity="isConnected ? 'success' : 'warn'"
          />
          <span v-if="isConnected">бирж</span>
          <span v-else>Подключение</span>
        </div>
      </div>

      <div class="exchange-status">
        <Tag
            v-for="exchange of exchanges"
            :key="exchange"
            :value="exchange"
            :severity="exchangeStatus[exchange] === 'connected' ? getExchangeSeverity(exchange) : 'secondary'"
            :icon="exchangeStatus[exchange] === 'connected' ? 'pi pi-check-circle' : 'pi pi-circle'"
        />
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
        selectionMode="single"
        @row-click="handleRowClick"
        :row-class="() => 'clickable-row'"
    >
      <template #empty>
        <div class="empty-state">
          <p>Арбитражных возможностей не найдено</p>
          <p class="empty-hint">Измените фильтры или подождите данных</p>
        </div>
      </template>

      <!-- Токен -->
      <Column field="symbol" header="Токен" sortable :style="{ minWidth: '100px' }">
        <template #filter="{ filterModel, filterCallback }">
          <InputText
              v-model="filterModel.value"
              type="text"
              @input="filterCallback()"
              placeholder="Поиск"
          />
        </template>
        <template #body="{ data }">
          <Skeleton v-if="isLoading" width="60px" height="1.5rem" />
          <span v-else class="symbol-text">{{ data.symbol }}</span>
        </template>
      </Column>

      <!-- Покупка -->
      <Column field="buyExchange" header="Покупка" sortable :style="{ minWidth: '100px' }">
        <template #body="{ data }">
          <Skeleton v-if="isLoading" width="70px" height="1.5rem" />
          <Tag v-else :severity="getExchangeSeverity(data.buyExchange)" size="small">
            {{ data.buyExchange }}
          </Tag>
        </template>
      </Column>

      <!-- Продажа -->
      <Column field="sellExchange" header="Продажа" sortable :style="{ minWidth: '100px' }">
        <template #body="{ data }">
          <Skeleton v-if="isLoading" width="70px" height="1.5rem" />
          <Tag v-else :severity="getExchangeSeverity(data.sellExchange)" size="small">
            {{ data.sellExchange }}
          </Tag>
        </template>
      </Column>

      <!-- Чистый спред -->
      <Column field="netSpreadBps" sortable :style="{ minWidth: '110px' }">
        <template #header>
          <div class="column-header">
            <span>Спред</span>
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

      <!-- Макс. размер -->
      <Column field="maxExecutableSize" sortable :style="{ minWidth: '100px' }">
        <template #header>
          <div class="column-header">
            <span>Размер</span>
            <span class="header-hint">макс $</span>
          </div>
        </template>
        <template #body="{ data }">
          <Skeleton v-if="isLoading" width="60px" height="1.5rem" />
          <span v-else class="size-text">${{ data.maxSizeDisplay }}</span>
        </template>
      </Column>

      <!-- Глубина -->
      <Column :style="{ minWidth: '130px' }">
        <template #header>
          <div class="column-header">
            <span>Глубина</span>
            <span class="header-hint">@10bps</span>
          </div>
        </template>
        <template #body="{ data }">
          <Skeleton v-if="isLoading" width="80px" height="1.5rem" />
          <div v-else class="depth-cell">
            <span class="depth-bid">${{ data.depthBuyDisplay }}</span>
            <span class="depth-separator">/</span>
            <span class="depth-ask">${{ data.depthSellDisplay }}</span>
          </div>
        </template>
      </Column>

      <!-- Проскальзывание -->
      <Column field="slippageAt1k" sortable :style="{ minWidth: '90px' }">
        <template #header>
          <div class="column-header">
            <span>Проскальз.</span>
            <span class="header-hint">@$1k</span>
          </div>
        </template>
        <template #body="{ data }">
          <Skeleton v-if="isLoading" width="50px" height="1.5rem" />
          <span v-else class="slippage-text">{{ data.slippageDisplay }}</span>
        </template>
      </Column>

      <!-- Комиссии -->
      <Column field="totalFeesBps" sortable :style="{ minWidth: '80px' }">
        <template #header>
          <div class="column-header">
            <span>Комис.</span>
            <span class="header-hint">bps</span>
          </div>
        </template>
        <template #body="{ data }">
          <Skeleton v-if="isLoading" width="50px" height="1.5rem" />
          <span v-else class="fees-text">{{ data.totalFeesDisplay }}</span>
        </template>
      </Column>

      <!-- Фандинг -->
      <Column field="fundingDeltaBps" sortable :style="{ minWidth: '90px' }">
        <template #header>
          <div class="column-header">
            <span>Фандинг</span>
            <span class="header-hint">Δ bps</span>
          </div>
        </template>
        <template #body="{ data }">
          <Skeleton v-if="isLoading" width="50px" height="1.5rem" />
          <span v-else class="funding-text">{{ data.fundingDeltaDisplay }}</span>
        </template>
      </Column>

      <!-- Время жизни -->
      <Column field="lifecycle.lifetimeMs" sortable :style="{ minWidth: '90px' }">
        <template #header>
          <div class="column-header">
            <span>Время</span>
          </div>
        </template>
        <template #body="{ data }">
          <Skeleton v-if="isLoading" width="50px" height="1.5rem" />
          <span v-else class="lifetime-text">{{ data.lifetimeDisplay }}</span>
        </template>
      </Column>

      <!-- Повторения -->
      <Column field="lifecycle.occurrenceCount" sortable :style="{ minWidth: '80px' }">
        <template #header>
          <div class="column-header">
            <span>Повт.</span>
            <span class="header-hint">#</span>
          </div>
        </template>
        <template #body="{ data }">
          <Skeleton v-if="isLoading" width="40px" height="1.5rem" />
          <span v-else class="occurrence-text">{{ data.occurrenceDisplay }}</span>
        </template>
      </Column>

      <!-- Волатильность -->
      <Column field="risk.volatility1m" sortable :style="{ minWidth: '80px' }">
        <template #header>
          <div class="column-header">
            <span>Вол.</span>
            <span class="header-hint">1м</span>
          </div>
        </template>
        <template #body="{ data }">
          <Skeleton v-if="isLoading" width="40px" height="1.5rem" />
          <span v-else class="volatility-text">{{ data.volatilityDisplay }}</span>
        </template>
      </Column>

      <!-- Оценка -->
      <Column field="score" sortable :style="{ minWidth: '80px' }">
        <template #header>
          <span>Оценка</span>
        </template>
        <template #body="{ data }">
          <Skeleton v-if="isLoading" width="50px" height="1.5rem" />
          <Badge v-else :value="data.scoreDisplay" :severity="getScoreSeverity(data.score)" />
        </template>
      </Column>

      <!-- Статус -->
      <Column field="status" header="Статус" sortable :style="{ minWidth: '110px' }">
        <template #body="{ data }">
          <Skeleton v-if="isLoading" width="80px" height="1.5rem" />
          <Tag v-else :severity="getStatusSeverity(data.status)" size="small">
            {{ data.statusLabel }}
          </Tag>
        </template>
      </Column>

      <!-- Риски -->
      <Column field="risk.riskFlags" header="Риски" :style="{ minWidth: '120px' }">
        <template #body="{ data }">
          <Skeleton v-if="isLoading" width="80px" height="1.5rem" />
          <div v-else class="risk-flags">
            <Tag
                v-for="flag in data.risk.riskFlags"
                :key="flag"
                severity="danger"
                size="small"
                class="risk-tag"
            >
              {{ flag }}
            </Tag>
            <span v-if="data.risk.riskFlags.length === 0" class="no-risks">-</span>
          </div>
        </template>
      </Column>
    </DataTable>

    <!-- Detail Modal -->
    <OpportunityDetailModal
        v-model:visible="isDetailModalVisible"
        :opportunity="selectedOpportunity"
    />
  </div>
</template>

<style scoped>
.arbitrage-lab-container {
  padding: 1rem;
}

.header-section {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.title-area h2 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.version-badge {
  font-size: 0.65rem;
  padding: 0.15rem 0.4rem;
  color: white;
  border-radius: 0.25rem;
  font-weight: 500;
  vertical-align: middle;
}

.subtitle {
  margin: 0.25rem 0 0 0;
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
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
.lifetime-text,
.slippage-text,
.volatility-text,
.occurrence-text {
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

.risk-flags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.risk-tag {
  font-size: 0.65rem;
}

.no-risks {
  color: var(--p-text-muted-color);
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

:deep(.clickable-row) {
  cursor: pointer;
  transition: background-color 0.15s ease;
}

:deep(.clickable-row:hover) {
}
</style>
