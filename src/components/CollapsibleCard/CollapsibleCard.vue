<script setup lang="ts">
import Panel from "primevue/panel";

withDefaults(
	defineProps<{
		contentClass?: string;
		rootClass?: string;
		title: string;
	}>(),
	{
		contentClass: "",
		rootClass: "",
	},
);

const collapsed = defineModel<boolean>("collapsed", { default: false });
</script>

<template>
	<Panel
		v-model:collapsed="collapsed"
		class="kvex-data-surface"
		:class="rootClass"
		toggleable
	>
		<template #header>
			<span class="text-base font-semibold text-[var(--p-text-color)]">
				{{ title }}
			</span>
		</template>

		<template #toggleicon="{ collapsed: isCollapsed }">
			<span
				class="pi text-sm text-[var(--kvex-text-muted-color)]"
				:class="isCollapsed ? 'pi-angle-down' : 'pi-angle-up'"
			/>
		</template>

		<div :class="contentClass">
			<slot />
		</div>
	</Panel>
</template>
