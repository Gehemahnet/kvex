export const ACTIVE_EXCHANGES_SPREADS_LOCAL_STORAGE_KEY = "spreads-active-exchanges";
export const MIN_SPREAD_PERCENT_LOCAL_STORAGE_KEY = "spreads-min-spread-percent";

export const DEFAULT_MIN_SPREAD_PERCENT = -Infinity; // Show all spreads by default

export const SPREAD_FILTERS = [
	{ label: "All spreads", value: -Infinity },
	{ label: "> -1%", value: -1 },
	{ label: "> 0%", value: 0 },
	{ label: "> 0.1%", value: 0.1 },
	{ label: "> 0.5%", value: 0.5 },
	{ label: "> 1%", value: 1 },
] as const;
