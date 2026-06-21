import type { IncomingMessage, ServerResponse } from "node:http";
import { getAuthenticatedUser } from "#services/auth/auth-service/auth.service";
import { getUserTradingPositions } from "#services/trading/positions/trading-positions.service";
import { getUserTradingHistory } from "#services/trading/history/trading-history.service";
import { listUserExchangeAccounts } from "#services/users/user-exchange-accounts/user-exchange-accounts.repository";
import { getPostgresPool } from "#storage/postgres/postgres.client";
import { getAuthRequestToken } from "../auth/auth.utils";
import { InternalServerError } from "../http-errors";
import { writeJsonResponse } from "../http-response.utils";

/** Handles `GET /trading/positions/me` for all saved exchange accounts. */
export const getMyTradingPositionsHandler = async (
	request: IncomingMessage,
	response: ServerResponse,
): Promise<void> => {
	const db = getPostgresPool();

	if (db === undefined) {
		throw new InternalServerError("Postgres is not configured");
	}

	const user = await getAuthenticatedUser(db, getAuthRequestToken(request));
	const accounts = await listUserExchangeAccounts(db, user.id);
	const data = await getUserTradingPositions(accounts);

	writeJsonResponse(response, 200, data);
};

export const getMyTradingHistoryHandler = async (
	request: IncomingMessage,
	response: ServerResponse,
): Promise<void> => {
	const db = getPostgresPool();

	if (db === undefined) throw new InternalServerError("Postgres is not configured");

	const user = await getAuthenticatedUser(db, getAuthRequestToken(request));
	const accounts = await listUserExchangeAccounts(db, user.id);

	writeJsonResponse(response, 200, await getUserTradingHistory(accounts));
};
