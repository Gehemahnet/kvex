import {
	getAuthenticatedSession,
	getAuthenticatedUser,
} from "../../../services/auth/auth.service";
import type { AuthUser } from "../../../services/auth/auth.types";
import {
	createUserWalletToken,
	deleteUserWalletToken,
	listUserWalletTokens,
} from "../../../services/portfolio/user-wallet-tokens.repository";
import {
	normalizeWalletToken,
	normalizeWalletTokenLabel,
} from "../../../services/portfolio/user-wallet-tokens.utils";
import type { UserWalletToken } from "../../../services/portfolio/user-wallet-tokens.types";
import { DEFAULT_WALLET_BALANCE_NETWORK } from "../../../services/portfolio/wallet-balances.constants";
import type { WalletBalanceNetwork } from "../../../services/portfolio/wallet-balances.types";
import { getPostgresPool } from "../../../storage/postgres/postgres.client";
import type { Queryable } from "../../../storage/postgres/postgres.client";
import {
	BadRequestError,
	InternalServerError,
	NotFoundError,
} from "../http-errors";
import type { CreateUserWalletTokenBody } from "./user-wallet-tokens.types";

export type PortfolioDependencies = {
	db: Queryable;
};

/** Returns portfolio runtime dependencies or throws an HTTP-safe configuration error. */
export const getPortfolioDependencies = (): PortfolioDependencies => {
	const db = getPostgresPool();

	if (db === undefined) {
		throw new InternalServerError("Postgres is not configured");
	}

	return { db };
};

/** Resolves the current user for read-only portfolio requests. */
export const getPortfolioUser = async (
	db: Queryable,
	token: string,
): Promise<AuthUser> => getAuthenticatedUser(db, token);

/** Resolves the current user and validates CSRF for portfolio mutations. */
export const getPortfolioMutationUser = async (
	db: Queryable,
	params: {
		csrfToken: string;
		token: string;
	},
): Promise<AuthUser> => {
	const session = await getAuthenticatedSession(db, params.token, params.csrfToken);

	return session.user;
};

/** Parses the wallet-token network query parameter. */
export const parseWalletTokenNetwork = (url: URL): WalletBalanceNetwork => {
	const value = url.searchParams.get("network")?.trim().toLowerCase();

	if (!value) {
		return DEFAULT_WALLET_BALANCE_NETWORK;
	}

	if (value !== DEFAULT_WALLET_BALANCE_NETWORK) {
		throw new BadRequestError(
			"Query param `network` must be `evm`",
			"UNSUPPORTED_WALLET_TOKEN_NETWORK",
		);
	}

	return value;
};

/** Parses and validates a wallet-token create request body. */
export const parseCreateUserWalletTokenBody = (
	body: CreateUserWalletTokenBody,
): {
	label?: string;
	network: WalletBalanceNetwork;
	token: string;
} => {
	const network = parseWalletTokenBodyNetwork(body.network);

	if (typeof body.token !== "string") {
		throw new BadRequestError(
			"Field `token` must be a string",
			"INVALID_WALLET_TOKEN",
		);
	}

	try {
		const label = typeof body.label === "string"
			? normalizeWalletTokenLabel(body.label)
			: undefined;

		return {
			network,
			token: normalizeWalletToken(network, body.token),
			...(label === undefined ? {} : { label }),
		};
	} catch (error) {
		throw new BadRequestError(
			error instanceof Error ? error.message : "Invalid wallet token",
			"INVALID_WALLET_TOKEN",
		);
	}
};

/** Parses the wallet token id query parameter for deletion. */
export const parseUserWalletTokenId = (url: URL): string => {
	const id = url.searchParams.get("id")?.trim();

	if (!id) {
		throw new BadRequestError(
			"Query param `id` is required",
			"MISSING_WALLET_TOKEN_ID",
		);
	}

	return id;
};

/** Stores one wallet token for a user. */
export const saveUserWalletToken = (
	db: Queryable,
	userId: string,
	input: {
		label?: string;
		network: WalletBalanceNetwork;
		token: string;
	},
): Promise<UserWalletToken> =>
	createUserWalletToken(db, {
		...input,
		userId,
	});

/** Lists wallet tokens for a user and network. */
export const getUserWalletTokens = (
	db: Queryable,
	userId: string,
	network: WalletBalanceNetwork,
): Promise<UserWalletToken[]> => listUserWalletTokens(db, userId, network);

/** Deletes one wallet token or throws when it is not owned by the user. */
export const removeUserWalletToken = async (
	db: Queryable,
	userId: string,
	id: string,
): Promise<void> => {
	const deleted = await deleteUserWalletToken(db, { id, userId });

	if (!deleted) {
		throw new NotFoundError(`/portfolio/tokens?id=${id}`);
	}
};

const parseWalletTokenBodyNetwork = (
	value: unknown,
): WalletBalanceNetwork => {
	if (value === undefined) {
		return DEFAULT_WALLET_BALANCE_NETWORK;
	}

	if (
		typeof value !== "string" ||
		value.trim().toLowerCase() !== DEFAULT_WALLET_BALANCE_NETWORK
	) {
		throw new BadRequestError(
			"Field `network` must be `evm`",
			"UNSUPPORTED_WALLET_TOKEN_NETWORK",
		);
	}

	return DEFAULT_WALLET_BALANCE_NETWORK;
};
