import { useLocalStorage, type RemovableRef } from "@vueuse/core";

/**
 * Creates a VueUse localStorage ref and resets it to the default value when the
 * persisted payload no longer matches the expected shape.
 */
export const useValidatedLocalStorage = <T>(
	key: string,
	defaultValue: T,
	isValid: (value: unknown) => value is T,
): RemovableRef<T> => {
	const state = useLocalStorage<T>(key, defaultValue);

	if (!isValid(state.value)) {
		state.value = defaultValue;
	}

	return state;
};
