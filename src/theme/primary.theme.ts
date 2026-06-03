import { definePreset } from "@primeuix/themes";
import Lara from "@primeuix/themes/lara";

export const PrimaryPreset = definePreset(Lara, {
	semantic: {
		primary: {
			50: "#ecfdf5",
			100: "#d1fae5",
			200: "#a7f3d0",
			300: "#6ee7b7",
			400: "#34d399",
			500: "#10b981",
			600: "#059669",
			700: "#047857",
			800: "#065f46",
			900: "#064e3b",
			950: "#022c22",
		},
		colorScheme: {
			light: {
				primary: {
					color: "#10b981",
					hoverColor: "#059669",
					activeColor: "#047857",
					inverseColor: "#ffffff",
				},
				surface: {
					0: "#ffffff",
					50: "#f8fafc",
					100: "#f1f5f9",
					200: "#e2e8f0",
					300: "#cbd5e1",
					400: "#94a3b8",
					500: "#64748b",
					600: "#475569",
					700: "#334155",
					800: "#1e293b",
					900: "#0f172a",
				},
				text: {
					color: "#334155",
					mutedColor: "#64748b",
					hoverColor: "#0f172a",
				},
				border: {
					color: "#e2e8f0",
				},
				highlight: {
					background: "#ecfdf5",
					focusBackground: "#d1fae5",
					color: "#047857",
				},
			},
			dark: {
				primary: {
					color: "#34d399",
					hoverColor: "#6ee7b7",
					activeColor: "#a7f3d0",
					inverseColor: "#09090b",
				},
				surface: {
					0: "#09090b",
					50: "#18181b",
					100: "#18181b",
					200: "#27272a",
					300: "#3f3f46",
					400: "#52525b",
					500: "#71717a",
					600: "#a1a1aa",
					700: "#d4d4d8",
					800: "#e4e4e7",
					900: "#fafafa",
				},
				text: {
					color: "#f4f4f5",
					mutedColor: "#a1a1aa",
					hoverColor: "#ffffff",
				},
				border: {
					color: "#27272a",
				},
				highlight: {
					background: "rgba(16, 185, 129, 0.16)",
					focusBackground: "rgba(16, 185, 129, 0.22)",
					color: "#34d399",
				},
			},
		},
	},
});
