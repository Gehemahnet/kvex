import type { Exchange } from "../../common/types";
import type {
	UserExchangeAccount,
	UserExchangeAccountRow,
	UserExchangeData,
} from "./user-exchange-accounts.types";

/** Normalizes a user-provided exchange account label. */
export const normalizeUserExchangeAccountLabel = (label: string): string =>
	label.trim();

/** Builds exchange-specific public data with the exchange discriminator present. */
export const createUserExchangeData = (
	exchange: Exchange,
	data: Partial<UserExchangeData> = {},
): UserExchangeData => ({
	...data,
	exchange,
} as UserExchangeData);

/** Maps a database exchange account row into the domain model. */
export const mapUserExchangeAccountRow = (
	row: UserExchangeAccountRow,
): UserExchangeAccount => ({
	id: row.id,
	userId: row.user_id,
	exchange: row.exchange,
	label: row.label,
	status: row.status,
	publicData: row.public_data,
	capabilities: row.capabilities,
	...(row.last_checked_at === null ? {} : { lastCheckedAt: row.last_checked_at }),
	createdAt: row.created_at,
	updatedAt: row.updated_at,
});
