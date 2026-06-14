import {
	isEvmAddress,
	normalizeEvmAddress,
} from "./evm-wallet-balances.utils";
import {
	isSolanaAddress,
	normalizeSolanaAddress,
} from "./solana-wallet-balances.utils";
import type {
	UserPortfolioSource,
	UserPortfolioSourceRow,
	UserPortfolioSourceStatus,
} from "./user-portfolio-sources.types";
import type { WalletBalanceNetwork } from "./wallet-balances.types";

/** Normalizes a user-provided portfolio source label. */
export const normalizePortfolioSourceLabel = (
	label: string | undefined,
): string | undefined => {
	const normalizedLabel = label?.trim();

	return normalizedLabel ? normalizedLabel : undefined;
};

/** Normalizes a wallet address according to the selected network. */
export const normalizePortfolioSourceAddress = (
	network: WalletBalanceNetwork,
	address: string,
): string => {
	const normalizedAddress = address.trim();

	if (network === "evm") {
		if (!isEvmAddress(normalizedAddress)) {
			throw new Error("Wallet address must be an EVM address");
		}

		return normalizeEvmAddress(normalizedAddress);
	}

	if (!isSolanaAddress(normalizedAddress)) {
		throw new Error("Wallet address must be a Solana address");
	}

	return normalizeSolanaAddress(normalizedAddress);
};

/** Returns true when a portfolio source status is supported. */
export const isPortfolioSourceStatus = (
	value: string,
): value is UserPortfolioSourceStatus =>
	value === "active" || value === "disabled";

/** Maps a database portfolio source row into the domain model. */
export const mapUserPortfolioSourceRow = (
	row: UserPortfolioSourceRow,
): UserPortfolioSource => ({
	id: row.id,
	userId: row.user_id,
	type: row.type,
	network: row.network,
	address: row.address,
	...(row.label === null ? {} : { label: row.label }),
	status: row.status,
	createdAt: row.created_at,
	updatedAt: row.updated_at,
});
