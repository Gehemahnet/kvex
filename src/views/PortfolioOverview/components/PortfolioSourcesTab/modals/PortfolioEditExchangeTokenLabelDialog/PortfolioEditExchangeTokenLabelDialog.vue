<script setup lang="ts">
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import type { PortfolioExchangeTokenRow } from "../../../../Portfolio.types";

defineProps<{
	canSave: boolean;
	isSaving: boolean;
	token: PortfolioExchangeTokenRow | null;
}>();

const isVisible = defineModel<boolean>("isVisible", { required: true });
const label = defineModel<string>("label", { required: true });

const emit = defineEmits<{
	confirm: [];
}>();
</script>

<template>
	<Dialog
		v-model:visible="isVisible"
		header="Edit token label"
		modal
		class="w-[min(30rem,calc(100vw-2rem))]"
	>
		<div class="flex flex-col gap-2">
			<label
				class="text-[0.846rem] font-bold text-[var(--kvex-text-muted-color)]"
				for="exchange-token-label"
			>
				Label
			</label>
			<InputText
				id="exchange-token-label"
				v-model="label"
				class="w-full"
				autofocus
				:placeholder="token?.label ?? 'Token label'"
				@keyup.enter="emit('confirm')"
			/>
		</div>

		<template #footer>
			<div class="flex justify-end gap-2">
				<Button
					label="Cancel"
					severity="secondary"
					@click="isVisible = false"
				/>
				<Button
					icon="pi pi-check"
					label="Save"
					:disabled="!canSave"
					:loading="isSaving"
					@click="emit('confirm')"
				/>
			</div>
		</template>
	</Dialog>
</template>
