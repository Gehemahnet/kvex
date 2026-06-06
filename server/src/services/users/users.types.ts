export type UserStatus = "active" | "disabled";

export type User = {
	id: string;
	login: string;
	email?: string;
	passwordHash: string;
	status: UserStatus;
	createdAt: Date;
	updatedAt: Date;
};

export type CreateUserInput = {
	email?: string;
	login: string;
	passwordHash: string;
};

export type UserRow = {
	id: string;
	login: string;
	email: string | null;
	password_hash: string;
	status: UserStatus;
	created_at: Date;
	updated_at: Date;
};
