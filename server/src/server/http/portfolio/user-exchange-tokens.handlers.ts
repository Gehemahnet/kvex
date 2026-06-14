import type { IncomingMessage, ServerResponse } from "node:http";
import { readJsonBody } from "../http-request.utils";
import { writeJsonResponse } from "../http-response.utils";
import {
	getAuthRequestToken,
	getCsrfRequestToken,
} from "../auth/auth.utils";
import {
	getPortfolioDependencies,
	getPortfolioMutationUser,
	getPortfolioUser,
} from "./user-wallet-tokens.utils";
import type { CreateUserExchangeTokensBody } from "./user-exchange-tokens.types";
import {
	getUserExchangeTokens,
	parseCreateUserExchangeTokensBody,
	parseUserExchangeTokenId,
	removeUserExchangeToken,
	sanitizeUserExchangeTokensForResponse,
	saveUserExchangeTokens,
} from "./user-exchange-tokens.utils";

/** Handles `GET /portfolio/exchange-tokens` and returns saved exchange tokens. */
export const listUserExchangeTokensHandler = async (
	request: IncomingMessage,
	response: ServerResponse,
) => {
	const dependencies = getPortfolioDependencies();
	const user = await getPortfolioUser(
		dependencies.db,
		getAuthRequestToken(request),
	);
	const tokens = await getUserExchangeTokens(dependencies.db, user.id);

	writeJsonResponse(response, 200, {
		tokens: sanitizeUserExchangeTokensForResponse(tokens),
	});
};

/** Handles `POST /portfolio/exchange-tokens` and stores exchange access tokens. */
export const createUserExchangeTokensHandler = async (
	request: IncomingMessage,
	response: ServerResponse,
) => {
	const dependencies = getPortfolioDependencies();
	const user = await getPortfolioMutationUser(dependencies.db, {
		csrfToken: getCsrfRequestToken(request),
		token: getAuthRequestToken(request),
	});
	const body = await readJsonBody<CreateUserExchangeTokensBody>(request);
	const input = parseCreateUserExchangeTokensBody(body);
	const tokens = await saveUserExchangeTokens(dependencies.db, user.id, input);

	writeJsonResponse(response, 201, {
		tokens: sanitizeUserExchangeTokensForResponse(tokens),
	});
};

/** Handles `DELETE /portfolio/exchange-tokens?id=...` and removes one exchange token. */
export const deleteUserExchangeTokenHandler = async (
	request: IncomingMessage,
	response: ServerResponse,
	url: URL,
) => {
	const dependencies = getPortfolioDependencies();
	const user = await getPortfolioMutationUser(dependencies.db, {
		csrfToken: getCsrfRequestToken(request),
		token: getAuthRequestToken(request),
	});

	await removeUserExchangeToken(
		dependencies.db,
		user.id,
		parseUserExchangeTokenId(url),
	);

	writeJsonResponse(response, 200, { ok: true });
};
