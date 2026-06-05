/** Converts optional string or numeric inputs to finite numbers, preserving missing values as undefined. */
export const normalizeOptionalNumber = (
	value?: string | number | null,
): number | undefined => {
	if (value === undefined || value === null) {
		return undefined;
	}

	const numberValue = Number(value);

	return Number.isNaN(numberValue) ? undefined : numberValue;
};
