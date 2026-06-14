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
import type {
	CreateUserPortfolioSourcesBody,
	UpdateUserPortfolioSourceBody,
} from "./user-portfolio-sources.types";
import {
	editUserPortfolioSource,
	getUserPortfolioSources,
	parseCreateUserPortfolioSourcesBody,
	parsePortfolioSourceId,
	parsePortfolioSourceNetwork,
	parseUpdateUserPortfolioSourceBody,
	removeUserPortfolioSource,
	saveUserPortfolioSources,
} from "./user-portfolio-sources.utils";

/** Handles `GET /portfolio/sources` and returns saved user portfolio sources. */
export const listUserPortfolioSourcesHandler = async (
	request: IncomingMessage,
	response: ServerResponse,
	url: URL,
) => {
	const dependencies = getPortfolioDependencies();
	const user = await getPortfolioUser(
		dependencies.db,
		getAuthRequestToken(request),
	);
	const sources = await getUserPortfolioSources(
		dependencies.db,
		user.id,
		parsePortfolioSourceNetwork(url),
	);

	writeJsonResponse(response, 200, { sources });
};

/** Handles `POST /portfolio/sources` and stores one or more user portfolio sources. */
export const createUserPortfolioSourceHandler = async (
	request: IncomingMessage,
	response: ServerResponse,
) => {
	const dependencies = getPortfolioDependencies();
	const user = await getPortfolioMutationUser(dependencies.db, {
		csrfToken: getCsrfRequestToken(request),
		token: getAuthRequestToken(request),
	});
	const body = await readJsonBody<CreateUserPortfolioSourcesBody>(request);
	const input = parseCreateUserPortfolioSourcesBody(body);
	const sources = await saveUserPortfolioSources(dependencies.db, user.id, input);

	writeJsonResponse(response, 201, { sources });
};

/** Handles `PATCH /portfolio/sources?id=...` and updates one user source. */
export const updateUserPortfolioSourceHandler = async (
	request: IncomingMessage,
	response: ServerResponse,
	url: URL,
) => {
	const dependencies = getPortfolioDependencies();
	const user = await getPortfolioMutationUser(dependencies.db, {
		csrfToken: getCsrfRequestToken(request),
		token: getAuthRequestToken(request),
	});
	const body = await readJsonBody<UpdateUserPortfolioSourceBody>(request);
	const source = await editUserPortfolioSource(
		dependencies.db,
		user.id,
		parsePortfolioSourceId(url),
		parseUpdateUserPortfolioSourceBody(body),
	);

	writeJsonResponse(response, 200, { source });
};

/** Handles `DELETE /portfolio/sources?id=...` and removes one user source. */
export const deleteUserPortfolioSourceHandler = async (
	request: IncomingMessage,
	response: ServerResponse,
	url: URL,
) => {
	const dependencies = getPortfolioDependencies();
	const user = await getPortfolioMutationUser(dependencies.db, {
		csrfToken: getCsrfRequestToken(request),
		token: getAuthRequestToken(request),
	});

	await removeUserPortfolioSource(
		dependencies.db,
		user.id,
		parsePortfolioSourceId(url),
	);

	writeJsonResponse(response, 200, { ok: true });
};
