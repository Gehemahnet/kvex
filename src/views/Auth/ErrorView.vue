<script setup lang="ts">
import Button from "primevue/button";
import { ROUTES } from "../../router";
</script>

<template>
	<main class="grid min-h-screen place-items-center bg-[var(--kvex-app-background)] px-6 py-8 text-[var(--kvex-text-color)]">
		<section class="w-full max-w-[34rem] rounded-xl border border-[var(--kvex-panel-border)] bg-[var(--kvex-panel-background)] p-8 text-center shadow-sm">
			<div class="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-full bg-[var(--kvex-danger-background)] text-[var(--kvex-danger-color)]">
				<i class="pi pi-exclamation-triangle text-3xl" />
			</div>
			<h1 class="m-0 text-3xl font-bold text-[var(--kvex-symbol-color)]">
				Something went wrong
			</h1>
			<p class="mx-auto mb-0 mt-3 max-w-[26rem] text-sm text-[var(--kvex-text-muted-color)]">
				The requested page or action could not be completed. Return to the workspace and try again.
			</p>
			<Button
				class="mt-8"
				label="Back to Funding"
				@click="$router.push({ name: ROUTES.FUNDING_OVERVIEW })"
			/>
		</section>
	</main>
</template>
