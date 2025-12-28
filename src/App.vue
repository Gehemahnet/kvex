<template>
  <header>
    <Menubar :model="navigationItems">
      <template #item="{item}">
        <router-link :to="{name: item.route}">
          {{item.label}}
        </router-link>
      </template>
    </Menubar>
  </header>
  <main>
    <RouterView />
  </main>
</template>
<script setup lang="ts">
import { Menubar } from "primevue";
import type { MenuItem } from "primevue/menuitem";
import { ROUTES } from "./router";

const navigationItems: MenuItem[] = [
	{
		label: "Home",
		route: ROUTES.GATEWAY,
	},

	{
		label: "Funding overview",
		route: ROUTES.FUNDING_OVERVIEW,
	},
	{
		label: "Spreads",
		route: ROUTES.SPREADS,
	},
];
</script>