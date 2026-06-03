import { createApp } from "vue";
import "./style.css";
import { VueQueryPlugin } from "@tanstack/vue-query";
import PrimeVue from "primevue/config";
import App from "./App.vue";
import { router } from "./router";
import { PrimaryPreset } from "./theme/primary.theme";

const app = createApp(App);
app
	.use(PrimeVue, {
		theme: {
			preset: PrimaryPreset,
			options: {
				prefix: "p",
				darkModeSelector: ".kvex-dark",
				cssLayer: false,
			},
		},
	})
	.use(router)
	.use(VueQueryPlugin)
	.mount("#app");
