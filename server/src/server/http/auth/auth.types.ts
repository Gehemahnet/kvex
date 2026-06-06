export type AuthCredentialsBody = {
	email?: unknown;
	login?: unknown;
	password?: unknown;
};

export type PasswordResetRequestBody = {
	login?: unknown;
};

export type PasswordResetConfirmBody = {
	token?: unknown;
	password?: unknown;
};
