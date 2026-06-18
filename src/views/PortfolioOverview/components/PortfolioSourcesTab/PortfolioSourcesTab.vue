<script setup lang="ts">
import ExchangeTokensTable from "./ExchangeTokensTable.vue";
import WalletSourcesTable from "./WalletSourcesTable.vue";
import {usePortfolioSourcesTab} from "./PortfolioSourcesTab.composables";

const {
  canSaveExchangeTokenLabel,
  confirmExchangeTokenDelete,
  confirmExchangeTokenLabel,
  confirmWalletSourceDelete,
  exchangeTokenRows,
  isDeleteExchangeTokenDialogVisible,
  isDeleteWalletSourceDialogVisible,
  isDeletingExchangeToken,
  isEditExchangeTokenDialogVisible,
  isEditingExchangeToken,
  isTokenDialogVisible,
  isWalletDialogVisible,
  isSavingWalletSource,
  openDeleteExchangeTokenDialog,
  openDeleteWalletSourceDialog,
  openEditExchangeTokenDialog,
  refreshPortfolioTables,
  tokenDeleteCandidate,
  tokenEditCandidate,
  tokenLabelDraft,
  walletDeleteCandidate,
  walletSourceRows,
} = usePortfolioSourcesTab();

</script>

<template>
  <WalletSourcesTable
      v-model:isAddWalletVisible="isWalletDialogVisible"
      v-model:isDeleteWalletVisible="isDeleteWalletSourceDialogVisible"
      :delete-source="walletDeleteCandidate"
      :is-saving="isSavingWalletSource"
      :is-deleting="isSavingWalletSource"
      :rows="walletSourceRows"
      @add-confirm="refreshPortfolioTables"
      @delete="openDeleteWalletSourceDialog"
      @delete-confirm="confirmWalletSourceDelete"
  />

  <ExchangeTokensTable
      v-model:isAddTokenVisible="isTokenDialogVisible"
      v-model:isDeleteTokenVisible="isDeleteExchangeTokenDialogVisible"
      v-model:isEditTokenVisible="isEditExchangeTokenDialogVisible"
      v-model:label="tokenLabelDraft"
      :can-save-label="canSaveExchangeTokenLabel"
      :delete-token="tokenDeleteCandidate"
      :edit-token="tokenEditCandidate"
      :is-deleting="isDeletingExchangeToken"
      :is-saving="isSavingWalletSource"
      :is-saving-label="isEditingExchangeToken"
      :rows="exchangeTokenRows"
      @add-confirm="refreshPortfolioTables"
      @delete="openDeleteExchangeTokenDialog"
      @delete-confirm="confirmExchangeTokenDelete"
      @edit="openEditExchangeTokenDialog"
      @edit-confirm="confirmExchangeTokenLabel"
  />
</template>
