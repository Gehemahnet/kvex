import type { WalletBalanceNetwork, WalletBalanceTokenInput } from "./wallet-balances.types";

export type UserWalletToken = {
	id: string;
	userId: string;
	network: WalletBalanceNetwork;
	token: WalletBalanceTokenInput;
	label?: string;
	createdAt: Date;
	updatedAt: Date;
};

export type CreateUserWalletTokenInput = {
	userId: string;
	network: WalletBalanceNetwork;
	token: WalletBalanceTokenInput;
	label?: string;
};

export type DeleteUserWalletTokenInput = {
	id: string;
	userId: string;
};

export type UserWalletTokenRow = {
	id: string;
	user_id: string;
	network: WalletBalanceNetwork;
	token: WalletBalanceTokenInput;
	label: string | null;
	created_at: Date;
	updated_at: Date;
};
