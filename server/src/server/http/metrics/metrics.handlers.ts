import type { IncomingMessage, ServerResponse } from "node:http";
import {
	getHttpMetricsSnapshot,
	getSpreadsMetricsSnapshot,
} from "#common/metrics";
import { getRedisStatus } from "#common/redis-client";
import { writeJsonResponse } from "../http-response.utils";

/** Handles `GET /metrics` and returns in-process HTTP performance metrics. */
export const getMetricsHandler = async (
	_request: IncomingMessage,
	response: ServerResponse,
) => {
	writeJsonResponse(response, 200, {
		http: getHttpMetricsSnapshot(),
		redis: getRedisStatus(),
		spreads: getSpreadsMetricsSnapshot(),
	});
};
