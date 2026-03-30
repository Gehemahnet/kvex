import {
	createRouter,
	createWebHistory,
	type RouteRecordRaw,
} from "vue-router";

const MainView = () => import("../views/MainView.vue");
const FundingOverviewView = () =>
	import("../views/FundingOverview/FundingOverview.vue");
const SpreadsView = () => import("../views/SpreadsView/SpreadsView.vue");

export enum ROUTES {
	MAIN = "Main",
	FUNDING_OVERVIEW = "FundingOverview",
	SPREADS = "Spreads",
}

const routes: RouteRecordRaw[] = [
	{
		name: ROUTES.MAIN,
		path: "",
		component: MainView,
	},
	{
		name: ROUTES.FUNDING_OVERVIEW,
		path: "/funding-overview",
		component: FundingOverviewView,
	},
	{
		name: ROUTES.SPREADS,
		path: "/spreads",
		component: SpreadsView,
	},
];

export const router = createRouter({ history: createWebHistory(), routes });
