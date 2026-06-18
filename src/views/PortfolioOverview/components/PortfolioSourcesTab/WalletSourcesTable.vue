<script setup lang="ts">
import Button from "primevue/button";
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import Menu from "primevue/menu";
import { computed, ref } from "vue";
import ConfirmDeleteModal from "@components/ConfirmDeleteModal/ConfirmDeleteModal.vue";
import type { PortfolioWalletSourceRow } from "../../Portfolio.types";
import PortfolioAddWalletDialog from "./modals/PortfolioAddWalletDialog/PortfolioAddWalletDialog.vue";

const props = defineProps<{
	deleteSource: PortfolioWalletSourceRow | null;
	isDeleting: boolean;
	rows: PortfolioWalletSourceRow[];
}>();

const isAddWalletVisible = defineModel<boolean>("isAddWalletVisible", { required: true });
const isDeleteWalletVisible = defineModel<boolean>("isDeleteWalletVisible", { required: true });

const emit = defineEmits<{
	addConfirm: [];
	delete: [source: PortfolioWalletSourceRow];
	deleteConfirm: [];
}>();

const actionsMenu = ref<{
	toggle: (event: Event) => void;
} | null>(null);
const selectedActionRow = ref<PortfolioWalletSourceRow | null>(null);

const actionItems = computed(() => [
	{
		command: deleteSelectedSource,
		disabled: props.isDeleting,
		icon: "pi pi-trash",
		label: "Delete",
	},
]);
const deleteSourceText = computed(() =>
	`Delete ${props.deleteSource?.sourceLabel ?? "this wallet source"}? This removes the saved wallet source from your portfolio.`
);

const openActions = (
	event: Event,
	source: PortfolioWalletSourceRow,
) => {
	selectedActionRow.value = source;
	actionsMenu.value?.toggle(event);
};

const deleteSelectedSource = () => {
	const source = selectedActionRow.value;

	if (source === null) {
		return;
	}

	emit("delete", source);
};
</script>

<template>
	<div class="flex flex-col">
		<div class="mb-4 flex flex-wrap items-center justify-between gap-3">
			<div>
				<p class="m-0 text-xs font-bold uppercase tracking-wide text-[var(--kvex-text-muted-color)]">
					Tracked sources
				</p>
			</div>
			<div class="flex flex-wrap gap-2">
				<Button
					icon="pi pi-wallet"
					label="Add wallet"
					severity="primary"
					size="small"
					@click="isAddWalletVisible = true"
				/>
			</div>
		</div>

		<Menu
			id="wallet-source-actions-menu"
			ref="actionsMenu"
			:model="actionItems"
			:popup="true"
		/>

		<DataTable
			:value="rows"
			data-key="id"
			table-style="min-width: 44rem"
		>
			<Column
				field="network"
				header="Network"
				class="w-32"
				sortable
			>
				<template #body="{ data }">
					<span class="font-bold uppercase text-[var(--kvex-accent-color)]">
						{{ data.network }}
					</span>
				</template>
			</Column>

			<Column
				field="address"
				header="Address"
			>
				<template #body="{ data }">
					<div class="flex flex-col gap-1">
						<span class="font-bold text-[var(--kvex-symbol-color)]">
							{{ data.sourceLabel }}
						</span>
						<span class="truncate text-xs text-[var(--kvex-text-muted-color)]">
							{{ data.address }}
						</span>
					</div>
				</template>
			</Column>

			<Column
				field="valueUsd"
				header="Value"
				class="w-40 text-right"
				sortable
			>
				<template #body="{ data }">
					<span class="font-bold tabular-nums text-[var(--p-text-color)]">
						{{ data.valueUsdLabel }}
					</span>
				</template>
			</Column>

			<Column class="w-20">
				<template #body="{ data }">
					<div class="flex justify-end">
						<button
							class="flex size-9 cursor-pointer items-center justify-center rounded-full border border-[var(--p-content-border-color)] bg-[var(--kvex-panel-muted-background)] text-[var(--kvex-text-muted-color)] transition-colors hover:bg-[var(--p-content-hover-background)]"
							type="button"
							aria-controls="wallet-source-actions-menu"
							aria-haspopup="true"
							aria-label="Wallet source actions"
							@click="openActions($event, data)"
						>
							<i class="pi pi-ellipsis-v" />
						</button>
					</div>
				</template>
			</Column>

			<template #empty>
				<div class="flex h-[300px] items-center justify-center text-center text-sm text-[var(--kvex-text-muted-color)]">
					No wallet addresses confirmed.
				</div>
			</template>
		</DataTable>

		<PortfolioAddWalletDialog
			v-model:isVisible="isAddWalletVisible"
			@confirm="emit('addConfirm')"
		/>

		<ConfirmDeleteModal
			v-model:isVisible="isDeleteWalletVisible"
			:is-confirming="isDeleting"
			:text="deleteSourceText"
			title="Confirm delete"
			@confirm="emit('deleteConfirm')"
		/>
	</div>
</template>
