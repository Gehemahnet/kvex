<script setup lang="ts">
import { Badge, Button, Dialog, Divider, InputNumber, Tag, ProgressSpinner } from "primevue";
import { computed, ref, watch } from "vue";
import type { LowercaseExchange } from "../../../common/types";
import type {
	ArbitrageOpportunity,
	OpportunityStatus,
} from "../../../hooks/useArbitrageLabSocket";
import { useOpportunityDetails } from "../../../hooks/useOpportunityDetails";
import ExchangeIcon from "../../../components/ExchangeIcon.vue";
import DepthChart from "./DepthChart.vue";
import OrderBookPanel from "./OrderBookPanel.vue";
import SpreadHistoryChart from "./SpreadHistoryChart.vue";

const props = defineProps<{
	visible: boolean;
	opportunity: ArbitrageOpportunity | null;
}>();

const emit = defineEmits<(e: "update:visible", value: boolean) => void>();

// Use the new hook to get live details
const opportunityId = computed(() => props.visible && props.opportunity ? props.opportunity.id : null);
const { opportunity: liveOpportunity, isLoading } = useOpportunityDetails(opportunityId.value);

// Use live data if available, otherwise fallback to prop (which might be stale/stripped)
// But actually, prop is now stripped, so we MUST wait for live data for charts
const displayOpportunity = computed(() => liveOpportunity.value || props.opportunity);

const positionSize = ref(1000);

const slippageForSize = computed(() => {
	if (!displayOpportunity.value) return 0;

	// Simple linear interpolation based on available data
	const size = positionSize.value;
	if (size <= 1000) {
		return displayOpportunity.value.slippageAt1k * (size / 1000);
	} else if (size <= 5000) {
		const ratio = (size - 1000) / 4000;
		return (
			displayOpportunity.value.slippageAt1k +
			(displayOpportunity.value.slippageAt5k - displayOpportunity.value.slippageAt1k) * ratio
		);
	} else {
		// Extrapolate beyond 5k
		const ratio = size / 5000;
		return displayOpportunity.value.slippageAt5k * ratio;
	}
});

const estimatedPnL = computed(() => {
	if (!displayOpportunity.value) return { gross: 0, net: 0, afterSlippage: 0 };
	const size = positionSize.value;
	const { rawSpreadBps, netSpreadBps } = displayOpportunity.value;

	const gross = (rawSpreadBps / 10000) * size;
	const net = (netSpreadBps / 10000) * size;
	const afterSlippage = ((netSpreadBps - slippageForSize.value) / 10000) * size;

	return { gross, net, afterSlippage };
});

const getStatusSeverity = (
	status: OpportunityStatus,
): "success" | "warn" | "danger" => {
	const map: Record<OpportunityStatus, "success" | "warn" | "danger"> = {
		executable: "success",
		marginal: "warn",
		theoretical: "danger",
	};
	return map[status];
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
): "info" | "success" | "warn" | "danger" => {
	const map: Record<string, "info" | "success" | "warn" | "danger"> = {
		paradex: "info",
		pacifica: "success",
		ethereal: "warn",
		hyperliquid: "danger",
	};
	return map[exchange] || "info";
};

const formatPrice = (price: number): string => {
	if (price >= 1000) return price.toFixed(2);
	if (price >= 1) return price.toFixed(4);
	return price.toFixed(6);
};

const formatSize = (value: number): string => {
	if (value >= 1000000) return `${(value / 1000000).toFixed(2)}M`;
	if (value >= 1000) return `${(value / 1000).toFixed(2)}k`;
	return value.toFixed(2);
};

const formatPercent = (bps: number): string => {
	return `${(bps / 100).toFixed(3)}%`;
};

watch(
	() => props.visible,
	(newVal) => {
		if (newVal) {
			positionSize.value = 1000;
		}
	},
);

// Watch opportunityId separately to trigger hook update
watch(opportunityId, (newId) => {
	// The hook handles subscription automatically via its own watch
});
</script>

<template>
  <Dialog
      :visible="visible"
      @update:visible="emit('update:visible', $event)"
      modal
      :header="displayOpportunity ? `${displayOpportunity.symbol} — Детали` : 'Детали возможности'"
      :style="{ width: '95vw', maxWidth: '1400px' }"
      :content-style="{ padding: '0' }"
  >
    <div v-if="isLoading && !liveOpportunity" class="loading-state">
      <ProgressSpinner />
      <p>Загрузка деталей...</p>
    </div>
    
    <template v-else-if="displayOpportunity">
      <!-- Header Summary -->
      <div class="detail-header">
        <div class="header-left">
          <span class="symbol-large">{{ displayOpportunity.symbol }}</span>
          <Tag :severity="getStatusSeverity(displayOpportunity.status)">{{ displayOpportunity.status }}</Tag>
          <Badge :value="displayOpportunity.score.toFixed(0)" :severity="getScoreSeverity(displayOpportunity.score)" />
        </div>
        <div class="header-right">
          <div class="exchange-flow">
            <Tag :severity="getExchangeSeverity(displayOpportunity.buyExchange)" size="large" class="exchange-tag">
              <ExchangeIcon :exchange="displayOpportunity.buyExchange" size="small" class="mr-2" />
              ПОКУПКА @ {{ displayOpportunity.buyExchange }}
            </Tag>
            <span class="flow-arrow">→</span>
            <Tag :severity="getExchangeSeverity(displayOpportunity.sellExchange)" size="large" class="exchange-tag">
              <ExchangeIcon :exchange="displayOpportunity.sellExchange" size="small" class="mr-2" />
              ПРОДАЖА @ {{ displayOpportunity.sellExchange }}
            </Tag>
          </div>
        </div>
      </div>

      <Divider />

      <!-- Main Content Grid -->
      <div class="detail-grid">
        <!-- Left Column: Orderbooks -->
        <div class="orderbooks-section">
          <h4>Ордербуки</h4>
          <div class="orderbooks-container">
            <OrderBookPanel
                :exchange="displayOpportunity.buyExchange"
                :data="displayOpportunity.buyData"
                side="buy"
                :counterPrice="displayOpportunity.sellPrice"
            />
            <OrderBookPanel
                :exchange="displayOpportunity.sellExchange"
                :data="displayOpportunity.sellData"
                side="sell"
                :counterPrice="displayOpportunity.buyPrice"
            />
          </div>
        </div>

        <!-- Center Column: Depth Chart & Spread History -->
        <div class="charts-section">
          <div class="depth-chart-container">
            <h4>Глубина рынка</h4>
            <DepthChart
                :buyData="displayOpportunity.buyData"
                :sellData="displayOpportunity.sellData"
            />
          </div>
          <div class="spread-history-container">
            <h4>История спреда</h4>
            <SpreadHistoryChart :history="displayOpportunity.lifecycle.spreadHistory" />
            <div class="spread-stats">
              <span>Макс: <strong>{{ displayOpportunity.lifecycle.peakSpreadBps.toFixed(1) }} bps</strong></span>
              <span>Средн: <strong>{{ displayOpportunity.lifecycle.avgSpreadBps.toFixed(1) }} bps</strong></span>
              <span>Текущий: <strong>{{ displayOpportunity.netSpreadBps.toFixed(1) }} bps</strong></span>
            </div>
          </div>
        </div>

        <!-- Right Column: Calculator & Metrics -->
        <div class="calculator-section">
          <h4>Калькулятор P&L</h4>
          <div class="calculator-card">
            <div class="size-input">
              <label>Размер позиции ($)</label>
              <InputNumber
                  v-model="positionSize"
                  :min="100"
                  :max="100000"
                  :step="100"
                  showButtons
                  buttonLayout="horizontal"
                  :inputStyle="{ width: '100px', textAlign: 'center' }"
              >
                <template #incrementbuttonicon>
                  <span class="pi pi-plus" />
                </template>
                <template #decrementbuttonicon>
                  <span class="pi pi-minus" />
                </template>
              </InputNumber>
            </div>
            <div class="size-presets">
              <Button
                  v-for="size in [500, 1000, 2500, 5000, 10000]"
                  :key="size"
                  :label="`$${size >= 1000 ? size/1000 + 'k' : size}`"
                  :severity="positionSize === size ? 'primary' : 'secondary'"
                  size="small"
                  @click="positionSize = size"
              />
            </div>

            <Divider />

            <div class="pnl-breakdown">
              <div class="pnl-row">
                <span>Валовый спред</span>
                <span class="pnl-value">{{ displayOpportunity.rawSpreadBps.toFixed(1) }} bps</span>
              </div>
              <div class="pnl-row">
                <span>Комиссии</span>
                <span class="pnl-value negative">-{{ displayOpportunity.totalFeesBps.toFixed(1) }} bps</span>
              </div>
              <div class="pnl-row">
                <span>Чистый спред</span>
                <span class="pnl-value" :class="{ positive: displayOpportunity.netSpreadBps > 0, negative: displayOpportunity.netSpreadBps <= 0 }">
                  {{ displayOpportunity.netSpreadBps.toFixed(1) }} bps
                </span>
              </div>
              <div class="pnl-row">
                <span>Проскальз. @${{ formatSize(positionSize) }}</span>
                <span class="pnl-value negative">-{{ slippageForSize.toFixed(1) }} bps</span>
              </div>

              <Divider />

              <div class="pnl-row total">
                <span>Валовая прибыль</span>
                <span class="pnl-value">${{ estimatedPnL.gross.toFixed(2) }}</span>
              </div>
              <div class="pnl-row total">
                <span>Чистая (после комиссий)</span>
                <span class="pnl-value" :class="{ positive: estimatedPnL.net > 0, negative: estimatedPnL.net <= 0 }">
                  ${{ estimatedPnL.net.toFixed(2) }}
                </span>
              </div>
              <div class="pnl-row total highlight">
                <span>Итого (после проскальз.)</span>
                <span class="pnl-value" :class="{ positive: estimatedPnL.afterSlippage > 0, negative: estimatedPnL.afterSlippage <= 0 }">
                  ${{ estimatedPnL.afterSlippage.toFixed(2) }}
                </span>
              </div>
            </div>
          </div>

          <Divider />

          <!-- Detailed Metrics -->
          <h4>Детали исполнения</h4>
          <div class="metrics-grid">
            <div class="metric-item">
              <span class="metric-label">Цена покупки</span>
              <span class="metric-value">${{ formatPrice(displayOpportunity.buyPrice) }}</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">Цена продажи</span>
              <span class="metric-value">${{ formatPrice(displayOpportunity.sellPrice) }}</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">Макс. размер</span>
              <span class="metric-value">${{ formatSize(displayOpportunity.maxExecutableSize) }}</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">Глубина покупки</span>
              <span class="metric-value">${{ formatSize(displayOpportunity.depthBuyAt10Bps) }}</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">Глубина продажи</span>
              <span class="metric-value">${{ formatSize(displayOpportunity.depthSellAt10Bps) }}</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">Gas</span>
              <span class="metric-value">${{ displayOpportunity.gasEstimateUsd.toFixed(2) }}</span>
            </div>
          </div>

          <Divider />

          <h4>Ставки фандинга</h4>
          <div class="metrics-grid">
            <div class="metric-item">
              <span class="metric-label">{{ displayOpportunity.buyExchange }}</span>
              <span class="metric-value">{{ formatPercent(displayOpportunity.buyFundingRate * 10000) }}</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">{{ displayOpportunity.sellExchange }}</span>
              <span class="metric-value">{{ formatPercent(displayOpportunity.sellFundingRate * 10000) }}</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">Дельта</span>
              <span class="metric-value" :class="{ positive: displayOpportunity.fundingDeltaBps > 0, negative: displayOpportunity.fundingDeltaBps < 0 }">
                {{ displayOpportunity.fundingDeltaBps.toFixed(2) }} bps
              </span>
            </div>
          </div>

          <Divider />

          <h4>Метрики риска</h4>
          <div class="metrics-grid">
            <div class="metric-item">
              <span class="metric-label">Вол. 1м</span>
              <span class="metric-value">{{ displayOpportunity.risk.volatility1m.toFixed(2) }}</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">Вол. 5м</span>
              <span class="metric-value">{{ displayOpportunity.risk.volatility5m.toFixed(2) }}</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">Перекос книги</span>
              <span class="metric-value">{{ (displayOpportunity.risk.bookSkew * 100).toFixed(1) }}%</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">Риск задержки</span>
              <span class="metric-value">{{ displayOpportunity.risk.latencyRisk.toFixed(0) }}мс</span>
            </div>
          </div>

          <div v-if="displayOpportunity.risk.riskFlags.length > 0" class="risk-flags-section">
            <Tag
                v-for="flag in displayOpportunity.risk.riskFlags"
                :key="flag"
                severity="danger"
                size="small"
            >
              {{ flag }}
            </Tag>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="detail-footer">
        <div class="lifecycle-info">
          <span>Появилась: {{ new Date(displayOpportunity.lifecycle.firstSeenAt).toLocaleTimeString() }}</span>
          <span>Время жизни: {{ (displayOpportunity.lifecycle.lifetimeMs / 1000).toFixed(1) }}с</span>
          <span>Повторений: {{ displayOpportunity.lifecycle.occurrenceCount }}</span>
        </div>
        <Button label="Закрыть" severity="secondary" @click="emit('update:visible', false)" />
      </div>
    </template>
  </Dialog>
</template>

<style scoped>
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  gap: 1rem;
  color: var(--p-text-muted-color);
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.symbol-large {
  font-size: 1.5rem;
  font-weight: 700;
}

.exchange-flow {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.flow-arrow {
  font-size: 1.25rem;
  color: var(--p-text-muted-color);
}

.exchange-tag {
  display: flex;
  align-items: center;
}

.mr-2 {
  margin-right: 0.5rem;
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 380px;
  gap: 1.5rem;
  padding: 1.5rem;
  min-height: 500px;
}

.orderbooks-section h4,
.charts-section h4,
.calculator-section h4 {
  margin: 0 0 0.75rem 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--p-text-muted-color);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.orderbooks-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.depth-chart-container,
.spread-history-container {
  border-radius: 0.5rem;
  padding: 1rem;
  margin-bottom: 1rem;
}

.spread-stats {
  display: flex;
  justify-content: space-around;
  margin-top: 0.75rem;
  font-size: 0.8rem;
  color: var(--p-text-muted-color);
}

.spread-stats strong {
  color: var(--p-text-color);
}

.calculator-card {
  border-radius: 0.5rem;
  padding: 1rem;
}

.size-input {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.size-input label {
  font-size: 0.8rem;
  color: var(--p-text-muted-color);
}

.size-presets {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
  flex-wrap: wrap;
}

.pnl-breakdown {
  font-size: 0.875rem;
}

.pnl-row {
  display: flex;
  justify-content: space-between;
  padding: 0.35rem 0;
}

.pnl-row.total {
  font-weight: 600;
}

.pnl-row.highlight {
  margin: 0 -1rem;
  padding: 0.5rem 1rem;
  border-radius: 0.25rem;
}

.pnl-value {
  font-family: monospace;
}

.pnl-value.positive {
  color: var(--p-green-500);
}

.pnl-value.negative {
  color: var(--p-red-500);
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
}

.metric-item {
  display: flex;
  flex-direction: column;
  padding: 0.5rem;
  border-radius: 0.25rem;
}

.metric-label {
  font-size: 0.7rem;
  color: var(--p-text-muted-color);
  margin-bottom: 0.25rem;
}

.metric-value {
  font-family: monospace;
  font-size: 0.875rem;
  font-weight: 500;
}

.metric-value.positive {
  color: var(--p-green-500);
}

.metric-value.negative {
  color: var(--p-red-500);
}

.risk-flags-section {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.detail-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--p-surface-200);
}

.lifecycle-info {
  display: flex;
  gap: 1.5rem;
  font-size: 0.8rem;
  color: var(--p-text-muted-color);
}

@media (max-width: 1200px) {
  .detail-grid {
    grid-template-columns: 1fr;
  }

  .orderbooks-container {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
