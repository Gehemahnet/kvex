import {
	createRouter,
	createWebHistory,
	type RouteRecordRaw,
} from "vue-router";

const FundingOverviewView = () =>
	import("../views/FundingOverview/FundingOverview.vue");

export enum ROUTES {
	FUNDING_OVERVIEW = "FundingOverview",
}

const routes: RouteRecordRaw[] = [
	{
		name: ROUTES.FUNDING_OVERVIEW,
		path: "",
		component: FundingOverviewView,
	},
	{
		path: "/funding-overview",
		redirect: { name: ROUTES.FUNDING_OVERVIEW },
	},
];

export const router = createRouter({ history: createWebHistory(), routes });
