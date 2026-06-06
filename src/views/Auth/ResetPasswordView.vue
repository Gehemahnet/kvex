<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import Button from "primevue/button";
import Message from "primevue/message";
import Password from "primevue/password";
import { ROUTES } from "../../router";
import { confirmPasswordReset } from "./Auth.api";

const route = useRoute();
const router = useRouter();
const password = ref("");
const errorMessage = ref("");
const isSubmitting = ref(false);
const isSubmitted = ref(false);
const token = computed(() => String(route.query.token ?? ""));

const submitPasswordReset = async () => {
	errorMessage.value = "";
	isSubmitting.value = true;

	try {
		await confirmPasswordReset({
			token: token.value,
			password: password.value,
		});
		isSubmitted.value = true;
	} catch (error) {
		errorMessage.value = error instanceof Error
			? error.message
			: "Unable to reset password";
	} finally {
		isSubmitting.value = false;
	}
};
</script>

<template>
	<main class="min-h-screen bg-[var(--kvex-app-background)] px-6 py-8 text-[var(--kvex-text-color)]">
		<div class="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-[32rem] flex-col justify-center">
			<section class="kvex-auth-surface rounded-xl border border-[var(--kvex-panel-border)] bg-[var(--kvex-panel-background)] p-8 shadow-sm">
				<div class="mb-8 text-center">
					<h1 class="m-0 text-3xl font-bold text-[var(--kvex-symbol-color)]">
						Set new password
					</h1>
					<p class="m-0 mt-3 text-sm text-[var(--kvex-text-muted-color)]">
						Use your one-time reset token to set a new password.
					</p>
				</div>

				<Message
					v-if="!token"
					class="mb-5"
					severity="warn"
					:closable="false"
				>
					Reset token is missing.
				</Message>

				<Message
					v-if="isSubmitted"
					class="mb-5"
					severity="success"
					:closable="false"
				>
					Password updated. You can sign in with the new password.
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
					v-if="!isSubmitted"
					class="flex flex-col gap-5"
					@submit.prevent="submitPasswordReset"
				>
					<label class="flex flex-col gap-2">
						<span class="font-semibold text-[var(--kvex-text-color)]">New password</span>
						<Password
							v-model="password"
							autocomplete="new-password"
							placeholder="At least 8 characters"
							toggle-mask
						/>
					</label>

					<Button
						class="mt-2 w-full"
						label="Update Password"
						:disabled="!token"
						:loading="isSubmitting"
						type="submit"
					/>
				</form>

				<Button
					v-else
					class="mt-2 w-full"
					label="Back to Sign In"
					@click="router.push({ name: ROUTES.AUTH_LOGIN })"
				/>
			</section>
		</div>
	</main>
</template>
