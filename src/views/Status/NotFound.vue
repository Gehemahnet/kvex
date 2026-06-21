<script setup lang="ts">
import Button from "primevue/button";
import { ROUTES } from "@router";
import StatusPage from "./StatusPage.vue";
</script>

<template>
	<StatusPage
		code="404"
		description="The requested page does not exist or may have been moved."
		icon="pi pi-compass"
		title="Not Found"
	>
		<Button
			icon="pi pi-arrow-left"
			label="Go to dashboard"
			@click="$router.replace({ name: ROUTES.FUNDING_OVERVIEW })"
		/>
	</StatusPage>
</template>
