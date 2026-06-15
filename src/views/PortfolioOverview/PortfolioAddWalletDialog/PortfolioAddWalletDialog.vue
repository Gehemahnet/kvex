<script setup lang="ts">
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import Select from "primevue/select";
import Textarea from "primevue/textarea";
import FormItem from "@components/FormItem/FormItem.vue";
import {
  DIALOG_HINTS,
  WALLET_NETWORK_OPTIONS
} from "@views/PortfolioOverview/PortfolioAddWalletDialog/PortfolioAddWalletDialog.constants";
import {
  useAddWalletDialog
} from "@views/PortfolioOverview/PortfolioAddWalletDialog/PortfolioAddWalletDialog.composables";

const emit = defineEmits<{
  confirm: [];
}>();


const closeWalletDialog = () => {
  walletForm.value.addresses = ''
  isVisible.value = false;
}

const saveWallets = async () => {
  try {
    await confirmWalletAddresses();
    emit('confirm');
    closeWalletDialog();
  } catch (error) {

  }
}

const isVisible = defineModel<boolean>("isVisible",{required: true})
const {walletValidation, walletForm, activeWalletNetwork,  setWalletNetwork, confirmWalletAddresses} = useAddWalletDialog()
</script>

<template>
  <Dialog
      v-model:visible="isVisible"
      header="Add wallet to check"
      modal
      class="w-[min(34rem,calc(100vw-2rem))]"
  >
    <div class="flex flex-col gap-3">
      <FormItem label="Network">
        <Select
            id="portfolio-wallet-network"
            :model-value="activeWalletNetwork"
            class="w-full"
            :options="WALLET_NETWORK_OPTIONS"
            option-label="label"
            option-value="value"
            @update:model-value="setWalletNetwork"
        />
      </FormItem>
      <FormItem
          :error-message="walletValidation.addresses.$errors[0]?.$message"
          label="Wallet addresses"
      >
        			<Textarea
                  id="portfolio-wallets"
                  v-model="walletForm.addresses"
                  class="w-full"
                  :class="{ 'p-invalid': walletValidation.addresses.$error }"
                  auto-resize
                  rows="6"
                  placeholder="Enter wallet address for current chain"
                  @blur="walletValidation.addresses.$touch()"
              />
      </FormItem>
      <p class="m-0 text-xs text-[var(--kvex-text-muted-color)]">
        {{ DIALOG_HINTS[activeWalletNetwork] }}
      </p>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button
            label="Cancel"
            severity="secondary"
            @click="closeWalletDialog"
        />
        <Button
            icon="pi pi-check"
            label="Apply"
            @click="saveWallets"
        />
      </div>
    </template>
  </Dialog>
</template>
