import type { IncomingMessage, ServerResponse } from "node:http";
import { getAuthenticatedUser } from "#services/auth/auth-service/auth.service";
import { getSpreads } from "#services/spreads/spreads-core/spreads.service";
import type {
	SpreadFeeProfile,
	SpreadsResponse,
} from "#services/spreads/spreads-core/spreads.types";
import { listUserExchangeAccounts } from "#services/users/user-exchange-accounts/user-exchange-accounts.repository";
import { getPostgresPool } from "#storage/postgres/postgres.client";
import { getOptionalAuthRequestToken } from "../auth/auth.utils";
import { writeJsonResponse } from "../http-response.utils";
import { parseSpreadsQuery } from "./spreads-query";

/** Handles `GET /spreads` and returns ranked spread opportunities. */
export const getSpreadsHandler = async (
	request: IncomingMessage,
	response: ServerResponse,
) => {
	const query = parseSpreadsQuery(request.url);
	const feeProfiles = await getOptionalUserSpreadFeeProfiles(request);
	const data: SpreadsResponse = await getSpreads(query, { feeProfiles });

	writeJsonResponse(response, 200, data);
};

const getOptionalUserSpreadFeeProfiles = async (
	request: IncomingMessage,
): Promise<SpreadFeeProfile[]> => {
	try {
		const token = getOptionalAuthRequestToken(request);
		const db = getPostgresPool();

		if (token === undefined || db === undefined) {
			return [];
		}

		const user = await getAuthenticatedUser(db, token);
		const accounts = await listUserExchangeAccounts(db, user.id);

		return accounts.flatMap((account) =>
			(account.publicData.feeProfiles ?? []).map((feeProfile) => ({
				...feeProfile,
				exchange: account.exchange,
			}))
		);
	} catch {
		return [];
	}
};
