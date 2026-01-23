<script setup lang="ts">
import { Tag } from "primevue";
import { computed } from "vue";
import type { LowercaseExchange } from "../../../common/types";
import type { ExchangeMarketData } from "../../../hooks/useArbitrageLabSocket";

const props = defineProps<{
	exchange: LowercaseExchange;
	data: ExchangeMarketData;
	side: "buy" | "sell";
	counterPrice: number;
}>();

const MAX_LEVELS = 10;

const displayBids = computed(() => {
	return props.data.bids.slice(0, MAX_LEVELS);
});

const displayAsks = computed(() => {
	return props.data.asks.slice(0, MAX_LEVELS);
});

const maxBidSize = computed(() => {
	return Math.max(...displayBids.value.map((b) => b.size), 1);
});

const maxAskSize = computed(() => {
	return Math.max(...displayAsks.value.map((a) => a.size), 1);
});

const spreadBps = computed(() => {
	if (displayBids.value.length === 0 || displayAsks.value.length === 0)
		return 0;
	const bid = displayBids.value[0].price;
	const ask = displayAsks.value[0].price;
	const mid = (bid + ask) / 2;
	return ((ask - bid) / mid) * 10000;
});

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

const formatSize = (size: number): string => {
	if (size >= 1000) return `${(size / 1000).toFixed(2)}k`;
	if (size >= 1) return size.toFixed(2);
	return size.toFixed(4);
};

const isPriceInSpread = (price: number, type: "bid" | "ask"): boolean => {
	if (type === "bid") {
		return price >= props.counterPrice;
	} else {
		return price <= props.counterPrice;
	}
};
</script>

<template>
  <div class="orderbook-panel">
    <div class="panel-header">
      <Tag :severity="getExchangeSeverity(exchange)" size="small">{{ exchange }}</Tag>
      <span class="side-label" :class="side">{{ side === 'buy' ? 'ПОКУПКА' : 'ПРОДАЖА' }}</span>
    </div>

    <div class="book-header">
      <span>Цена</span>
      <span>Объём</span>
    </div>

    <!-- Asks (reversed, lowest at bottom) -->
    <div class="asks-section">
      <div
          v-for="(ask, idx) in [...displayAsks].reverse()"
          :key="`ask-${idx}`"
          class="book-row ask"
          :class="{ 'in-spread': side === 'buy' && isPriceInSpread(ask.price, 'ask') }"
      >
        <div class="depth-bar ask-bar" :style="{ width: `${(ask.size / maxAskSize) * 100}%` }" />
        <span class="price">{{ formatPrice(ask.price) }}</span>
        <span class="size">{{ formatSize(ask.size) }}</span>
      </div>
    </div>

    <!-- Spread indicator -->
    <div class="spread-row">
      <span class="spread-label">Спред</span>
      <span class="spread-value">{{ spreadBps.toFixed(1) }} bps</span>
    </div>

    <!-- Bids -->
    <div class="bids-section">
      <div
          v-for="(bid, idx) in displayBids"
          :key="`bid-${idx}`"
          class="book-row bid"
          :class="{ 'in-spread': side === 'sell' && isPriceInSpread(bid.price, 'bid') }"
      >
        <div class="depth-bar bid-bar" :style="{ width: `${(bid.size / maxBidSize) * 100}%` }" />
        <span class="price">{{ formatPrice(bid.price) }}</span>
        <span class="size">{{ formatSize(bid.size) }}</span>
      </div>
    </div>

    <!-- Summary -->
    <div class="book-summary">
      <div class="summary-item">
        <span class="summary-label">Лучший bid</span>
        <span class="summary-value bid-text">${{ formatPrice(data.bid) }}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">Лучший ask</span>
        <span class="summary-value ask-text">${{ formatPrice(data.ask) }}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">Середина</span>
        <span class="summary-value">${{ formatPrice(data.midPrice) }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.orderbook-panel {
  border: 1px solid var(--p-surface-200);
  border-radius: 0.5rem;
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid var(--p-surface-200);
}

.side-label {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.side-label.buy {
  color: var(--p-green-500);
}

.side-label.sell {
  color: var(--p-red-500);
}

.book-header {
  display: flex;
  justify-content: space-between;
  padding: 0.35rem 0.75rem;
  font-size: 0.65rem;
  font-weight: 600;
  color: var(--p-text-muted-color);
  text-transform: uppercase;
  border-bottom: 1px solid var(--p-surface-100);
}

.asks-section,
.bids-section {
  max-height: 200px;
  overflow-y: auto;
}

.book-row {
  display: flex;
  justify-content: space-between;
  padding: 0.2rem 0.75rem;
  font-family: monospace;
  font-size: 0.75rem;
  position: relative;
}

.book-row.in-spread {
  background: rgba(var(--p-green-500-rgb), 0.1);
}

.depth-bar {
  position: absolute;
  top: 0;
  bottom: 0;
  right: 0;
  opacity: 0.15;
}

.bid-bar {
  background: var(--p-green-500);
}

.ask-bar {
  background: var(--p-red-500);
}

.price {
  position: relative;
  z-index: 1;
}

.size {
  position: relative;
  z-index: 1;
  color: var(--p-text-muted-color);
}

.bid .price {
  color: var(--p-green-600);
}

.ask .price {
  color: var(--p-red-600);
}

.spread-row {
  display: flex;
  justify-content: space-between;
  padding: 0.35rem 0.75rem;
  font-size: 0.7rem;
  border-top: 1px solid var(--p-surface-200);
  border-bottom: 1px solid var(--p-surface-200);
}

.spread-label {
  color: var(--p-text-muted-color);
}

.spread-value {
  font-weight: 600;
  font-family: monospace;
}

.book-summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  padding: 0.5rem;
  border-top: 1px solid var(--p-surface-200);
}

.summary-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 0.7rem;
}

.summary-label {
  color: var(--p-text-muted-color);
}

.summary-value {
  font-family: monospace;
  font-weight: 500;
}

.bid-text {
  color: var(--p-green-600);
}

.ask-text {
  color: var(--p-red-600);
}
</style>
