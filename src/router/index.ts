import {
	createRouter,
	createWebHistory,
	type RouteRecordRaw,
} from "vue-router";

const FundingOverviewView = () =>
	import("../views/FundingOverview/FundingOverview.vue");
const SpreadsOverviewView = () =>
	import("../views/SpreadsOverview/SpreadsOverview.vue");

export enum ROUTES {
	FUNDING_OVERVIEW = "FundingOverview",
	SPREADS_OVERVIEW = "SpreadsOverview",
}

const routes: RouteRecordRaw[] = [
	{
		name: ROUTES.FUNDING_OVERVIEW,
		path: "",
		component: FundingOverviewView,
	},
	{
		name: ROUTES.SPREADS_OVERVIEW,
		path: "/spreads",
		component: SpreadsOverviewView,
	},
	{
		path: "/funding-overview",
		redirect: { name: ROUTES.FUNDING_OVERVIEW },
	},
];

export const router = createRouter({ history: createWebHistory(), routes });
