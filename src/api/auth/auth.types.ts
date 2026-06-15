export type AuthUser = {
	email?: string;
	id: string;
	login: string;
	status: "active" | "disabled";
};

export type AuthResponse = {
	csrfToken: string;
	expiresAt: string;
	user: AuthUser;
};

export type AnonymousAuthResponse = {
	needsLogin: true;
};

export type AuthSessionStatus = AuthResponse | AnonymousAuthResponse;

export type AuthCredentials = {
	email?: string;
	login: string;
	password: string;
};
