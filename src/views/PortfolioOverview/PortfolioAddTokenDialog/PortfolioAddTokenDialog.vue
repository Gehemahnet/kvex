<script setup lang="ts">
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import MultiSelect from "primevue/multiselect";
import Select from "primevue/select";
import FormItem from "@components/FormItem/FormItem.vue";
import {
	EXCHANGE_TOKEN_OPTIONS,
	EXCHANGE_TOKEN_PERMISSION_OPTIONS,
} from "../PortfolioOverview.constants";
import { useAddTokenDialog } from "./PortfolioAddTokenDialog.composables";

const emit = defineEmits<{
	confirm: [];
}>();

const isVisible = defineModel<boolean>("isVisible", { required: true });

const {
	confirmExchangeToken,
	isSavingExchangeToken,
	requiresPassphrase,
	resetTokenForm,
	supportsAccountAddress,
	supportsAddress,
	tokenForm,
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
					:options="EXCHANGE_TOKEN_OPTIONS"
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

			<FormItem label="Permissions">
				<MultiSelect
					v-model="tokenForm.permissions"
					class="w-full"
					:options="EXCHANGE_TOKEN_PERMISSION_OPTIONS"
					option-label="label"
					option-value="value"
					display="chip"
				/>
			</FormItem>

			<div class="grid grid-cols-1 gap-3 md:grid-cols-2">
				<FormItem label="API key">
					<InputText
						v-model="tokenForm.apiKey"
						class="w-full"
						autocomplete="off"
						placeholder="API key"
					/>
				</FormItem>

				<FormItem label="API secret">
					<InputText
						v-model="tokenForm.apiSecret"
						class="w-full"
						autocomplete="off"
						placeholder="Secret key"
						type="password"
					/>
				</FormItem>
			</div>

			<FormItem
				v-if="requiresPassphrase"
				label="Passphrase"
			>
				<InputText
					v-model="tokenForm.passphrase"
					class="w-full"
					autocomplete="off"
					placeholder="OKX passphrase"
					type="password"
				/>
			</FormItem>

			<FormItem
				v-if="supportsAddress"
				label="Account address"
			>
				<InputText
					v-model="tokenForm.address"
					class="w-full"
					placeholder="0x..."
				/>
			</FormItem>

			<FormItem
				v-if="supportsAccountAddress"
				label="Pacifica account"
			>
				<InputText
					v-model="tokenForm.accountAddress"
					class="w-full"
					placeholder="Account address"
				/>
			</FormItem>

			<FormItem label="Expires at">
				<InputText
					v-model="tokenForm.expiresAt"
					class="w-full"
					placeholder="2026-12-31"
					type="date"
				/>
			</FormItem>

			<p class="m-0 text-xs text-[var(--kvex-text-muted-color)]">
				Base tokens should grant balances. Trades and order permissions are stored for future workflows but are not used by KVEX yet.
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
					:loading="isSavingExchangeToken"
					@click="saveToken"
				/>
			</div>
		</template>
	</Dialog>
</template>
