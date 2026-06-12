import { IncomingMessage, ServerResponse } from "http";
import { log } from "../common/logger";
import { observeHttpRequest } from "../common/metrics";
import { authRoutes } from "./http/auth/auth.routes";
import { fundingRoutes } from "./http/funding/funding.routes";
import { writeJsonResponse } from "./http/http-response.utils";
import { marketSnapshotRoutes } from "./http/markets/market-snapshots.routes";
import { metricsRoutes } from "./http/metrics/metrics.routes";
import { assetPriceRoutes } from "./http/portfolio/asset-prices.routes";
import { walletBalanceRoutes } from "./http/portfolio/wallet-balances.routes";
import { userWalletTokenRoutes } from "./http/portfolio/user-wallet-tokens.routes";
import { spreadRoutes } from "./http/spreads/spreads.routes";
import {
	MethodNotAllowedError,
	NotFoundError,
	normalizeHttpError,
	toErrorResponseBody,
} from "./http/http-errors";
import type { Route } from "./http/route.types";

const routes: Route[] = [
	...authRoutes,
	...fundingRoutes,
	...marketSnapshotRoutes,
	...metricsRoutes,
	...assetPriceRoutes,
	...walletBalanceRoutes,
	...userWalletTokenRoutes,
	...spreadRoutes,
];

/** Dispatches incoming HTTP requests to the matching KVEX route and normalizes errors. */
export const router = async (
	request: IncomingMessage,
	response: ServerResponse,
) => {
	const startedAt = performance.now();
	const method = request.method ?? "UNKNOWN";
	const url = new URL(request.url ?? "/", "http://localhost");

	response.on("finish", () => {
		const durationMs = performance.now() - startedAt;
		const responseBytes = getResponseBytes(response);

		observeHttpRequest({
			method,
			pathname: url.pathname,
			statusCode: response.statusCode,
			durationMs,
			...(responseBytes !== undefined ? { responseBytes } : {}),
		});

		log("info", "http_request", {
			method,
			pathname: url.pathname,
			statusCode: response.statusCode,
			durationMs: Math.round(durationMs * 100) / 100,
			...(responseBytes !== undefined ? { responseBytes } : {}),
		});
	});

	try {
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

const getResponseBytes = (response: ServerResponse): number | undefined => {
	const contentLength = response.getHeader("Content-Length");

	if (typeof contentLength === "number") {
		return contentLength;
	}

	if (typeof contentLength === "string") {
		const parsedContentLength = Number.parseInt(contentLength, 10);

		return Number.isFinite(parsedContentLength) ? parsedContentLength : undefined;
	}

	return undefined;
};

const findRoute = (
	method: string | undefined,
	pathname: string,
): Route | undefined => routes.find((route) => {
	return route.pathname === pathname && route.method === method;
});

const hasRouteForPath = (pathname: string): boolean =>
	routes.some((route) => route.pathname === pathname);
