import { createApp } from "vue";
import "./style.css";
import Aura from "@primeuix/themes/aura";
import { VueQueryPlugin } from "@tanstack/vue-query";
import PrimeVue from "primevue/config";
import App from "./App.vue";
import { router } from "./router";

const app = createApp(App);
app
	.use(PrimeVue, {
		theme: {
			preset: Aura,
			options: {
				prefix: "p",
				darkModeSelector: "system",
				cssLayer: false,
			},
		},
	})
	.use(router)
	.use(VueQueryPlugin)
	.mount("#app");
