<script setup lang="ts">
import Card from "primevue/card";

defineProps<{
	assetsCount: number;
	balancesCount: number;
	exchangeAccountsCount: number;
	totalValueLabel: string;
	walletSourcesCount: number;
}>();
</script>

<template>
	<Card>
		<template #content>
			<div class="flex flex-wrap items-start justify-between gap-4">
				<div>
					<p class="m-0 text-sm font-medium text-[var(--kvex-text-muted-color)]">
						Estimated total value
					</p>
					<div class="mt-2 flex items-end gap-2">
						<span class="text-4xl font-bold tracking-normal text-[var(--kvex-symbol-color)]">
							{{ totalValueLabel }}
						</span>
						<span class="pb-1 text-sm font-semibold text-[var(--kvex-text-muted-color)]">
							USD
						</span>
					</div>
					<p class="m-0 mt-2 text-sm text-[var(--kvex-text-muted-color)]">
						Best-effort USD prices are shown when a symbol quote is available.
					</p>
				</div>

				<div class="flex min-w-52 flex-col items-end gap-2 text-right">
					<span class="rounded-full bg-[var(--kvex-panel-muted-background)] px-3 py-1 text-sm font-bold text-[var(--kvex-accent-color)]">
						{{ assetsCount }} priced assets
					</span>
					<span class="text-xs text-[var(--kvex-text-muted-color)]">
						{{ balancesCount }} balances / {{ walletSourcesCount }} wallets / {{ exchangeAccountsCount }} exchanges
					</span>
				</div>
			</div>
		</template>
	</Card>
</template>
