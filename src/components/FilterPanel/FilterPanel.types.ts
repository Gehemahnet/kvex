export type FilterPanelButtonSize = "small" | "large";

export type FilterPanelConfig = {
	activeFilterCount?: number;
	buttonClass?: string;
	buttonLabel?: string;
	buttonSize?: FilterPanelButtonSize;
	description?: string;
	onApply: () => void;
	onBeforeOpen?: () => void;
	onReset: () => void;
	panelClass?: string;
	title: string;
};
