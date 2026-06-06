import type { Route } from "../route.types";
import {
	confirmPasswordResetHandler,
	getCurrentUserHandler,
	loginUserHandler,
	logoutUserHandler,
	refreshAuthSessionHandler,
	requestPasswordResetHandler,
	registerUserHandler,
} from "./auth.handlers";

export const authRoutes: Route[] = [
	{
		method: "POST",
		pathname: "/auth/register",
		handler: registerUserHandler,
	},
	{
		method: "POST",
		pathname: "/auth/login",
		handler: loginUserHandler,
	},
	{
		method: "GET",
		pathname: "/auth/me",
		handler: getCurrentUserHandler,
	},
	{
		method: "POST",
		pathname: "/auth/logout",
		handler: logoutUserHandler,
	},
	{
		method: "POST",
		pathname: "/auth/refresh",
		handler: refreshAuthSessionHandler,
	},
	{
		method: "POST",
		pathname: "/auth/password-reset/request",
		handler: requestPasswordResetHandler,
	},
	{
		method: "POST",
		pathname: "/auth/password-reset/confirm",
		handler: confirmPasswordResetHandler,
	},
];
