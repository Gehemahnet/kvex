<script setup lang="ts">
import { computed } from "vue";
import type { ExchangeMarketData } from "../../../hooks/useArbitrageLabSocket";

const props = defineProps<{
	buyData: ExchangeMarketData;
	sellData: ExchangeMarketData;
}>();

const WIDTH = 400;
const HEIGHT = 200;
const PADDING = { top: 20, right: 20, bottom: 30, left: 50 };

const chartWidth = WIDTH - PADDING.left - PADDING.right;
const chartHeight = HEIGHT - PADDING.top - PADDING.bottom;

interface DepthPoint {
	price: number;
	cumulativeSize: number;
}

const buyBidsDepth = computed<DepthPoint[]>(() => {
	const points: DepthPoint[] = [];
	let cumulative = 0;
	const sorted = [...props.buyData.bids].sort((a, b) => b.price - a.price);
	for (const level of sorted) {
		cumulative += level.size * level.price; // USD value
		points.push({ price: level.price, cumulativeSize: cumulative });
	}
	return points;
});

const sellAsksDepth = computed<DepthPoint[]>(() => {
	const points: DepthPoint[] = [];
	let cumulative = 0;
	const sorted = [...props.sellData.asks].sort((a, b) => a.price - b.price);
	for (const level of sorted) {
		cumulative += level.size * level.price; // USD value
		points.push({ price: level.price, cumulativeSize: cumulative });
	}
	return points;
});

const priceRange = computed(() => {
	const allPrices = [
		...buyBidsDepth.value.map((p) => p.price),
		...sellAsksDepth.value.map((p) => p.price),
	];
	if (allPrices.length === 0) return { min: 0, max: 1 };
	const min = Math.min(...allPrices);
	const max = Math.max(...allPrices);
	const padding = (max - min) * 0.05;
	return { min: min - padding, max: max + padding };
});

const maxCumulativeSize = computed(() => {
	const allSizes = [
		...buyBidsDepth.value.map((p) => p.cumulativeSize),
		...sellAsksDepth.value.map((p) => p.cumulativeSize),
	];
	return Math.max(...allSizes, 1);
});

const midPrice = computed(() => {
	const buyBest = props.buyData.asks[0]?.price || 0;
	const sellBest = props.sellData.bids[0]?.price || 0;
	return (buyBest + sellBest) / 2;
});

const scaleX = (price: number): number => {
	const { min, max } = priceRange.value;
	return PADDING.left + ((price - min) / (max - min)) * chartWidth;
};

const scaleY = (size: number): number => {
	return (
		PADDING.top + chartHeight - (size / maxCumulativeSize.value) * chartHeight
	);
};

const bidsPath = computed(() => {
	if (buyBidsDepth.value.length === 0) return "";
	const points = buyBidsDepth.value;

	// Start from top-right of first point
	let path = `M ${scaleX(points[0].price)} ${scaleY(0)}`;

	// Draw step function
	for (let i = 0; i < points.length; i++) {
		const current = points[i];
		path += ` L ${scaleX(current.price)} ${scaleY(current.cumulativeSize)}`;
		if (i < points.length - 1) {
			const next = points[i + 1];
			path += ` L ${scaleX(next.price)} ${scaleY(current.cumulativeSize)}`;
		}
	}

	// Close the area
	const last = points[points.length - 1];
	path += ` L ${scaleX(last.price)} ${scaleY(0)}`;
	path += " Z";

	return path;
});

const asksPath = computed(() => {
	if (sellAsksDepth.value.length === 0) return "";
	const points = sellAsksDepth.value;

	// Start from bottom-left
	let path = `M ${scaleX(points[0].price)} ${scaleY(0)}`;

	// Draw step function
	for (let i = 0; i < points.length; i++) {
		const current = points[i];
		path += ` L ${scaleX(current.price)} ${scaleY(current.cumulativeSize)}`;
		if (i < points.length - 1) {
			const next = points[i + 1];
			path += ` L ${scaleX(next.price)} ${scaleY(current.cumulativeSize)}`;
		}
	}

	// Close the area
	const last = points[points.length - 1];
	path += ` L ${scaleX(last.price)} ${scaleY(0)}`;
	path += " Z";

	return path;
});

const yAxisTicks = computed(() => {
	const max = maxCumulativeSize.value;
	const tickCount = 4;
	const ticks: number[] = [];
	for (let i = 0; i <= tickCount; i++) {
		ticks.push((max / tickCount) * i);
	}
	return ticks;
});

const xAxisTicks = computed(() => {
	const { min, max } = priceRange.value;
	const tickCount = 5;
	const ticks: number[] = [];
	for (let i = 0; i <= tickCount; i++) {
		ticks.push(min + ((max - min) / tickCount) * i);
	}
	return ticks;
});

const formatSize = (value: number): string => {
	if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
	if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
	return value.toFixed(0);
};

const formatPrice = (price: number): string => {
	if (price >= 1000) return price.toFixed(0);
	if (price >= 1) return price.toFixed(2);
	return price.toFixed(4);
};
</script>

<template>
  <div class="depth-chart">
    <svg :width="WIDTH" :height="HEIGHT" :viewBox="`0 0 ${WIDTH} ${HEIGHT}`">
      <!-- Grid lines -->
      <g class="grid">
        <line
            v-for="tick in yAxisTicks"
            :key="`grid-y-${tick}`"
            :x1="PADDING.left"
            :y1="scaleY(tick)"
            :x2="WIDTH - PADDING.right"
            :y2="scaleY(tick)"
            stroke="var(--p-surface-200)"
            stroke-dasharray="2,2"
        />
      </g>

      <!-- Bids area (green) -->
      <path
          v-if="bidsPath"
          :d="bidsPath"
          fill="var(--p-green-500)"
          fill-opacity="0.3"
          stroke="var(--p-green-500)"
          stroke-width="2"
      />

      <!-- Asks area (red) -->
      <path
          v-if="asksPath"
          :d="asksPath"
          fill="var(--p-red-500)"
          fill-opacity="0.3"
          stroke="var(--p-red-500)"
          stroke-width="2"
      />

      <!-- Mid price line -->
      <line
          v-if="midPrice > 0"
          :x1="scaleX(midPrice)"
          :y1="PADDING.top"
          :x2="scaleX(midPrice)"
          :y2="HEIGHT - PADDING.bottom"
          stroke="var(--p-primary-color)"
          stroke-width="1"
          stroke-dasharray="4,4"
      />

      <!-- Y-axis labels -->
      <g class="y-axis">
        <text
            v-for="tick in yAxisTicks"
            :key="`y-label-${tick}`"
            :x="PADDING.left - 5"
            :y="scaleY(tick) + 4"
            text-anchor="end"
            fill="var(--p-text-muted-color)"
            font-size="10"
        >
          ${{ formatSize(tick) }}
        </text>
      </g>

      <!-- X-axis labels -->
      <g class="x-axis">
        <text
            v-for="tick in xAxisTicks"
            :key="`x-label-${tick}`"
            :x="scaleX(tick)"
            :y="HEIGHT - PADDING.bottom + 15"
            text-anchor="middle"
            fill="var(--p-text-muted-color)"
            font-size="10"
        >
          {{ formatPrice(tick) }}
        </text>
      </g>

      <!-- Axes -->
      <line
          :x1="PADDING.left"
          :y1="PADDING.top"
          :x2="PADDING.left"
          :y2="HEIGHT - PADDING.bottom"
          stroke="var(--p-surface-300)"
      />
      <line
          :x1="PADDING.left"
          :y1="HEIGHT - PADDING.bottom"
          :x2="WIDTH - PADDING.right"
          :y2="HEIGHT - PADDING.bottom"
          stroke="var(--p-surface-300)"
      />
    </svg>

    <!-- Legend -->
    <div class="chart-legend">
      <div class="legend-item">
        <span class="legend-color bids"></span>
        <span>{{ buyData.exchange }} Bids</span>
      </div>
      <div class="legend-item">
        <span class="legend-color asks"></span>
        <span>{{ sellData.exchange }} Asks</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.depth-chart {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.depth-chart svg {
  max-width: 100%;
  height: auto;
}

.chart-legend {
  display: flex;
  gap: 1.5rem;
  margin-top: 0.5rem;
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.legend-color {
  width: 12px;
  height: 12px;
  border-radius: 2px;
}

.legend-color.bids {
  background: var(--p-green-500);
  opacity: 0.5;
  border: 1px solid var(--p-green-500);
}

.legend-color.asks {
  background: var(--p-red-500);
  opacity: 0.5;
  border: 1px solid var(--p-red-500);
}
</style>
