import type {
	CreateUserExchangeTokenRequest,
	UserExchangePermission,
	UserExchangeTokenExchange,
} from "@api/portfolio";

export type ExchangeTokenFormFieldName =
	| "accountAddress"
	| "address"
	| "apiKey"
	| "apiSecret"
	| "expiresAt"
	| "passphrase"
	| "subaccountName";

export type ExchangeTokenPermissionType =
	| "readBalances"
	| "trading";

export type ExchangeTokenFormFieldConfig = {
	autocomplete?: string;
	defaultValue?: string;
	label: string;
	name: ExchangeTokenFormFieldName;
	placeholder: string;
	required?: boolean;
	type?: "date" | "password" | "text";
};

export type ExchangeTokenPermissionOptionConfig = {
	disabled?: boolean;
	disabledReason?: string;
	fields: ExchangeTokenFormFieldConfig[];
	label: string;
	permissions: UserExchangePermission[];
	value: ExchangeTokenPermissionType;
};

export type ExchangeTokenFormConfig = {
	disabled?: boolean;
	disabledReason?: string;
	label: string;
	permissions: ExchangeTokenPermissionOptionConfig[];
	value: UserExchangeTokenExchange;
};

const okxCredentialsFields: ExchangeTokenFormFieldConfig[] = [
	{
		autocomplete: "off",
		label: "API key",
		name: "apiKey",
		placeholder: "API key",
		required: true,
	},
	{
		autocomplete: "off",
		label: "API secret",
		name: "apiSecret",
		placeholder: "Secret key",
		required: true,
		type: "password",
	},
	{
		autocomplete: "off",
		label: "Passphrase",
		name: "passphrase",
		placeholder: "OKX passphrase",
		required: true,
		type: "password",
	},
];

const walletAddressField = (
	label: string,
	placeholder = "0x...",
): ExchangeTokenFormFieldConfig => ({
	label,
	name: "address",
	placeholder,
	required: true,
});

const accountAddressField = (
	label: string,
	placeholder = "Account address",
): ExchangeTokenFormFieldConfig => ({
	label,
	name: "accountAddress",
	placeholder,
	required: true,
});

const tradingPermissionDisabled: ExchangeTokenPermissionOptionConfig = {
	disabled: true,
	disabledReason: "execution is not wired yet",
	fields: [],
	label: "Trading",
	permissions: ["orders", "trades"],
	value: "trading",
};

const sortDisabledOptionsLast = <Option extends { disabled: boolean }>(
	first: Option,
	second: Option,
): number => Number(first.disabled) - Number(second.disabled);

export const EXCHANGE_TOKEN_FORM_CONFIGS: Record<
	UserExchangeTokenExchange,
	ExchangeTokenFormConfig
> = {
	ethereal: {
		label: "Ethereal",
		permissions: [{
			fields: [
				walletAddressField("Owner wallet address"),
				{
					defaultValue: "primary",
					label: "Subaccount name",
					name: "subaccountName",
					placeholder: "primary",
					required: true,
				},
			],
			label: "Read-only portfolio & trading",
			permissions: ["balances", "trades"],
			value: "readBalances",
		}],
		value: "ethereal",
	},
	hyperliquid: {
		label: "Hyperliquid",
		permissions: [
			{
				fields: [walletAddressField("Account address")],
				label: "Balances",
				permissions: ["balances"],
				value: "readBalances",
			},
			tradingPermissionDisabled,
		],
		value: "hyperliquid",
	},
	nado: {
		label: "Nado",
		permissions: [
			{
				fields: [
					walletAddressField("Owner wallet address"),
					{
						defaultValue: "default",
						label: "Subaccount name",
						name: "subaccountName",
						placeholder: "default",
						required: true,
					},
				],
				label: "Balances",
				permissions: ["balances"],
				value: "readBalances",
			},
			tradingPermissionDisabled,
		],
		value: "nado",
	},
	okx: {
		label: "OKX",
		permissions: [
			{
				fields: okxCredentialsFields,
				label: "Balances",
				permissions: ["balances"],
				value: "readBalances",
			},
			tradingPermissionDisabled,
		],
		value: "okx",
	},
	pacifica: {
		disabled: true,
		disabledReason: "balance endpoint is not wired yet",
		label: "Pacifica",
		permissions: [
			{
				disabled: true,
				disabledReason: "balance endpoint is not wired yet",
				fields: [accountAddressField("Pacifica account")],
				label: "Balances",
				permissions: ["balances"],
				value: "readBalances",
			},
		],
		value: "pacifica",
	},
	variational: {
		disabled: true,
		disabledReason: "portfolio connection is not wired yet",
		label: "Variational",
		permissions: [],
		value: "variational",
	},
};

export const EXCHANGE_TOKEN_FORM_EXCHANGE_OPTIONS = Object.values(
	EXCHANGE_TOKEN_FORM_CONFIGS,
)
	.map((config) => ({
		disabled: config.disabled === true,
		label: config.disabledReason
			? `${config.label} (${config.disabledReason})`
			: config.label,
		value: config.value,
	}))
	.sort(sortDisabledOptionsLast);

export const createExchangeTokenPermissionOptions = (
	exchange: UserExchangeTokenExchange,
): Array<{
	disabled: boolean;
	label: string;
	value: ExchangeTokenPermissionType;
}> =>
	EXCHANGE_TOKEN_FORM_CONFIGS[exchange].permissions
		.map((permission) => ({
			disabled: permission.disabled === true,
			label: permission.disabledReason
				? `${permission.label} (${permission.disabledReason})`
				: permission.label,
			value: permission.value,
		}))
		.sort(sortDisabledOptionsLast);

export const getDefaultPermissionType = (
	exchange: UserExchangeTokenExchange,
): ExchangeTokenPermissionType | undefined =>
	EXCHANGE_TOKEN_FORM_CONFIGS[exchange].permissions.find(
		(permission) => permission.disabled !== true,
	)?.value;

export const getExchangePermissionConfig = (
	exchange: UserExchangeTokenExchange,
	permissionType: ExchangeTokenPermissionType | undefined,
): ExchangeTokenPermissionOptionConfig | undefined =>
	EXCHANGE_TOKEN_FORM_CONFIGS[exchange].permissions.find(
		(permission) => permission.value === permissionType,
	);

export const createConfiguredTokenRequestFields = (
	fields: ExchangeTokenFormFieldConfig[],
	values: Record<ExchangeTokenFormFieldName, string>,
): Partial<CreateUserExchangeTokenRequest> =>
	fields.reduce<Partial<CreateUserExchangeTokenRequest>>((request, field) => {
		const value = values[field.name].trim();

		if (!value) {
			return request;
		}

		return {
			...request,
			[field.name]: value,
		};
	}, {});
