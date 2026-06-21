import { writeJsonResponse } from "../http-response.utils";
import type { Route } from "../route.types";

export const healthRoutes: Route[] = [{
	method: "GET",
	pathname: "/health",
	handler: async (_request, response) => {
		writeJsonResponse(response, 200, { status: "ok" });
	},
}];
