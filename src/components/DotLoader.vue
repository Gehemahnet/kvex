<template>
  <span
      class="status-dot"
      :class="status"
      :title="statusLabel"
      aria-live="polite"
  />
</template>

<script setup lang="ts">
import { computed } from "vue";

type Status = "connected" | "disconnected" | "connecting";

const props = defineProps<{
	status: Status;
}>();

const statusLabel = computed(() => {
	switch (props.status) {
		case "connected":
			return "Connected";
		case "connecting":
			return "Connecting…";
		case "disconnected":
			return "Disconnected";
		default:
			return "";
	}
});
</script>

<style scoped>
.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  margin-left: 0.25rem;
  background-color: var(--p-text-muted-color);
  transition:
      background-color 0.2s ease,
      box-shadow 0.2s ease,
      opacity 0.2s ease;
}

/* CONNECTED */
.status-dot.connected {
  background-color: var(--p-green-500);
  box-shadow: 0 0 6px rgba(34, 197, 94, 0.6);
}

/* DISCONNECTED */
.status-dot.disconnected {
  background-color: var(--p-red-500);
  box-shadow: 0 0 6px rgba(239, 68, 68, 0.6);
}

/* CONNECTING */
.status-dot.connecting {
  background-color: var(--p-primary-color);
  animation: statusPulse 1.2s ease-in-out infinite;
}

@keyframes statusPulse {
  0% {
    opacity: 0.6;
    box-shadow: 0 0 0 rgba(66, 136, 152, 0);
  }
  50% {
    opacity: 1;
    box-shadow: 0 0 8px rgba(66, 136, 152, 0.6);
  }
  100% {
    opacity: 0.6;
    box-shadow: 0 0 0 rgba(66, 136, 152, 0);
  }
}
</style>
