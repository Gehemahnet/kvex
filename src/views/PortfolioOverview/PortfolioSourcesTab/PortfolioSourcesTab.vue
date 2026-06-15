<script setup lang="ts">
import Button from "primevue/button";
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import { defineAsyncComponent } from "vue";
import { usePortfolioSourcesTab } from "./PortfolioSourcesTab.composables";

const PortfolioAddWalletDialog = defineAsyncComponent(() =>
	import("../PortfolioAddWalletDialog/PortfolioAddWalletDialog.vue")
);
const PortfolioAddTokenDialog = defineAsyncComponent(() =>
	import("../PortfolioAddTokenDialog/PortfolioAddTokenDialog.vue")
);

const {
	exchangeTokenRows,
	isTokenDialogVisible,
	isWalletDialogVisible,
	isSavingWalletSource,
	openAddTokenDialog,
	openAddWalletDialog,
	removeExchangeToken,
	removeWalletSource,
	refreshPortfolioTables,
	walletSourceRows,
} = usePortfolioSourcesTab();
</script>

<template>
	<PortfolioAddWalletDialog
		v-model:isVisible="isWalletDialogVisible"
		@confirm="refreshPortfolioTables"
	/>
	<PortfolioAddTokenDialog
		v-model:isVisible="isTokenDialogVisible"
		@confirm="refreshPortfolioTables"
	/>

	<div class="mb-4 flex flex-wrap items-center justify-between gap-3">
		<div>
			<p class="m-0 text-xs font-bold uppercase tracking-wide text-[var(--kvex-text-muted-color)]">
				Tracked sources
			</p>
			<p class="m-0 mt-1 text-sm text-[var(--kvex-text-muted-color)]">
				{{ walletSourceRows.length }} wallet sources / {{ exchangeTokenRows.length }} exchange tokens
			</p>
		</div>
		<div class="flex flex-wrap gap-2">
			<Button
				icon="pi pi-wallet"
				label="Add wallet"
				severity="secondary"
				size="small"
				@click="openAddWalletDialog"
			/>
			<Button
				icon="pi pi-key"
				label="Add Tokens"
				size="small"
				@click="openAddTokenDialog"
			/>
		</div>
	</div>

	<DataTable
		:value="walletSourceRows"
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
			header="Actions"
			class="w-28"
		>
			<template #body="{ data }">
				<Button
					icon="pi pi-trash"
					severity="secondary"
					size="small"
					text
					:loading="isSavingWalletSource"
					@click="removeWalletSource(data.id)"
				/>
			</template>
		</Column>

		<template #empty>
			<div class="flex h-[300px] items-center justify-center text-center text-sm text-[var(--kvex-text-muted-color)]">
				No wallet addresses confirmed.
			</div>
		</template>
	</DataTable>

	<div class="mt-6">
		<div class="mb-3">
			<p class="m-0 text-xs font-bold uppercase tracking-wide text-[var(--kvex-text-muted-color)]">
				Exchange tokens
			</p>
			<p class="m-0 mt-1 text-sm text-[var(--kvex-text-muted-color)]">
				Read tokens power balances now and future account data later.
			</p>
		</div>

		<DataTable
			:value="exchangeTokenRows"
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
				header="Actions"
				class="w-28"
			>
				<template #body="{ data }">
					<Button
						icon="pi pi-trash"
						severity="secondary"
						size="small"
						text
						:loading="isSavingWalletSource"
						@click="removeExchangeToken(data.id)"
					/>
				</template>
			</Column>

			<template #empty>
				<div class="flex h-[300px] items-center justify-center text-center text-sm text-[var(--kvex-text-muted-color)]">
					No exchange tokens confirmed.
				</div>
			</template>
		</DataTable>
	</div>
</template>
