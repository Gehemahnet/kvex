<script setup lang="ts">
import Button from "primevue/button";
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import Menu from "primevue/menu";
import { computed, ref } from "vue";
import ConfirmDeleteModal from "@components/ConfirmDeleteModal/ConfirmDeleteModal.vue";
import PortfolioAddTokenDialog from "./modals/PortfolioAddTokenDialog/PortfolioAddTokenDialog.vue";
import PortfolioEditExchangeTokenLabelDialog from "./modals/PortfolioEditExchangeTokenLabelDialog/PortfolioEditExchangeTokenLabelDialog.vue";
import type { PortfolioExchangeTokenRow } from "../../Portfolio.types";

const props = defineProps<{
	canSaveLabel: boolean;
	deleteToken: PortfolioExchangeTokenRow | null;
	editToken: PortfolioExchangeTokenRow | null;
	isDeleting: boolean;
	isSaving: boolean;
	isSavingLabel: boolean;
	rows: PortfolioExchangeTokenRow[];
}>();

const isAddTokenVisible = defineModel<boolean>("isAddTokenVisible", { required: true });
const isDeleteTokenVisible = defineModel<boolean>("isDeleteTokenVisible", { required: true });
const isEditTokenVisible = defineModel<boolean>("isEditTokenVisible", { required: true });
const label = defineModel<string>("label", { required: true });

const emit = defineEmits<{
	addConfirm: [];
	delete: [token: PortfolioExchangeTokenRow];
	deleteConfirm: [];
	edit: [token: PortfolioExchangeTokenRow];
	editConfirm: [];
}>();

const actionsMenu = ref<{
	toggle: (event: Event) => void;
} | null>(null);
const selectedActionRow = ref<PortfolioExchangeTokenRow | null>(null);

const actionItems = computed(() => [
	{
		command: editSelectedToken,
		icon: "pi pi-pencil",
		label: "Edit label",
	},
	{
		command: deleteSelectedToken,
		disabled: props.isSaving,
		icon: "pi pi-trash",
		label: "Delete",
	},
]);
const deleteTokenText = computed(() =>
	`Delete ${props.deleteToken?.label ?? "this token"}? This removes the saved exchange access token from your portfolio.`
);

const openActions = (
	event: Event,
	token: PortfolioExchangeTokenRow,
) => {
	selectedActionRow.value = token;
	actionsMenu.value?.toggle(event);
};

const editSelectedToken = () => {
	const token = selectedActionRow.value;

	if (token === null) {
		return;
	}

	emit("edit", token);
};

const deleteSelectedToken = () => {
	const token = selectedActionRow.value;

	if (token === null) {
		return;
	}

	emit("delete", token);
};
</script>

<template>
	<div class="mt-6">
		<div class="mb-3 flex flex-wrap items-center justify-between gap-3">
			<div>
				<p class="m-0 text-xs font-bold uppercase tracking-wide text-[var(--kvex-text-muted-color)]">
					Exchange tokens
				</p>
				<p class="m-0 mt-1 text-sm text-[var(--kvex-text-muted-color)]">
					Read tokens power balances now and future account data later.
				</p>
			</div>
			<div class="flex flex-wrap gap-2">
				<Button
					icon="pi pi-key"
					label="Add Tokens"
					severity="primary"
					size="small"
					@click="isAddTokenVisible = true"
				/>
			</div>
		</div>

		<Menu
			id="exchange-token-actions-menu"
			ref="actionsMenu"
			:model="actionItems"
			:popup="true"
		/>

		<DataTable
			:value="rows"
			data-key="id"
			table-style="min-width: 54rem"
		>
			<Column
				field="exchangeLabel"
				header="Exchange"
				class="w-40"
				sortable
			>
				<template #body="{ data }">
					<span class="font-bold text-[var(--kvex-symbol-color)]">
						{{ data.exchangeLabel }}
					</span>
				</template>
			</Column>

			<Column
				field="label"
				header="Token"
				sortable
			>
				<template #body="{ data }">
					<div class="flex flex-col gap-1">
						<span class="font-bold text-[var(--kvex-symbol-color)]">
							{{ data.label }}
						</span>
						<span class="text-xs uppercase text-[var(--kvex-text-muted-color)]">
							{{ data.status }}
						</span>
					</div>
				</template>
			</Column>

			<Column header="Permissions">
				<template #body="{ data }">
					<div class="flex flex-wrap gap-1">
						<span
							v-for="permission in data.permissions"
							:key="permission"
							class="rounded bg-[var(--kvex-success-background)] px-2 py-1 text-xs font-bold uppercase text-[var(--kvex-success-color)]"
						>
							{{ permission }}
						</span>
					</div>
				</template>
			</Column>

			<Column
				field="freshnessLabel"
				header="Freshness"
				sortable
			/>

			<Column
				field="expiresInLabel"
				header="Expires"
				sortable
			/>

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
							aria-controls="exchange-token-actions-menu"
							aria-haspopup="true"
							aria-label="Token actions"
							@click="openActions($event, data)"
						>
							<i class="pi pi-ellipsis-v" />
						</button>
					</div>
				</template>
			</Column>

			<template #empty>
				<div class="flex h-[300px] items-center justify-center text-center text-sm text-[var(--kvex-text-muted-color)]">
					No exchange tokens confirmed.
				</div>
			</template>
		</DataTable>

		<PortfolioAddTokenDialog
			v-model:isVisible="isAddTokenVisible"
			@confirm="emit('addConfirm')"
		/>

		<ConfirmDeleteModal
			v-model:isVisible="isDeleteTokenVisible"
			:is-confirming="isDeleting"
			:text="deleteTokenText"
			title="Confirm delete"
			@confirm="emit('deleteConfirm')"
		/>

		<PortfolioEditExchangeTokenLabelDialog
			v-model:isVisible="isEditTokenVisible"
			v-model:label="label"
			:can-save="canSaveLabel"
			:is-saving="isSavingLabel"
			:token="editToken"
			@confirm="emit('editConfirm')"
		/>
	</div>
</template>
