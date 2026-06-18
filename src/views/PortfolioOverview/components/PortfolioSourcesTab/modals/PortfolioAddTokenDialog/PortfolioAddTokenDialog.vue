<script setup lang="ts">
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import FormItem from "@components/FormItem/FormItem.vue";
import { useAddTokenDialog } from "./PortfolioAddTokenDialog.composables";

const emit = defineEmits<{
	confirm: [];
}>();

const isVisible = defineModel<boolean>("isVisible", { required: true });

const {
	canSaveExchangeToken,
	confirmExchangeToken,
	exchangeOptions,
	isSavingExchangeToken,
	permissionOptions,
	resetTokenForm,
	selectedExchangeConfig,
	selectedPermissionConfig,
	tokenForm,
	visibleFields,
} = useAddTokenDialog();

const closeTokenDialog = () => {
	resetTokenForm();
	isVisible.value = false;
};

const saveToken = async () => {
	await confirmExchangeToken();
	emit("confirm");
	closeTokenDialog();
};
</script>

<template>
	<Dialog
		v-model:visible="isVisible"
		header="Add Tokens"
		modal
		class="w-[min(38rem,calc(100vw-2rem))]"
	>
		<div class="flex flex-col gap-3">
			<FormItem label="Exchange">
				<Select
					v-model="tokenForm.exchange"
					class="w-full"
					:options="exchangeOptions"
					option-disabled="disabled"
					option-label="label"
					option-value="value"
				/>
			</FormItem>

			<FormItem label="Label">
				<InputText
					v-model="tokenForm.label"
					class="w-full"
					placeholder="Read-only main account"
				/>
			</FormItem>

			<FormItem label="Permission type">
				<Select
					v-model="tokenForm.permissionType"
					class="w-full"
					:disabled="selectedExchangeConfig.disabled === true"
					:options="permissionOptions"
					option-disabled="disabled"
					option-label="label"
					option-value="value"
				/>
			</FormItem>

			<div class="grid grid-cols-1 gap-3 md:grid-cols-2">
				<FormItem
					v-for="field in visibleFields"
					:key="field.name"
					:label="field.label"
				>
					<InputText
						v-model="tokenForm[field.name]"
						class="w-full"
						:autocomplete="field.autocomplete"
						:placeholder="field.placeholder"
						:type="field.type ?? 'text'"
					/>
				</FormItem>
			</div>

			<p class="m-0 text-xs text-[var(--kvex-text-muted-color)]">
				{{ selectedExchangeConfig.disabledReason ?? selectedPermissionConfig?.disabledReason ?? "Only the selected permission scope is saved for this exchange." }}
			</p>
		</div>

		<template #footer>
			<div class="flex justify-end gap-2">
				<Button
					label="Cancel"
					severity="secondary"
					@click="closeTokenDialog"
				/>
				<Button
					icon="pi pi-check"
					label="Save"
					:disabled="!canSaveExchangeToken"
					:loading="isSavingExchangeToken"
					@click="saveToken"
				/>
			</div>
		</template>
	</Dialog>
</template>
