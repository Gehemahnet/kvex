import {
	createRouter,
	createWebHistory,
	type RouteRecordRaw,
} from "vue-router";

const GatewayView = () => import("../views/GatewayView.vue");
const FundingOverviewView = () =>
	import("../views/FundingOverview/FundingOverview.vue");
const SpreadsView = () => import("../views/SpreadsView/SpreadsView.vue");
const SpreadsLabView = () => import("../views/SpreadsLabView/SpreadsLabView.vue");
const ArbitrageLabView = () => import("../views/ArbitrageLabView/ArbitrageLabView.vue");

export enum ROUTES {
	GATEWAY = "Gateway",
	FUNDING_OVERVIEW = "FundingOverview",
	SPREADS = "Spreads",
	SPREADS_LAB = "SpreadsLab",
	ARBITRAGE_LAB = "ArbitrageLab",
}

const routes: RouteRecordRaw[] = [
	{
		name: ROUTES.GATEWAY,
		path: "",
		component: GatewayView,
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
	{
		name: ROUTES.SPREADS_LAB,
		path: "/spreads-lab",
		component: SpreadsLabView,
	},
	{
		name: ROUTES.ARBITRAGE_LAB,
		path: "/arbitrage-lab",
		component: ArbitrageLabView,
	},
];

export const router = createRouter({ history: createWebHistory(), routes });
