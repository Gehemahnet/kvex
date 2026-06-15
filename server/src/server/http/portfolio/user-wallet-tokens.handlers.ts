import type { IncomingMessage, ServerResponse } from "node:http";
import { readJsonBody } from "../http-request.utils";
import { writeJsonResponse } from "../http-response.utils";
import {
	getAuthRequestToken,
	getCsrfRequestToken,
} from "../auth/auth.utils";
import type { CreateUserWalletTokenBody } from "./user-wallet-tokens.types";
import {
	getPortfolioDependencies,
	getPortfolioMutationUser,
	getPortfolioUser,
	getUserWalletTokens,
	parseCreateUserWalletTokenBody,
	parseUserWalletTokenId,
	parseWalletTokenNetwork,
	removeUserWalletToken,
	saveUserWalletToken,
	serializeUserWalletTokenForResponse,
	serializeUserWalletTokensForResponse,
} from "./user-wallet-tokens.utils";

/** Handles `GET /portfolio/tokens` and returns saved wallet token watchlist items. */
export const listUserWalletTokensHandler = async (
	request: IncomingMessage,
	response: ServerResponse,
	url: URL,
) => {
	const dependencies = getPortfolioDependencies();
	const user = await getPortfolioUser(
		dependencies.db,
		getAuthRequestToken(request),
	);
	const tokens = await getUserWalletTokens(
		dependencies.db,
		user.id,
		parseWalletTokenNetwork(url),
	);

	writeJsonResponse(response, 200, {
		tokens: serializeUserWalletTokensForResponse(tokens),
	});
};

/** Handles `POST /portfolio/tokens` and stores one wallet token for the user. */
export const createUserWalletTokenHandler = async (
	request: IncomingMessage,
	response: ServerResponse,
) => {
	const dependencies = getPortfolioDependencies();
	const user = await getPortfolioMutationUser(dependencies.db, {
		csrfToken: getCsrfRequestToken(request),
		token: getAuthRequestToken(request),
	});
	const body = await readJsonBody<CreateUserWalletTokenBody>(request);
	const input = parseCreateUserWalletTokenBody(body);
	const token = await saveUserWalletToken(dependencies.db, user.id, input);

	writeJsonResponse(response, 201, {
		token: serializeUserWalletTokenForResponse(token),
	});
};

/** Handles `DELETE /portfolio/tokens?id=...` and removes one saved wallet token. */
export const deleteUserWalletTokenHandler = async (
	request: IncomingMessage,
	response: ServerResponse,
	url: URL,
) => {
	const dependencies = getPortfolioDependencies();
	const user = await getPortfolioMutationUser(dependencies.db, {
		csrfToken: getCsrfRequestToken(request),
		token: getAuthRequestToken(request),
	});

	await removeUserWalletToken(
		dependencies.db,
		user.id,
		parseUserWalletTokenId(url),
	);

	writeJsonResponse(response, 200, { ok: true });
};
