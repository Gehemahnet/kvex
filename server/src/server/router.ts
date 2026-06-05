import { IncomingMessage, ServerResponse } from "http";
import { fundingRoutes } from "./http/funding/funding.routes";
import { writeJsonResponse } from "./http/http-response.utils";
import { marketSnapshotRoutes } from "./http/markets/market-snapshots.routes";
import { spreadRoutes } from "./http/spreads/spreads.routes";
import {
	MethodNotAllowedError,
	NotFoundError,
	normalizeHttpError,
	toErrorResponseBody,
} from "./http/http-errors";
import type { Route } from "./http/route.types";

const routes: Route[] = [
	...fundingRoutes,
	...marketSnapshotRoutes,
	...spreadRoutes,
];

/** Dispatches incoming HTTP requests to the matching KVEX route and normalizes errors. */
export const router = async (
	request: IncomingMessage,
	response: ServerResponse,
) => {
	try {
		const url = new URL(request.url ?? "/", "http://localhost");
		const route = findRoute(request.method, url.pathname);

		if (!route) {
			if (hasRouteForPath(url.pathname)) {
				throw new MethodNotAllowedError(request.method, url.pathname);
			}

			throw new NotFoundError(url.pathname);
		}

		await route.handler(request, response, url);
	} catch (error) {
		const httpError = normalizeHttpError(error);
		writeJsonResponse(
			response,
			httpError.statusCode,
			toErrorResponseBody(httpError),
		);
	}
};

const findRoute = (
	method: string | undefined,
	pathname: string,
): Route | undefined => routes.find((route) => {
	return route.pathname === pathname && route.method === method;
});

const hasRouteForPath = (pathname: string): boolean =>
	routes.some((route) => route.pathname === pathname);
