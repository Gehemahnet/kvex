import {
	DEFAULT_THEME_MODE,
	type ThemeMode,
} from "./theme.constants";

/** Checks whether a persisted value is one of the supported theme modes. */
export const isThemeMode = (value: unknown): value is ThemeMode =>
	value === "light" || value === "dark";

/** Falls back to the default theme when localStorage contains stale data. */
export const normalizeThemeMode = (mode: unknown): ThemeMode =>
	isThemeMode(mode) ? mode : DEFAULT_THEME_MODE;
