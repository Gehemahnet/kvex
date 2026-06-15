import type { Exchange } from "#common/types";

export type UserExchangeAccountStatus = "active" | "disabled" | "error";

export type UserExchangeCapability =
	| "balances"
	| "fees"
	| "orders"
	| "positions"
	| "trades";

export type UserExchangePermission =
	| "balances"
	| "orders"
	| "trades";

export type UserExchangeCapabilities = Partial<
	Record<UserExchangeCapability, boolean>
>;

export type FeeProfileSource = "api" | "documentation" | "userOverride";

export type UserExchangeFeeProfile = {
	makerFeeRate: number;
	takerFeeRate: number;
	source: FeeProfileSource;
	symbol?: string;
	instrumentType?: string;
	marketType?: "perp" | "spot" | "futures" | "options";
	tierLabel?: string;
	expiresAt?: string;
};

export type HyperliquidUserExchangeData = {
	exchange: "hyperliquid";
	address?: string;
	apiKey?: string;
	apiSecret?: string;
	expiresAt?: string;
	feeProfiles?: UserExchangeFeeProfile[];
	permissions?: UserExchangePermission[];
};

export type PacificaUserExchangeData = {
	exchange: "pacifica";
	accountAddress?: string;
	apiKey?: string;
	apiSecret?: string;
	expiresAt?: string;
	feeProfiles?: UserExchangeFeeProfile[];
	permissions?: UserExchangePermission[];
};

export type OkxUserExchangeData = {
	exchange: "okx";
	accountLevel?: string;
	apiKey?: string;
	apiSecret?: string;
	expiresAt?: string;
	passphrase?: string;
	feeProfiles?: UserExchangeFeeProfile[];
	permissions?: UserExchangePermission[];
};

export type NadoUserExchangeData = {
	exchange: "nado";
	apiKey?: string;
	apiSecret?: string;
	expiresAt?: string;
	feeProfiles?: UserExchangeFeeProfile[];
	permissions?: UserExchangePermission[];
};

export type EtherealUserExchangeData = {
	exchange: "ethereal";
	apiKey?: string;
	apiSecret?: string;
	expiresAt?: string;
	feeProfiles?: UserExchangeFeeProfile[];
	permissions?: UserExchangePermission[];
};

export type UserExchangeData =
	| EtherealUserExchangeData
	| HyperliquidUserExchangeData
	| NadoUserExchangeData
	| OkxUserExchangeData
	| PacificaUserExchangeData;

export type UserExchangeAccount = {
	id: string;
	userId: string;
	exchange: Exchange;
	label: string;
	status: UserExchangeAccountStatus;
	publicData: UserExchangeData;
	capabilities: UserExchangeCapabilities;
	lastCheckedAt?: Date;
	createdAt: Date;
	updatedAt: Date;
};

export type CreateUserExchangeAccountInput = {
	userId: string;
	exchange: Exchange;
	label: string;
	publicData?: Partial<UserExchangeData>;
	capabilities?: UserExchangeCapabilities;
};

export type UserExchangeAccountRow = {
	id: string;
	user_id: string;
	exchange: Exchange;
	label: string;
	status: UserExchangeAccountStatus;
	public_data: UserExchangeData;
	capabilities: UserExchangeCapabilities;
	last_checked_at: Date | null;
	created_at: Date;
	updated_at: Date;
};
