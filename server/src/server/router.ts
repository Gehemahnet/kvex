import { IncomingMessage, ServerResponse } from "http";
import { getFunding } from "../services/funding/funding.service";
import { getFundingOverview } from "../services/funding/funding-overview.service";
import { parseFundingOverviewQuery } from "./http/funding-overview-query";
import { parseFundingQuery } from "./http/funding-query";
import {
	MethodNotAllowedError,
	NotFoundError,
	normalizeHttpError,
	toErrorResponseBody,
} from "./http/http-errors";

export const router = async (
	request: IncomingMessage,
	response: ServerResponse,
) => {
	try {
		const url = new URL(request.url ?? "/", "http://localhost");

		if (url.pathname === "/funding/overview") {
			if (request.method !== "GET") {
				throw new MethodNotAllowedError(request.method, url.pathname);
			}

			const query = parseFundingOverviewQuery(request.url);
			const data = await getFundingOverview(query);

			response.writeHead(200, { "Content-Type": "application/json" });
			return response.end(JSON.stringify(data));
		}

		if (url.pathname === "/funding") {
			if (request.method !== "GET") {
				throw new MethodNotAllowedError(request.method, url.pathname);
			}

			const query = parseFundingQuery(request.url);
			const data = await getFunding(query);

			response.writeHead(200, { "Content-Type": "application/json" });
			return response.end(JSON.stringify(data));
		}

		throw new NotFoundError(url.pathname);
	} catch (error) {
		const httpError = normalizeHttpError(error);

		response.writeHead(httpError.statusCode, {
			"Content-Type": "application/json",
		});
		return response.end(JSON.stringify(toErrorResponseBody(httpError)));
	}
};
