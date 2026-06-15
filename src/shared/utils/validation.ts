import {
	toValue,
	type MaybeRefOrGetter,
} from "vue";
import { helpers, required } from "@vuelidate/validators";
import {
	EVM_ADDRESS_PATTERN,
	SOLANA_ADDRESS_PATTERN,
} from "../constants/validation";
import type { WalletType } from "../types";
import { getItemsFromString } from "./string";

/** Returns true when a value is a valid EVM address. */
export const isEvmAddress = (value: string): boolean =>
	EVM_ADDRESS_PATTERN.test(value);

/** Returns true when a value is a base58 Solana public key. */
export const isSolanaAddress = (value: string): boolean =>
	SOLANA_ADDRESS_PATTERN.test(value);

const validateAddress = (network: MaybeRefOrGetter<WalletType>) => helpers.withMessage(
	"Every wallet must be valid for the selected network",
	(value: string) => {
		const rawAddresses = getItemsFromString(value);
		const validator = toValue(network);

		const validators: Record<string, (value: string) => boolean> = {
			evm: isEvmAddress,
			solana: isSolanaAddress,
		};

		return rawAddresses.length > 0 &&
			rawAddresses.every((address) => Boolean(validators[validator]?.(address)));
	},
);

const requiredField = helpers.withMessage("Add at least one wallet address", required);

export const validationRules = {
	validateAddress,
	requiredField,
};
