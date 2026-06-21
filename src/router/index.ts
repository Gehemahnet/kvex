import {
	createRouter,
	createWebHistory,
	type RouteRecordRaw,
} from "vue-router";
import { useAuthSession } from "@views/Auth/Auth.composable";

const FundingOverviewView = () =>
	import("@views/FundingOverview/FundingOverview.vue");
const PortfolioOverviewView = () =>
	import("@views/PortfolioOverview/Portfolio.vue");
const SpreadsOverviewView = () =>
	import("@views/SpreadsOverview/SpreadsOverview.vue");
const TradingView = () => import("@views/Trading/Trading.vue");
const LoginView = () => import("@views/Auth/LoginView.vue");
const RegisterView = () => import("@views/Auth/RegisterView.vue");
const ErrorView = () => import("@views/Auth/ErrorView.vue");
const ForgotPasswordView = () => import("@views/Auth/ForgotPasswordView.vue");
const ResetPasswordView = () => import("@views/Auth/ResetPasswordView.vue");
const NotFoundView = () => import("@views/Status/NotFound.vue");
const ServiceUnavailableView = () => import("@views/Status/ServiceUnavailable.vue");

export enum ROUTES {
	AUTH_ERROR = "AuthError",
	AUTH_FORGOT_PASSWORD = "AuthForgotPassword",
	AUTH_LOGIN = "AuthLogin",
	AUTH_REGISTER = "AuthRegister",
	AUTH_RESET_PASSWORD = "AuthResetPassword",
	FUNDING_OVERVIEW = "FundingOverview",
	PORTFOLIO_OVERVIEW = "PortfolioOverview",
	NOT_FOUND = "NotFound",
	SERVICE_UNAVAILABLE = "ServiceUnavailable",
	SPREADS_OVERVIEW = "SpreadsOverview",
	TRADING = "Trading",
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
		name: ROUTES.PORTFOLIO_OVERVIEW,
		path: "/portfolio",
		component: PortfolioOverviewView,
		meta: { requiresAuth: true },
	},
	{
		name: ROUTES.TRADING,
		path: "/trading",
		component: TradingView,
		meta: { requiresAuth: true },
	},
	{
		name: ROUTES.AUTH_LOGIN,
		path: "/auth/login",
		component: LoginView,
		meta: { standalone: true },
	},
	{
		name: ROUTES.AUTH_REGISTER,
		path: "/auth/register",
		component: RegisterView,
		meta: { standalone: true },
	},
	{
		name: ROUTES.AUTH_ERROR,
		path: "/auth/error",
		component: ErrorView,
		meta: { standalone: true },
	},
	{
		name: ROUTES.AUTH_FORGOT_PASSWORD,
		path: "/auth/forgot-password",
		component: ForgotPasswordView,
		meta: { standalone: true },
	},
	{
		name: ROUTES.AUTH_RESET_PASSWORD,
		path: "/auth/reset-password",
		component: ResetPasswordView,
		meta: { standalone: true },
	},
	{
		name: ROUTES.SERVICE_UNAVAILABLE,
		path: "/service-unavailable",
		component: ServiceUnavailableView,
		meta: { standalone: true },
	},
	{
		path: "/funding-overview",
		redirect: { name: ROUTES.FUNDING_OVERVIEW },
	},
	{
		name: ROUTES.NOT_FOUND,
		path: "/:pathMatch(.*)*",
		component: NotFoundView,
		meta: { standalone: true },
	},
];

export const router = createRouter({ history: createWebHistory(), routes });
const { authStatus, ensureAuthSession } = useAuthSession();

router.beforeEach(async (to) => {
	if (to.meta.requiresAuth === true && !(await ensureAuthSession())) {
		if (authStatus.value === "loading") {
			return {
				name: ROUTES.SERVICE_UNAVAILABLE,
				query: { redirect: to.fullPath },
			};
		}

		return {
			name: ROUTES.AUTH_LOGIN,
			query: {
				redirect: to.fullPath,
			},
		};
	}
});
