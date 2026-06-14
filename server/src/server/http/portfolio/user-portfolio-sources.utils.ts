import {
	createUserPortfolioSource,
	deleteUserPortfolioSource,
	listUserPortfolioSources,
	updateUserPortfolioSource,
} from "../../../services/portfolio/user-portfolio-sources.repository";
import {
	isPortfolioSourceStatus,
	normalizePortfolioSourceAddress,
	normalizePortfolioSourceLabel,
} from "../../../services/portfolio/user-portfolio-sources.utils";
import type { UserPortfolioSource } from "../../../services/portfolio/user-portfolio-sources.types";
import type { WalletBalanceNetwork } from "../../../services/portfolio/wallet-balances.types";
import type { Queryable } from "../../../storage/postgres/postgres.client";
import {
	BadRequestError,
	NotFoundError,
} from "../http-errors";
import type {
	CreateUserPortfolioSourceBody,
	CreateUserPortfolioSourcesBody,
	ParsedCreateUserPortfolioSourceBody,
	ParsedUpdateUserPortfolioSourceBody,
	UpdateUserPortfolioSourceBody,
} from "./user-portfolio-sources.types";

/** Parses an optional source network query parameter. */
export const parsePortfolioSourceNetwork = (
	url: URL,
): WalletBalanceNetwork | undefined => {
	const value = url.searchParams.get("network")?.trim().toLowerCase();

	if (!value) {
		return undefined;
	}

	return parseWalletNetworkValue(value, "Query param `network`");
};

/** Parses one portfolio source id from the query string. */
export const parsePortfolioSourceId = (url: URL): string => {
	const id = url.searchParams.get("id")?.trim();

	if (!id) {
		throw new BadRequestError(
			"Query param `id` is required",
			"MISSING_PORTFOLIO_SOURCE_ID",
		);
	}

	return id;
};

/** Parses a create portfolio source JSON body. */
export const parseCreateUserPortfolioSourceBody = (
	body: CreateUserPortfolioSourceBody,
): ParsedCreateUserPortfolioSourceBody => {
	const network = parseWalletNetworkValue(body.network, "Field `network`");

	if (typeof body.address !== "string") {
		throw new BadRequestError(
			"Field `address` must be a string",
			"INVALID_PORTFOLIO_SOURCE_ADDRESS",
		);
	}

	try {
		const label = typeof body.label === "string"
			? normalizePortfolioSourceLabel(body.label)
			: undefined;

		return {
			address: normalizePortfolioSourceAddress(network, body.address),
			...(label === undefined ? {} : { label }),
			network,
		};
	} catch (error) {
		throw new BadRequestError(
			error instanceof Error ? error.message : "Invalid portfolio source",
			"INVALID_PORTFOLIO_SOURCE_ADDRESS",
		);
	}
};

/** Parses a create portfolio sources JSON body. */
export const parseCreateUserPortfolioSourcesBody = (
	body: CreateUserPortfolioSourcesBody,
): ParsedCreateUserPortfolioSourceBody[] => {
	if (!isRecord(body) || !Array.isArray(body.sources)) {
		throw new BadRequestError(
			"Field `sources` must be an array",
			"INVALID_PORTFOLIO_SOURCES",
		);
	}

	if (body.sources.length === 0) {
		throw new BadRequestError(
			"Field `sources` must contain at least one source",
			"EMPTY_PORTFOLIO_SOURCES",
		);
	}

	return body.sources.map((source) =>
		parseCreateUserPortfolioSourceBody(
			source as CreateUserPortfolioSourceBody,
		));
};

/** Parses an update portfolio source JSON body. */
export const parseUpdateUserPortfolioSourceBody = (
	body: UpdateUserPortfolioSourceBody,
): ParsedUpdateUserPortfolioSourceBody => {
	const update: ParsedUpdateUserPortfolioSourceBody = {};

	if (body.label !== undefined) {
		if (typeof body.label !== "string") {
			throw new BadRequestError(
				"Field `label` must be a string",
				"INVALID_PORTFOLIO_SOURCE_LABEL",
			);
		}

		const label = normalizePortfolioSourceLabel(body.label);
		if (label !== undefined) {
			update.label = label;
		}
	}

	if (body.status !== undefined) {
		if (typeof body.status !== "string" || !isPortfolioSourceStatus(body.status)) {
			throw new BadRequestError(
				"Field `status` must be `active` or `disabled`",
				"INVALID_PORTFOLIO_SOURCE_STATUS",
			);
		}

		update.status = body.status;
	}

	if (update.label === undefined && update.status === undefined) {
		throw new BadRequestError(
			"At least one of `label` or `status` must be provided",
			"EMPTY_PORTFOLIO_SOURCE_UPDATE",
		);
	}

	return update;
};

/** Stores one portfolio source for a user. */
export const saveUserPortfolioSource = (
	db: Queryable,
	userId: string,
	input: ParsedCreateUserPortfolioSourceBody,
): Promise<UserPortfolioSource> =>
	createUserPortfolioSource(db, {
		...input,
		userId,
	});

/** Stores portfolio sources for a user. */
export const saveUserPortfolioSources = (
	db: Queryable,
	userId: string,
	inputs: ParsedCreateUserPortfolioSourceBody[],
): Promise<UserPortfolioSource[]> =>
	Promise.all(inputs.map((input) => saveUserPortfolioSource(db, userId, input)));

/** Lists portfolio sources for a user. */
export const getUserPortfolioSources = (
	db: Queryable,
	userId: string,
	network?: WalletBalanceNetwork,
): Promise<UserPortfolioSource[]> =>
	listUserPortfolioSources(db, { network, userId });

/** Updates one portfolio source or throws when it is not owned by the user. */
export const editUserPortfolioSource = async (
	db: Queryable,
	userId: string,
	id: string,
	input: ParsedUpdateUserPortfolioSourceBody,
): Promise<UserPortfolioSource> => {
	const source = await updateUserPortfolioSource(db, {
		id,
		userId,
		...input,
	});

	if (source === undefined) {
		throw new NotFoundError(`/portfolio/sources?id=${id}`);
	}

	return source;
};

/** Deletes one portfolio source or throws when it is not owned by the user. */
export const removeUserPortfolioSource = async (
	db: Queryable,
	userId: string,
	id: string,
): Promise<void> => {
	const deleted = await deleteUserPortfolioSource(db, { id, userId });

	if (!deleted) {
		throw new NotFoundError(`/portfolio/sources?id=${id}`);
	}
};

const parseWalletNetworkValue = (
	value: unknown,
	fieldName: string,
): WalletBalanceNetwork => {
	if (typeof value !== "string") {
		throw new BadRequestError(
			`${fieldName} must be \`evm\` or \`solana\``,
			"INVALID_PORTFOLIO_SOURCE_NETWORK",
		);
	}

	const normalizedValue = value.trim().toLowerCase();

	if (normalizedValue === "evm" || normalizedValue === "solana") {
		return normalizedValue;
	}

	throw new BadRequestError(
		`${fieldName} must be \`evm\` or \`solana\``,
		"INVALID_PORTFOLIO_SOURCE_NETWORK",
	);
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null;
