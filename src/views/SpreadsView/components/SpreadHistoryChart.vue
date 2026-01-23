<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
	history: number[];
}>();

const WIDTH = 350;
const HEIGHT = 80;
const PADDING = { top: 10, right: 10, bottom: 20, left: 40 };

const chartWidth = WIDTH - PADDING.left - PADDING.right;
const chartHeight = HEIGHT - PADDING.top - PADDING.bottom;

const dataPoints = computed(() => {
	if (props.history.length === 0) return [];
	return props.history.slice(-50); // Last 50 points
});

const valueRange = computed(() => {
	if (dataPoints.value.length === 0) return { min: 0, max: 1 };
	const min = Math.min(...dataPoints.value, 0);
	const max = Math.max(...dataPoints.value, 1);
	const padding = (max - min) * 0.1 || 1;
	return { min: min - padding, max: max + padding };
});

const scaleX = (index: number): number => {
	const count = dataPoints.value.length;
	if (count <= 1) return PADDING.left + chartWidth / 2;
	return PADDING.left + (index / (count - 1)) * chartWidth;
};

const scaleY = (value: number): number => {
	const { min, max } = valueRange.value;
	if (max === min) return PADDING.top + chartHeight / 2;
	return (
		PADDING.top + chartHeight - ((value - min) / (max - min)) * chartHeight
	);
};

const linePath = computed(() => {
	if (dataPoints.value.length === 0) return "";

	const points = dataPoints.value.map(
		(val, idx) => `${scaleX(idx)},${scaleY(val)}`,
	);
	return `M ${points.join(" L ")}`;
});

const areaPath = computed(() => {
	if (dataPoints.value.length === 0) return "";

	const points = dataPoints.value.map(
		(val, idx) => `${scaleX(idx)},${scaleY(val)}`,
	);
	const last = dataPoints.value.length - 1;

	return `M ${scaleX(0)},${scaleY(0)} L ${points.join(" L ")} L ${scaleX(last)},${scaleY(0)} Z`;
});

const zeroLineY = computed(() => scaleY(0));

const currentValue = computed(() => {
	if (dataPoints.value.length === 0) return 0;
	return dataPoints.value[dataPoints.value.length - 1];
});

const isPositive = computed(() => currentValue.value > 0);

const yAxisTicks = computed(() => {
	const { min, max } = valueRange.value;
	return [min, (min + max) / 2, max];
});
</script>

<template>
  <div class="spread-history-chart">
    <svg :width="WIDTH" :height="HEIGHT" :viewBox="`0 0 ${WIDTH} ${HEIGHT}`">
      <!-- Zero line -->
      <line
          :x1="PADDING.left"
          :y1="zeroLineY"
          :x2="WIDTH - PADDING.right"
          :y2="zeroLineY"
          stroke="var(--p-surface-300)"
          stroke-width="1"
          stroke-dasharray="4,4"
      />

      <!-- Area fill -->
      <path
          v-if="areaPath"
          :d="areaPath"
          :fill="isPositive ? 'var(--p-green-500)' : 'var(--p-red-500)'"
          fill-opacity="0.2"
      />

      <!-- Line -->
      <path
          v-if="linePath"
          :d="linePath"
          fill="none"
          :stroke="isPositive ? 'var(--p-green-500)' : 'var(--p-red-500)'"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
      />

      <!-- Current value dot -->
      <circle
          v-if="dataPoints.length > 0"
          :cx="scaleX(dataPoints.length - 1)"
          :cy="scaleY(currentValue)"
          r="4"
          :fill="isPositive ? 'var(--p-green-500)' : 'var(--p-red-500)'"
      />

      <!-- Y-axis labels -->
      <text
          v-for="tick in yAxisTicks"
          :key="`y-${tick}`"
          :x="PADDING.left - 5"
          :y="scaleY(tick) + 3"
          text-anchor="end"
          fill="var(--p-text-muted-color)"
          font-size="9"
      >
        {{ tick.toFixed(1) }}
      </text>

      <!-- Y-axis -->
      <line
          :x1="PADDING.left"
          :y1="PADDING.top"
          :x2="PADDING.left"
          :y2="HEIGHT - PADDING.bottom"
          stroke="var(--p-surface-300)"
      />

      <!-- X-axis -->
      <line
          :x1="PADDING.left"
          :y1="HEIGHT - PADDING.bottom"
          :x2="WIDTH - PADDING.right"
          :y2="HEIGHT - PADDING.bottom"
          stroke="var(--p-surface-300)"
      />

      <!-- X-axis label -->
      <text
          :x="WIDTH / 2"
          :y="HEIGHT - 3"
          text-anchor="middle"
          fill="var(--p-text-muted-color)"
          font-size="9"
      >
        Время (последние {{ dataPoints.length }} обновлений)
      </text>
    </svg>

    <div v-if="dataPoints.length === 0" class="no-data">
      Нет истории спреда
    </div>
  </div>
</template>

<style scoped>
.spread-history-chart {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.spread-history-chart svg {
  max-width: 100%;
  height: auto;
}

.no-data {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 80px;
  color: var(--p-text-muted-color);
  font-size: 0.8rem;
}
</style>
