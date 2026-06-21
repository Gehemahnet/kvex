<script setup lang="ts">
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import Button from "primevue/button";
import { apiGet } from "@api/api-client";
import { ROUTES } from "@router";
import StatusPage from "./StatusPage.vue";

const route = useRoute();
const router = useRouter();
const isRetrying = ref(false);
const retryFailed = ref(false);

const retry = async () => {
	isRetrying.value = true;
	retryFailed.value = false;

	try {
		await apiGet<{ status: "ok" }>("/api/health");
		await router.replace(getRedirectTarget());
	} catch {
		retryFailed.value = true;
	} finally {
		isRetrying.value = false;
	}
};

const getRedirectTarget = (): string | { name: ROUTES } => {
	const redirect = route.query.redirect;

	return typeof redirect === "string"
		&& redirect.startsWith("/")
		&& !redirect.startsWith("/service-unavailable")
		? redirect
		: { name: ROUTES.FUNDING_OVERVIEW };
};
</script>

<template>
	<StatusPage
		code="503"
		description="KVEX cannot reach the backend right now. Your session is preserved; try again when the service is available."
		icon="pi pi-server"
		title="Service Unavailable"
	>
		<p
			v-if="retryFailed"
			class="m-0 mb-5 text-sm text-[var(--kvex-danger-color)]"
		>
			The backend is still unavailable.
		</p>
		<Button
			icon="pi pi-refresh"
			label="Try again"
			:loading="isRetrying"
			@click="retry"
		/>
	</StatusPage>
</template>
