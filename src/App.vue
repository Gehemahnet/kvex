<template>
	<Toast />
	<RouterView v-if="isStandaloneRoute" />
	<div
		v-else
		class="min-h-screen bg-[var(--kvex-app-background)] text-[var(--kvex-text-color)]"
	>
		<header class="fixed inset-x-0 top-0 z-20 flex h-[var(--kvex-topbar-height)] items-center justify-between border-b border-[var(--kvex-shell-border)] bg-[var(--kvex-topbar-background)] px-6 max-lg:px-4">
			<div class="flex min-w-0 items-center gap-3">
				<button
					class="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-[var(--kvex-panel-border)] bg-[var(--kvex-panel-muted-background)] px-3 py-0 text-sm font-semibold text-[var(--kvex-text-color)] hover:bg-[var(--kvex-panel-hover-background)]"
					type="button"
					:aria-expanded="isSidebarOpen"
					@click="toggleSidebar"
				>
					<i class="pi pi-bars text-base" />
				</button>
				<router-link
					class="inline-flex items-center gap-3 text-xl font-bold text-[var(--kvex-symbol-color)] no-underline"
					:to="{ name: ROUTES.FUNDING_OVERVIEW }"
				>
					<span class="grid h-[2.125rem] w-[2.125rem] place-items-center rounded-full bg-[var(--kvex-logo-background)] text-sm font-bold text-white">
						K
					</span>
					<span>KVEX</span>
				</router-link>
			</div>

			<div class="flex items-center gap-2">
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

				<button
					v-if="authState"
					class="grid h-10 w-10 cursor-pointer place-items-center rounded-full border border-[var(--kvex-panel-border)] bg-[var(--kvex-panel-muted-background)] text-[var(--kvex-text-color)] shadow-sm hover:bg-[var(--kvex-panel-hover-background)]"
					type="button"
					aria-label="User menu"
					@click="toggleUserMenu"
				>
					<i class="pi pi-user text-lg" />
				</button>
				<Button
					v-else-if="authStatus !== 'loading'"
					icon="pi pi-sign-in"
					label="Login"
					@click="goToLogin"
				/>
				<Button
					v-else
					icon="pi pi-user"
					label="Checking"
					loading
					disabled
				/>
			</div>

			<Popover
				v-if="authState"
				ref="userMenuPopover"
				class="kvex-user-popover"
			>
				<div class="flex min-w-56 flex-col gap-3">
					<div class="border-b border-[var(--kvex-panel-border)] pb-3">
						<span class="block text-sm font-bold text-[var(--kvex-symbol-color)]">
							{{ authState.user.login }}
						</span>
						<span
							v-if="authState.user.email"
							class="block text-xs text-[var(--kvex-text-muted-color)]"
						>
							{{ authState.user.email }}
						</span>
					</div>

					<Button
						class="w-full justify-start"
						icon="pi pi-wallet"
						label="Portfolio"
						severity="secondary"
						text
						@click="goToPortfolio"
					/>

					<Button
						class="w-full justify-start"
						icon="pi pi-sign-out"
						label="Logout"
						severity="secondary"
						text
						@click="logout"
					/>
				</div>
			</Popover>
		</header>

		<aside
			class="fixed bottom-0 left-0 top-[var(--kvex-topbar-height)] z-10 w-[var(--kvex-sidebar-width)] overflow-auto border-r border-[var(--kvex-shell-border)] bg-[var(--kvex-panel-background)] px-4 py-6 transition-transform duration-200 max-lg:z-30 max-lg:w-[min(var(--kvex-sidebar-width),80vw)]"
			:class="{ '-translate-x-full': !isSidebarOpen }"
		>
			<nav
				class="flex w-full flex-col gap-2"
				aria-label="Main navigation"
			>
				<span class="px-3 text-[0.714rem] font-bold uppercase text-[var(--kvex-text-muted-color)]">
					Home
				</span>
				<router-link
					class="flex w-full items-center gap-2.5 rounded-md px-3.5 py-3 text-sm font-bold text-[var(--kvex-text-muted-color)] hover:bg-[var(--kvex-panel-hover-background)] hover:text-[var(--kvex-accent-color)] [&.router-link-active]:bg-[var(--kvex-panel-hover-background)] [&.router-link-active]:text-[var(--kvex-accent-color)]"
					:to="{ name: ROUTES.FUNDING_OVERVIEW }"
				>
					<span class="h-3 w-3 rounded-[3px] border border-current" />
					<span>Funding</span>
				</router-link>
				<router-link
					class="flex w-full items-center gap-2.5 rounded-md px-3.5 py-3 text-sm font-bold text-[var(--kvex-text-muted-color)] hover:bg-[var(--kvex-panel-hover-background)] hover:text-[var(--kvex-accent-color)] [&.router-link-active]:bg-[var(--kvex-panel-hover-background)] [&.router-link-active]:text-[var(--kvex-accent-color)]"
					:to="{ name: ROUTES.SPREADS_OVERVIEW }"
				>
					<span class="h-3 w-3 rounded-full border border-current" />
					<span>Spreads</span>
				</router-link>
			</nav>
		</aside>

		<main
			class="mt-[var(--kvex-topbar-height)] min-h-[calc(100vh-var(--kvex-topbar-height))] px-8 pb-8 pt-8 transition-[margin-left] duration-200 max-lg:px-4 max-lg:pb-4 max-lg:pt-4"
			:style="{ marginLeft: mainMarginLeft }"
		>
			<div>
				<RouterView />
			</div>
		</main>
	</div>
</template>
<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import Button from "primevue/button";
import Popover from "primevue/popover";
import Toast from "primevue/toast";
import { authApi } from "@api/auth";
import { ROUTES } from "./router";
import { useAuthSession } from "./views/Auth/Auth.composable";
import { useThemeMode } from "./theme/theme.composable";

const route = useRoute();
const router = useRouter();
const { themeMode } = useThemeMode();
const {
	authState,
	authStatus,
	clearAuthSession,
	refreshAuthSession,
	restoreAuthSession,
} = useAuthSession();
const desktopMediaQuery = window.matchMedia("(min-width: 1025px)");
const isDesktopViewport = ref(desktopMediaQuery.matches);
const isSidebarOpen = ref(isDesktopViewport.value);
const userMenuPopover = ref<{
	hide: () => void;
	toggle: (event: Event) => void;
} | null>(null);
let sessionRefreshTimeoutId: number | undefined;

const themeToggleLabel = computed(() =>
	themeMode.value === "dark" ? "Switch to light theme" : "Switch to dark theme",
);
const mainMarginLeft = computed(() =>
	isSidebarOpen.value && isDesktopViewport.value
		? "var(--kvex-sidebar-width)"
		: "0",
);
const isStandaloneRoute = computed(() => route.meta.standalone === true);

const toggleSidebar = () => {
	isSidebarOpen.value = !isSidebarOpen.value;
};

const toggleThemeMode = () => {
	themeMode.value = themeMode.value === "dark" ? "light" : "dark";
};

const toggleUserMenu = (event: Event) => {
	userMenuPopover.value?.toggle(event);
};

const logout = async () => {
	const csrfToken = authState.value?.csrfToken;

	if (csrfToken !== undefined) {
		await authApi.logout(csrfToken).catch(() => undefined);
	}

	clearSessionRefreshTimeout();
	clearAuthSession();
	userMenuPopover.value?.hide();
	await router.push({ name: ROUTES.AUTH_LOGIN });
};

const goToLogin = async () => {
	userMenuPopover.value?.hide();
	await router.push({ name: ROUTES.AUTH_LOGIN });
};

const goToPortfolio = async () => {
	userMenuPopover.value?.hide();
	await router.push({ name: ROUTES.PORTFOLIO_OVERVIEW });
};

const handleDesktopViewportChange = (event: MediaQueryListEvent) => {
	isDesktopViewport.value = event.matches;
};

desktopMediaQuery.addEventListener("change", handleDesktopViewportChange);

onMounted(() => {
	void restoreAuthSession();
});

watch(
	() => authState.value?.expiresAt,
	() => {
		scheduleSessionRefresh();
	},
);

onBeforeUnmount(() => {
	clearSessionRefreshTimeout();
	desktopMediaQuery.removeEventListener("change", handleDesktopViewportChange);
});

const scheduleSessionRefresh = () => {
	clearSessionRefreshTimeout();

	if (authState.value === null) {
		return;
	}

	const expiresAt = Date.parse(authState.value.expiresAt);
	const delayMs = Math.max(expiresAt - Date.now() - 60_000, 5_000);

	sessionRefreshTimeoutId = window.setTimeout(async () => {
		if (await refreshAuthSession()) {
			scheduleSessionRefresh();
		}
	}, delayMs);
};

const clearSessionRefreshTimeout = () => {
	if (sessionRefreshTimeoutId !== undefined) {
		window.clearTimeout(sessionRefreshTimeoutId);
		sessionRefreshTimeoutId = undefined;
	}
};
</script>
