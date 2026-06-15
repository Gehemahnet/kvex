<script setup lang="ts">
import { computed, ref } from "vue";
import Button from "primevue/button";
import Popover from "primevue/popover";
import type { FilterPanelConfig } from "./FilterPanel.types";

const props = defineProps<{
	config: FilterPanelConfig;
}>();

const popover = ref<{
	hide: () => void;
	toggle: (event: Event) => void;
} | null>(null);

const config = computed(() => ({
	activeFilterCount: props.config.activeFilterCount ?? 0,
	buttonClass: props.config.buttonClass ?? "",
	buttonLabel: props.config.buttonLabel ?? "Filters",
	buttonSize: props.config.buttonSize,
	description: props.config.description ?? "Changes apply after confirmation.",
	panelClass: props.config.panelClass ?? "w-[min(28rem,calc(100vw-2rem))]",
	title: props.config.title,
}));

const buttonText = computed(() =>
	config.value.activeFilterCount > 0
		? `${config.value.buttonLabel} (${config.value.activeFilterCount})`
		: config.value.buttonLabel,
);

/** Syncs draft filter state before the popover opens. */
const toggle = (event: Event) => {
	props.config.onBeforeOpen?.();
	popover.value?.toggle(event);
};

/** Applies slot-owned filter values and closes the popover. */
const apply = () => {
	props.config.onApply();
	popover.value?.hide();
};

/** Resets slot-owned filter values and closes the popover. */
const reset = () => {
	props.config.onReset();
	popover.value?.hide();
};
</script>

<template>
	<Button
		:class="config.buttonClass"
		icon="pi pi-filter"
		:label="buttonText"
		severity="secondary"
		:size="config.buttonSize"
		@click="toggle"
	/>

	<Popover
		ref="popover"
		class="kvex-filters-popover"
	>
		<div
			class="flex flex-col gap-4"
			:class="config.panelClass"
		>
			<div>
				<span class="block text-sm font-semibold text-[var(--p-text-color)]">
					{{ config.title }}
				</span>
				<span
					v-if="config.description"
					class="mt-1 block text-xs text-[var(--kvex-text-muted-color)]"
				>
					{{ config.description }}
				</span>
			</div>

			<slot />

			<div class="flex justify-end gap-2">
				<Button
					label="Reset"
					severity="secondary"
					variant="outlined"
					@click="reset"
				/>
				<Button
					label="Apply"
					@click="apply"
				/>
			</div>
		</div>
	</Popover>
</template>
