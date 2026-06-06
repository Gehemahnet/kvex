import type { Exchange } from "../../common/types";

export type UserExchangeAccountStatus = "active" | "disabled" | "error";

export type UserExchangeCapability = "balances" | "fees" | "positions";

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
	feeProfiles?: UserExchangeFeeProfile[];
};

export type PacificaUserExchangeData = {
	exchange: "pacifica";
	accountAddress?: string;
	feeProfiles?: UserExchangeFeeProfile[];
};

export type OkxUserExchangeData = {
	exchange: "okx";
	accountLevel?: string;
	feeProfiles?: UserExchangeFeeProfile[];
};

export type NadoUserExchangeData = {
	exchange: "nado";
	feeProfiles?: UserExchangeFeeProfile[];
};

export type EtherealUserExchangeData = {
	exchange: "ethereal";
	feeProfiles?: UserExchangeFeeProfile[];
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
