import {
	isEvmAddress,
	normalizeEvmAddress,
} from "#services/portfolio/wallet-balances/evm-wallet-balances.utils";
import type {
	UserWalletToken,
	UserWalletTokenRow,
} from "./user-wallet-tokens.types";
import type {
	WalletBalanceNetwork,
	WalletBalanceTokenInput,
} from "#services/portfolio/wallet-balances/wallet-balances.types";
import { NATIVE_WALLET_TOKEN } from "#services/portfolio/wallet-balances/wallet-balances.constants";

/** Normalizes a token label while preserving an absent value. */
export const normalizeWalletTokenLabel = (
	label: string | undefined,
): string | undefined => {
	const normalizedLabel = label?.trim();

	return normalizedLabel ? normalizedLabel : undefined;
};

/** Normalizes a user-submitted wallet token identifier for a supported network. */
export const normalizeWalletToken = (
	network: WalletBalanceNetwork,
	token: string,
): WalletBalanceTokenInput => {
	const normalizedToken = token.trim();

	if (normalizedToken.toLowerCase() === NATIVE_WALLET_TOKEN) {
		return NATIVE_WALLET_TOKEN;
	}

	if (network === "evm" && isEvmAddress(normalizedToken)) {
		return normalizeEvmAddress(normalizedToken);
	}

	throw new Error("Wallet token must be `native` or an EVM token address");
};

/** Maps a database wallet-token row into the domain model. */
export const mapUserWalletTokenRow = (
	row: UserWalletTokenRow,
): UserWalletToken => ({
	id: row.id,
	userId: row.user_id,
	network: row.network,
	token: row.token,
	...(row.label === null ? {} : { label: row.label }),
	createdAt: row.created_at,
	updatedAt: row.updated_at,
});
