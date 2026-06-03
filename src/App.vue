<template>
	<div
		class="min-h-screen bg-[var(--kvex-app-background)] text-[var(--kvex-text-color)]"
	>
		<header class="fixed inset-x-0 top-0 z-20 flex h-[var(--kvex-topbar-height)] items-center justify-between border-b border-[var(--kvex-shell-border)] bg-[var(--kvex-topbar-background)] px-6 max-lg:px-4">
			<div class="flex min-w-0 items-center gap-3">
				<button
					class="flex h-9 w-9 cursor-pointer flex-col items-center justify-center gap-1 rounded-full border-0 bg-transparent p-0 hover:bg-[var(--kvex-panel-hover-background)]"
					type="button"
					aria-label="Toggle navigation"
					:aria-expanded="isSidebarOpen"
					@click="toggleSidebar"
				>
					<span class="block h-0.5 w-4 rounded-full bg-[var(--kvex-text-color)]" />
					<span class="block h-0.5 w-4 rounded-full bg-[var(--kvex-text-color)]" />
					<span class="block h-0.5 w-4 rounded-full bg-[var(--kvex-text-color)]" />
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

			<div class="inline-flex items-center gap-3 rounded-full border border-[var(--kvex-panel-border)] bg-[var(--kvex-panel-muted-background)] px-3 py-2 text-sm font-semibold text-[var(--kvex-text-muted-color)]">
				<span>{{ themeModeLabel }}</span>
				<ToggleSwitch
					v-model="isDarkTheme"
					class="kvex-theme-switch"
				/>
			</div>
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
			</nav>
		</aside>

		<button
			v-if="isSidebarOpen"
			class="fixed inset-x-0 bottom-0 top-[var(--kvex-topbar-height)] z-[25] hidden border-0 bg-slate-900/35 p-0 max-lg:block"
			type="button"
			aria-label="Close navigation"
			@click="closeSidebar"
		/>

		<main
			class="ml-[var(--kvex-sidebar-width)] mt-[var(--kvex-topbar-height)] min-h-[calc(100vh-var(--kvex-topbar-height))] px-8 pb-8 pt-8 transition-[margin-left] duration-200 max-lg:ml-0 max-lg:px-4 max-lg:pb-4 max-lg:pt-4"
			:class="{ 'ml-0': !isSidebarOpen }"
		>
			<div class="max-w-[var(--kvex-content-max-width)]">
				<RouterView />
			</div>
		</main>
	</div>
</template>
<script setup lang="ts">
import { computed, ref } from "vue";
import ToggleSwitch from "primevue/toggleswitch";
import { ROUTES } from "./router";
import { useThemeMode } from "./theme/theme.composable";

const { isDarkTheme, themeMode } = useThemeMode();
const isSidebarOpen = ref(!window.matchMedia("(max-width: 1024px)").matches);

const themeModeLabel = computed(() =>
	themeMode.value === "dark" ? "Dark" : "Light",
);

const toggleSidebar = () => {
	isSidebarOpen.value = !isSidebarOpen.value;
};

const closeSidebar = () => {
	isSidebarOpen.value = false;
};
</script>
