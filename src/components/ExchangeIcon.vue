<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(
	defineProps<{
		exchange: string;
		variant?: "symbol" | "full";
		size?: "small" | "medium" | "large" | "xlarge"; // Added xlarge for full logos
	}>(),
	{
		variant: "symbol",
		size: "medium",
	},
);

// Map exchange names to folder names if they differ (usually they match lowercased)
const normalizedExchange = computed(() => props.exchange.toLowerCase());

// Construct the path
// We assume the structure: src/static/exchanges/{exchange}/dark/{variant}-light.svg
// variant is 'symbol' or 'full'
const iconPath = computed(() => {
	const ex = normalizedExchange.value;
	const type = props.variant;
	// Note: In Vite, dynamic imports with variables need to be handled carefully.
	// Using new URL with a relative path from this component.
	// Path from components/ExchangeIcon.vue to static/exchanges is ../static/exchanges
	return new URL(
		`../static/exchanges/${ex}/dark/${type}-light.svg`,
		import.meta.url,
	).href;
});

const sizeClass = computed(() => {
	if (props.variant === "full") {
		// Full logos are wider
		switch (props.size) {
			case "small":
				return "h-4";
			case "large":
				return "h-8";
			case "xlarge":
				return "h-10";
			default:
				return "h-6"; // medium
		}
	} else {
		// Symbols are square
		switch (props.size) {
			case "small":
				return "w-4 h-4";
			case "large":
				return "w-8 h-8";
			case "xlarge":
				return "w-12 h-12";
			default:
				return "w-5 h-5";
		}
	}
});
</script>

<template>
  <div class="exchange-icon-wrapper" :class="[sizeClass, variant === 'full' ? 'is-full' : 'is-symbol']" :title="exchange">
    <img 
      :src="iconPath" 
      :alt="exchange" 
      class="icon-img"
      @error="$emit('error')"
    />
  </div>
</template>

<style scoped>
.exchange-icon-wrapper {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.is-symbol {
  border-radius: 50%;
  overflow: hidden;
}

.is-full {
  /* Full logos shouldn't be circular */
  border-radius: 0;
}

.icon-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}

/* Tailwind-like utility classes if not available globally */
.w-4 { width: 1rem; }
.h-4 { height: 1rem; }
.w-5 { width: 1.25rem; }
.h-5 { height: 1.25rem; }
.h-6 { height: 1.5rem; }
.w-8 { width: 2rem; }
.h-8 { height: 2rem; }
.h-10 { height: 2.5rem; }
.w-12 { width: 3rem; }
.h-12 { height: 3rem; }
</style>
