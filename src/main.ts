import { createApp } from "vue";
import "./style.css";
import { definePreset } from "@primeuix/themes";
import Aura from "@primeuix/themes/aura";
import { VueQueryPlugin } from "@tanstack/vue-query";
import PrimeVue from "primevue/config";
import App from "./App.vue";
import { router } from "./router";

export const EtherealPreset = definePreset(Aura, {
	semantic: {
		colorScheme: {
			dark: {
				/* === PRIMARY (Brand Blue) === */
				primary: {
					color: "#428898",
					hoverColor: "#4F9EAF",
					activeColor: "#35707D",
					inverseColor: "#F6F6F6",
				},

				/* === SURFACES === */
				surface: {
					0: "#0C1418", // app background
					50: "#111A1F", // panels
					100: "#172228", // cards
					200: "#1E2A31",
					300: "#27343C",
					400: "#33424B",
				},

				/* === TEXT === */
				text: {
					color: "#F6F6F6",
					mutedColor: "#99A0AE",
					hoverColor: "#FFFFFF",
				},

				/* === BORDERS === */
				border: {
					color: "#27343C",
				},

				/* === HIGHLIGHT / FOCUS === */
				highlight: {
					background: "rgba(66,136,152,0.16)",
					focusBackground: "rgba(66,136,152,0.24)",
					color: "#F6F6F6",
				},

				/* === OVERLAYS === */
				mask: {
					background: "rgba(0,0,0,0.6)",
				},

				/* === STATUS COLORS (Added) === */
				success: {
					color: "#34D399", // Emerald-400
					inverseColor: "#064E3B",
					hoverColor: "#10B981",
					activeColor: "#059669",
				},
				error: {
					color: "#F87171", // Red-400
					inverseColor: "#7F1D1D",
					hoverColor: "#EF4444",
					activeColor: "#DC2626",
				},
				warn: {
					color: "#FBBF24", // Amber-400
					inverseColor: "#78350F",
					hoverColor: "#F59E0B",
					activeColor: "#D97706",
				},
				info: {
					color: "#60A5FA", // Blue-400
					inverseColor: "#1E3A8A",
					hoverColor: "#3B82F6",
					activeColor: "#2563EB",
				},
			},
		},
	},
});

const app = createApp(App);
app
	.use(PrimeVue, {
		theme: {
			preset: EtherealPreset,
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
