import type { WalletBalanceNetwork } from "#services/portfolio/wallet-balances/wallet-balances.types";

export type UserPortfolioSourceType = "wallet";

export type UserPortfolioSourceStatus = "active" | "disabled";

export type UserPortfolioSource = {
	id: string;
	userId: string;
	type: UserPortfolioSourceType;
	network: WalletBalanceNetwork;
	address: string;
	label?: string;
	status: UserPortfolioSourceStatus;
	createdAt: Date;
	updatedAt: Date;
};

export type CreateUserPortfolioSourceInput = {
	userId: string;
	network: WalletBalanceNetwork;
	address: string;
	label?: string;
};

export type UpdateUserPortfolioSourceInput = {
	id: string;
	userId: string;
	label?: string;
	status?: UserPortfolioSourceStatus;
};

export type DeleteUserPortfolioSourceInput = {
	id: string;
	userId: string;
};

export type UserPortfolioSourceRow = {
	id: string;
	user_id: string;
	type: UserPortfolioSourceType;
	network: WalletBalanceNetwork;
	address: string;
	label: string | null;
	status: UserPortfolioSourceStatus;
	created_at: Date;
	updated_at: Date;
};
