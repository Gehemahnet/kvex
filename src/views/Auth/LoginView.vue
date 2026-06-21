<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Message from "primevue/message";
import Password from "primevue/password";
import { authApi } from "@api/auth";
import { ROUTES } from "@router";
import { useThemeMode } from "@theme/theme.composable";
import { useAuthSession } from "./Auth.composable";

const router = useRouter();
const route = useRoute();
const { themeMode } = useThemeMode();
const { setAuthSession } = useAuthSession();
const login = ref("");
const password = ref("");
const errorMessage = ref("");
const isSubmitting = ref(false);

const themeToggleLabel = computed(() =>
	themeMode.value === "dark" ? "Switch to light theme" : "Switch to dark theme",
);

const toggleThemeMode = () => {
	themeMode.value = themeMode.value === "dark" ? "light" : "dark";
};

const submitLogin = async () => {
	errorMessage.value = "";
	isSubmitting.value = true;
	const redirectTarget = getLoginRedirectTarget();

	try {
		const authResponse = await authApi.login({
			login: login.value,
			password: password.value,
		});

		setAuthSession(authResponse);
		await router.replace(redirectTarget);
	} catch (error) {
		errorMessage.value = error instanceof Error
			? error.message
			: "Unable to sign in";
	} finally {
		isSubmitting.value = false;
	}
};

const getLoginRedirectTarget = () => {
	const redirect = route.query.redirect;

	return typeof redirect === "string" && redirect.startsWith("/")
		? redirect
		: { name: ROUTES.SPREADS_OVERVIEW };
};
</script>

<template>
	<main class="min-h-screen bg-[var(--kvex-app-background)] px-6 py-8 text-[var(--kvex-text-color)]">
		<div class="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-[32rem] flex-col justify-center">
			<div class="mb-8 flex items-center justify-between">
				<router-link
					class="inline-flex items-center gap-3 text-xl font-bold text-[var(--kvex-symbol-color)] no-underline"
					:to="{ name: ROUTES.FUNDING_OVERVIEW }"
				>
					<span>KVEX</span>
				</router-link>

				<button
					class="grid h-10 w-10 cursor-pointer place-items-center rounded-full border border-[var(--kvex-panel-border)] bg-[var(--kvex-panel-muted-background)] text-[var(--kvex-text-color)] shadow-sm hover:bg-[var(--kvex-panel-hover-background)]"
					type="button"
					:aria-label="themeToggleLabel"
					@click="toggleThemeMode"
				>
					<i
						class="text-lg"
						:class="themeMode === 'dark' ? 'pi pi-moon' : 'pi pi-sun'"
					/>
				</button>
			</div>

			<section class="kvex-auth-surface rounded-xl border border-[var(--kvex-panel-border)] bg-[var(--kvex-panel-background)] p-8 shadow-sm">
				<div class="mb-8 text-center">
					<h1 class="m-0 text-3xl font-bold text-[var(--kvex-symbol-color)]">
						Welcome back
					</h1>
					<p class="m-0 mt-3 text-sm text-[var(--kvex-text-muted-color)]">
						Sign in to manage read-only exchange profiles.
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
					@submit.prevent="submitLogin"
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
						<span class="flex items-center justify-between gap-3 font-semibold text-[var(--kvex-text-color)]">
							<span>Password</span>
							<router-link
								class="text-xs"
								:to="{ name: ROUTES.AUTH_FORGOT_PASSWORD }"
							>
								Forgot password?
							</router-link>
						</span>
						<Password
							v-model="password"
							autocomplete="current-password"
							:feedback="false"
							placeholder="Password"
							toggle-mask
						/>
					</label>

					<Button
						class="mt-2 w-full"
						label="Sign In"
						:loading="isSubmitting"
						type="submit"
					/>
				</form>

				<p class="m-0 mt-8 text-center text-sm text-[var(--kvex-text-muted-color)]">
					No account yet?
					<router-link :to="{ name: ROUTES.AUTH_REGISTER }">
						Create one
					</router-link>
				</p>
			</section>
		</div>
	</main>
</template>
