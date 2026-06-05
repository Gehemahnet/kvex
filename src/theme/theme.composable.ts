import { computed, watch } from "vue";
import { useValidatedLocalStorage } from "../common/local-storage.utils";
import {
	DEFAULT_THEME_MODE,
	THEME_DARK_CLASS,
	THEME_MODE_LOCAL_STORAGE_KEY,
	type ThemeMode,
} from "./theme.constants";
import { isThemeMode, normalizeThemeMode } from "./theme.utils";

/** Keeps the active PrimeVue theme mode synchronized with localStorage and the document root class. */
export const useThemeMode = () => {
	const storedThemeMode = useValidatedLocalStorage<ThemeMode>(
		THEME_MODE_LOCAL_STORAGE_KEY,
		DEFAULT_THEME_MODE,
		isThemeMode,
	);

	const themeMode = computed<ThemeMode>({
		get: () => normalizeThemeMode(storedThemeMode.value),
		set: (mode) => {
			storedThemeMode.value = normalizeThemeMode(mode);
		},
	});

	const isDarkTheme = computed({
		get: () => themeMode.value === "dark",
		set: (isDark) => {
			themeMode.value = isDark ? "dark" : "light";
		},
	});

	watch(
		themeMode,
		(mode) => {
			document.documentElement.classList.toggle(
				THEME_DARK_CLASS,
				mode === "dark",
			);
		},
		{ immediate: true },
	);

	return {
		isDarkTheme,
		themeMode,
	};
};
