import type { Exchange } from "../../../common/types";
import {
	createUserExchangeAccount,
	deleteUserExchangeAccount,
	listUserExchangeAccounts,
} from "../../../services/users/user-exchange-accounts.repository";
import type {
	CreateUserExchangeAccountInput,
	UserExchangeAccount,
	UserExchangeData,
	UserExchangePermission,
} from "../../../services/users/user-exchange-accounts.types";
import type { Queryable } from "../../../storage/postgres/postgres.client";
import {
	BadRequestError,
	NotFoundError,
} from "../http-errors";
import type {
	CreateUserExchangeTokenBody,
	CreateUserExchangeTokensBody,
} from "./user-exchange-tokens.types";

const SUPPORTED_EXCHANGES: Exchange[] = [
	"ethereal",
	"hyperliquid",
	"nado",
	"okx",
	"pacifica",
];
const DEFAULT_EXCHANGE_PERMISSIONS: UserExchangePermission[] = [
	"balances",
];
const SUPPORTED_EXCHANGE_PERMISSIONS: UserExchangePermission[] = [
	"balances",
	"orders",
	"trades",
];

type ParsedCreateUserExchangeTokenInput = Omit<
	CreateUserExchangeAccountInput,
	"userId"
>;

/** Parses and validates a batch exchange-token create request body. */
export const parseCreateUserExchangeTokensBody = (
	body: CreateUserExchangeTokensBody,
): ParsedCreateUserExchangeTokenInput[] => {
	if (!Array.isArray(body.tokens)) {
		throw new BadRequestError(
			"Field `tokens` must be an array",
			"INVALID_EXCHANGE_TOKENS",
		);
	}

	if (body.tokens.length === 0) {
		throw new BadRequestError(
			"Field `tokens` must contain at least one item",
			"EMPTY_EXCHANGE_TOKENS",
		);
	}

	return body.tokens.map((token) => parseCreateUserExchangeTokenBody(token));
};

/** Parses one exchange-token create payload into the account domain input. */
export const parseCreateUserExchangeTokenBody = (
	value: unknown,
): ParsedCreateUserExchangeTokenInput => {
	const body = parseExchangeTokenObject(value);
	const exchange = parseExchange(body.exchange);
	const label = parseLabel(body.label, exchange);
	const permissions = parsePermissions(body.permissions);
	const publicData = createExchangeTokenData(exchange, body, permissions);

	return {
		exchange,
		label,
		publicData,
		capabilities: createCapabilities(permissions),
	};
};

const parseExchangeTokenObject = (
	value: unknown,
): CreateUserExchangeTokenBody => {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		throw new BadRequestError(
			"Exchange token item must be an object",
			"INVALID_EXCHANGE_TOKEN",
		);
	}

	return value as CreateUserExchangeTokenBody;
};

/** Stores exchange access tokens for a user. */
export const saveUserExchangeTokens = async (
	db: Queryable,
	userId: string,
	inputs: ParsedCreateUserExchangeTokenInput[],
): Promise<UserExchangeAccount[]> => {
	const tokens: UserExchangeAccount[] = [];

	for (const input of inputs) {
		tokens.push(await createUserExchangeAccount(db, { ...input, userId }));
	}

	return tokens;
};

/** Lists exchange access tokens for a user. */
export const getUserExchangeTokens = (
	db: Queryable,
	userId: string,
): Promise<UserExchangeAccount[]> => listUserExchangeAccounts(db, userId);

/** Removes credential secrets from exchange token response payloads. */
export const sanitizeUserExchangeTokensForResponse = (
	tokens: UserExchangeAccount[],
): UserExchangeAccount[] =>
	tokens.map((token) => ({
		...token,
		publicData: sanitizeUserExchangeData(token.publicData),
	}));

/** Parses the exchange token id query parameter for deletion. */
export const parseUserExchangeTokenId = (url: URL): string => {
	const id = url.searchParams.get("id")?.trim();

	if (!id) {
		throw new BadRequestError(
			"Query param `id` is required",
			"MISSING_EXCHANGE_TOKEN_ID",
		);
	}

	return id;
};

/** Deletes one exchange access token or throws when it is not owned by the user. */
export const removeUserExchangeToken = async (
	db: Queryable,
	userId: string,
	id: string,
): Promise<void> => {
	const deleted = await deleteUserExchangeAccount(db, { id, userId });

	if (!deleted) {
		throw new NotFoundError(`/portfolio/exchange-tokens?id=${id}`);
	}
};

const parseExchange = (value: unknown): Exchange => {
	if (typeof value !== "string") {
		throw new BadRequestError(
			"Field `exchange` must be a string",
			"INVALID_EXCHANGE",
		);
	}

	const exchange = value.trim().toLowerCase() as Exchange;

	if (!SUPPORTED_EXCHANGES.includes(exchange)) {
		throw new BadRequestError(
			"Field `exchange` contains an unsupported exchange",
			"UNSUPPORTED_EXCHANGE",
		);
	}

	return exchange;
};

const parseLabel = (value: unknown, exchange: Exchange): string => {
	if (value === undefined) {
		return `${exchange} token`;
	}

	if (typeof value !== "string" || value.trim() === "") {
		throw new BadRequestError(
			"Field `label` must be a non-empty string",
			"INVALID_EXCHANGE_TOKEN_LABEL",
		);
	}

	return value.trim();
};

const parsePermissions = (value: unknown): UserExchangePermission[] => {
	if (value === undefined) {
		return DEFAULT_EXCHANGE_PERMISSIONS;
	}

	if (!Array.isArray(value)) {
		throw new BadRequestError(
			"Field `permissions` must be an array",
			"INVALID_EXCHANGE_TOKEN_PERMISSIONS",
		);
	}

	const permissions = value.map(parsePermission);

	return Array.from(new Set(permissions));
};

const parsePermission = (value: unknown): UserExchangePermission => {
	if (typeof value !== "string") {
		throw new BadRequestError(
			"Exchange token permission must be a string",
			"INVALID_EXCHANGE_TOKEN_PERMISSION",
		);
	}

	const permission = value.trim().toLowerCase() as UserExchangePermission;

	if (!SUPPORTED_EXCHANGE_PERMISSIONS.includes(permission)) {
		throw new BadRequestError(
			"Exchange token permission is not supported",
			"UNSUPPORTED_EXCHANGE_TOKEN_PERMISSION",
		);
	}

	return permission;
};

const createExchangeTokenData = (
	exchange: Exchange,
	body: CreateUserExchangeTokenBody,
	permissions: UserExchangePermission[],
): Partial<UserExchangeData> => ({
	exchange,
	...readOptionalStringField(body, "accountAddress"),
	...readOptionalStringField(body, "address"),
	...readOptionalStringField(body, "apiKey"),
	...readOptionalStringField(body, "apiSecret"),
	...readOptionalStringField(body, "passphrase"),
	...parseOptionalExpiry(body.expiresAt),
	permissions,
} as Partial<UserExchangeData>);

const sanitizeUserExchangeData = (
	data: UserExchangeData,
): UserExchangeData => {
	const publicData = { ...data } as UserExchangeData & {
		apiKey?: string;
		apiSecret?: string;
		passphrase?: string;
	};

	delete publicData.apiKey;
	delete publicData.apiSecret;
	delete publicData.passphrase;

	return publicData as UserExchangeData;
};

const createCapabilities = (
	permissions: UserExchangePermission[],
): CreateUserExchangeAccountInput["capabilities"] => ({
	balances: permissions.includes("balances"),
	orders: permissions.includes("orders"),
	trades: permissions.includes("trades"),
});

const readOptionalStringField = <
	TField extends keyof CreateUserExchangeTokenBody,
>(
	body: CreateUserExchangeTokenBody,
	field: TField,
): Partial<Record<TField, string>> => {
	const value = body[field];

	if (value === undefined || value === null || value === "") {
		return {};
	}

	if (typeof value !== "string") {
		throw new BadRequestError(
			`Field \`${String(field)}\` must be a string`,
			"INVALID_EXCHANGE_TOKEN_FIELD",
		);
	}

	return { [field]: value.trim() } as Partial<Record<TField, string>>;
};

const parseOptionalExpiry = (
	value: unknown,
): { expiresAt?: string } => {
	if (value === undefined || value === null || value === "") {
		return {};
	}

	if (typeof value !== "string") {
		throw new BadRequestError(
			"Field `expiresAt` must be an ISO date string",
			"INVALID_EXCHANGE_TOKEN_EXPIRY",
		);
	}

	const date = new Date(value);

	if (Number.isNaN(date.getTime())) {
		throw new BadRequestError(
			"Field `expiresAt` must be a valid ISO date string",
			"INVALID_EXCHANGE_TOKEN_EXPIRY",
		);
	}

	return { expiresAt: date.toISOString() };
};
