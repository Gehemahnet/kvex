<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Message from "primevue/message";
import Password from "primevue/password";
import { authApi } from "@api/auth";
import { ROUTES } from "@router";
import { useAuthSession } from "./Auth.composable";

const router = useRouter();
const { setAuthSession } = useAuthSession();
const email = ref("");
const login = ref("");
const password = ref("");
const errorMessage = ref("");
const isSubmitting = ref(false);

const submitRegistration = async () => {
	errorMessage.value = "";
	isSubmitting.value = true;

	try {
		const authResponse = await authApi.register({
			email: email.value,
			login: login.value,
			password: password.value,
		});

		setAuthSession(authResponse);
		await router.push({ name: ROUTES.SPREADS_OVERVIEW });
	} catch (error) {
		errorMessage.value = error instanceof Error
			? error.message
			: "Unable to create account";
	} finally {
		isSubmitting.value = false;
	}
};
</script>

<template>
	<main class="min-h-screen bg-[var(--kvex-app-background)] px-6 py-8 text-[var(--kvex-text-color)]">
		<div class="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-[32rem] flex-col justify-center">
			<router-link
				class="mb-8 inline-flex items-center gap-3 text-xl font-bold text-[var(--kvex-symbol-color)] no-underline"
				:to="{ name: ROUTES.FUNDING_OVERVIEW }"
			>
				<span>KVEX</span>
			</router-link>

			<section class="kvex-auth-surface rounded-xl border border-[var(--kvex-panel-border)] bg-[var(--kvex-panel-background)] p-8 shadow-sm">
				<div class="mb-8 text-center">
					<h1 class="m-0 text-3xl font-bold text-[var(--kvex-symbol-color)]">
						Create account
					</h1>
					<p class="m-0 mt-3 text-sm text-[var(--kvex-text-muted-color)]">
						Start with read-only exchange data. Trading stays disabled.
					</p>
				</div>

				<Message
					v-if="errorMessage"
					class="mb-5"
					severity="error"
					:closable="false"
				>
					{{ errorMessage }}
				</Message>

				<form
					class="flex flex-col gap-5"
					@submit.prevent="submitRegistration"
				>
					<label class="flex flex-col gap-2">
						<span class="font-semibold text-[var(--kvex-text-color)]">Login</span>
						<InputText
							v-model="login"
							autocomplete="username"
							placeholder="trader"
						/>
					</label>

					<label class="flex flex-col gap-2">
						<span class="font-semibold text-[var(--kvex-text-color)]">Email</span>
						<InputText
							v-model="email"
							autocomplete="email"
							placeholder="you@example.com"
							type="email"
						/>
					</label>

					<label class="flex flex-col gap-2">
						<span class="font-semibold text-[var(--kvex-text-color)]">Password</span>
						<Password
							v-model="password"
							autocomplete="new-password"
							placeholder="At least 8 characters"
							toggle-mask
						/>
					</label>

					<Button
						class="mt-2 w-full"
						label="Create Account"
						:loading="isSubmitting"
						type="submit"
					/>
				</form>

				<p class="m-0 mt-8 text-center text-sm text-[var(--kvex-text-muted-color)]">
					Already have an account?
					<router-link :to="{ name: ROUTES.AUTH_LOGIN }">
						Sign in
					</router-link>
				</p>
			</section>
		</div>
	</main>
</template>
