import type { Route } from "../route.types";
import { getMarketSnapshotsHandler } from "./market-snapshots.handlers";

export const marketSnapshotRoutes: Route[] = [
	{
		method: "GET",
		pathname: "/markets/snapshots",
		handler: getMarketSnapshotsHandler,
	},
];
