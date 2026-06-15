import type { User } from "#services/users/users-core/users.types";

export type AuthTokenPayload = {
	sub: string;
	login: string;
	exp: number;
	iat: number;
};

export type AuthUser = Pick<User, "email" | "id" | "login" | "status">;

export type AuthResponse = {
	csrfToken: string;
	expiresAt: string;
	token: string;
	user: AuthUser;
};

export type AuthSession = Pick<AuthResponse, "csrfToken" | "expiresAt" | "user">;

export type AnonymousAuthSession = {
	needsLogin: true;
};

export type AuthSessionStatus = AuthSession | AnonymousAuthSession;

export type RegisterUserInput = {
	email?: string;
	login: string;
	password: string;
};

export type LoginUserInput = RegisterUserInput;

export type RequestPasswordResetInput = {
	login: string;
};

export type ConfirmPasswordResetInput = {
	token: string;
	password: string;
};
