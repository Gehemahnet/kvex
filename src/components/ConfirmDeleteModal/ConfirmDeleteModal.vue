<script setup lang="ts">
import Button from "primevue/button";
import Dialog from "primevue/dialog";

defineProps<{
  isConfirming?: boolean;
  title: string;
  text: string;
}>();

defineSlots();

const isVisible = defineModel<boolean>("isVisible", { required: true });

const emit = defineEmits<{
  cancel: [];
	confirm: [];
}>();
</script>

<template>
	<Dialog
		v-model:visible="isVisible"
		:header="title"
		modal
		class="w-[min(30rem,calc(100vw-2rem))]"
    @close="emit('cancel')"
	>
		<p class="m-0 text-sm text-[var(--kvex-text-muted-color)]">
      {{ text}}
    </p>
		<template #footer>
			<div class="flex justify-end gap-2">

        <Button
					label="Cancel"
					severity="secondary"
					@click="isVisible = false"
				/>

				<Button
					icon="pi pi-trash"
					label="Delete"
					severity="danger"
          :loading="isConfirming"
					@click="emit('confirm')"
				/>
			</div>
		</template>
	</Dialog>
</template>
