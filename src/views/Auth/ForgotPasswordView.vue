<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Message from "primevue/message";
import { authApi } from "@api/auth";
import { ROUTES } from "@router";

const login = ref("");
const errorMessage = ref("");
const isSubmitting = ref(false);
const isSubmitted = ref(false);

const submitResetRequest = async () => {
	errorMessage.value = "";
	isSubmitting.value = true;

	try {
		await authApi.requestPasswordReset(login.value);
		isSubmitted.value = true;
	} catch (error) {
		errorMessage.value = error instanceof Error
			? error.message
			: "Unable to request password reset";
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
				:to="{ name: ROUTES.AUTH_LOGIN }"
			>
				<span>KVEX</span>
			</router-link>

			<section class="kvex-auth-surface rounded-xl border border-[var(--kvex-panel-border)] bg-[var(--kvex-panel-background)] p-8 shadow-sm">
				<div class="mb-8 text-center">
					<h1 class="m-0 text-3xl font-bold text-[var(--kvex-symbol-color)]">
						Reset password
					</h1>
					<p class="m-0 mt-3 text-sm text-[var(--kvex-text-muted-color)]">
						Enter your login to start a password reset.
					</p>
				</div>

				<Message
					v-if="isSubmitted"
					class="mb-5"
					severity="success"
					:closable="false"
				>
					If the account exists, a reset token has been created for the configured recovery channel.
				</Message>

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
					@submit.prevent="submitResetRequest"
				>
					<label class="flex flex-col gap-2">
						<span class="font-semibold text-[var(--kvex-text-color)]">Login</span>
						<InputText
							v-model="login"
							autocomplete="username"
							placeholder="trader"
						/>
					</label>

					<Button
						class="mt-2 w-full"
						label="Request Reset"
						:loading="isSubmitting"
						type="submit"
					/>
				</form>

				<p class="m-0 mt-8 text-center text-sm text-[var(--kvex-text-muted-color)]">
					<router-link :to="{ name: ROUTES.AUTH_LOGIN }">
						Back to sign in
					</router-link>
				</p>
			</section>
		</div>
	</main>
</template>
