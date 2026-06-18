import { computed, reactive, watch } from "vue";
import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { useToast } from "primevue/usetoast";
import { portfolioApi } from "@api/portfolio";
import type {
	CreateUserExchangeTokenRequest,
	UserExchangeTokenExchange,
} from "@api/portfolio";
import { useAuthSession } from "@views/Auth/Auth.composable";
import {
	createConfiguredTokenRequestFields,
	createExchangeTokenPermissionOptions,
	EXCHANGE_TOKEN_FORM_CONFIGS,
	EXCHANGE_TOKEN_FORM_EXCHANGE_OPTIONS,
	getDefaultPermissionType,
	getExchangePermissionConfig,
	type ExchangeTokenFormFieldConfig,
	type ExchangeTokenFormFieldName,
	type ExchangeTokenPermissionType,
} from "./PortfolioAddTokenDialog.config";
import {
	USER_EXCHANGE_BALANCES_QUERY_KEY,
	USER_EXCHANGE_TOKENS_QUERY_KEY,
	USER_PORTFOLIO_BALANCES_QUERY_KEY,
} from "../../../../Portfolio.query";

type ExchangeTokenForm = {
	accountAddress: string;
	address: string;
	apiKey: string;
	apiSecret: string;
	exchange: UserExchangeTokenExchange;
	expiresAt: string;
	label: string;
	passphrase: string;
	permissionType?: ExchangeTokenPermissionType;
	subaccountName: string;
};

const createInitialExchangeTokenForm = (): ExchangeTokenForm => ({
	accountAddress: "",
	address: "",
	apiKey: "",
	apiSecret: "",
	exchange: "okx",
	expiresAt: "",
	label: "",
	passphrase: "",
	permissionType: getDefaultPermissionType("okx"),
	subaccountName: "",
});

/** Owns the Add Tokens dialog form and submit action. */
export const useAddTokenDialog = () => {
	const { authState } = useAuthSession();
	const queryClient = useQueryClient();
	const toast = useToast();
	const tokenForm = reactive<ExchangeTokenForm>(createInitialExchangeTokenForm());

	const selectedExchangeConfig = computed(() =>
		EXCHANGE_TOKEN_FORM_CONFIGS[tokenForm.exchange]
	);
	const permissionOptions = computed(() =>
		createExchangeTokenPermissionOptions(tokenForm.exchange)
	);
	const selectedPermissionConfig = computed(() =>
		getExchangePermissionConfig(tokenForm.exchange, tokenForm.permissionType)
	);
	const visibleFields = computed<ExchangeTokenFormFieldConfig[]>(() =>
		selectedPermissionConfig.value?.fields ?? []
	);
	const canSaveExchangeToken = computed(() =>
		selectedExchangeConfig.value.disabled !== true &&
		selectedPermissionConfig.value !== undefined &&
		selectedPermissionConfig.value.disabled !== true &&
		visibleFields.value.every((field) =>
			field.required !== true || tokenForm[field.name].trim() !== ""
		),
	);

	watch(
		() => tokenForm.exchange,
		(exchange) => {
			tokenForm.permissionType = getDefaultPermissionType(exchange);
			clearExchangeTokenFields(tokenForm);
			applyExchangeTokenFieldDefaults(tokenForm);
		},
	);

	watch(
		() => tokenForm.permissionType,
		() => {
			clearExchangeTokenFields(tokenForm);
			applyExchangeTokenFieldDefaults(tokenForm);
		},
	);

	const createTokenMutation = useMutation({
		mutationFn: () => {
			const csrfToken = authState.value?.csrfToken;

			if (!csrfToken) {
				throw new Error("CSRF token is missing");
			}

			return portfolioApi.createUserExchangeTokens({
				tokens: [createTokenRequest(tokenForm)],
			}, csrfToken);
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: USER_EXCHANGE_TOKENS_QUERY_KEY });
			void queryClient.invalidateQueries({ queryKey: USER_EXCHANGE_BALANCES_QUERY_KEY });
			void queryClient.invalidateQueries({ queryKey: USER_PORTFOLIO_BALANCES_QUERY_KEY });
			toast.add({
				severity: "success",
				summary: "Exchange token added",
				life: 3000,
			});
		},
		onError: (error) => {
			toast.add({
				severity: "error",
				summary: "Exchange token was not added",
				detail: getErrorToastDetail(error),
				life: 5000,
			});
		},
	});

	const resetTokenForm = () => {
		Object.assign(tokenForm, createInitialExchangeTokenForm());
	};

	const confirmExchangeToken = async () => {
		if (!canSaveExchangeToken.value) {
			return;
		}

		await createTokenMutation.mutateAsync();
		resetTokenForm();
	};

	return {
		canSaveExchangeToken,
		confirmExchangeToken,
		exchangeOptions: EXCHANGE_TOKEN_FORM_EXCHANGE_OPTIONS,
		isSavingExchangeToken: computed(() => createTokenMutation.isPending.value),
		permissionOptions,
		resetTokenForm,
		selectedExchangeConfig,
		selectedPermissionConfig,
		tokenForm,
		visibleFields,
	};
};

const getErrorToastDetail = (error: unknown): string =>
	error instanceof Error ? error.message : "Please try again.";

const createTokenRequest = (
	form: ExchangeTokenForm,
): CreateUserExchangeTokenRequest => {
	const permissionConfig = getExchangePermissionConfig(
		form.exchange,
		form.permissionType,
	);

	if (!permissionConfig || permissionConfig.disabled === true) {
		throw new Error("Exchange token permission is unavailable");
	}

	return {
		exchange: form.exchange,
		permissions: [...permissionConfig.permissions],
		...createConfiguredTokenRequestFields(permissionConfig.fields, form),
		...readOptionalString("label", form.label),
	};
};

const readOptionalString = <TKey extends keyof CreateUserExchangeTokenRequest>(
	key: TKey,
	value: string,
): Partial<Pick<CreateUserExchangeTokenRequest, TKey>> => {
	const normalizedValue = value.trim();

	return normalizedValue
		? { [key]: normalizedValue } as Partial<Pick<CreateUserExchangeTokenRequest, TKey>>
		: {};
};

const clearExchangeTokenFields = (form: ExchangeTokenForm): void => {
	const fields: ExchangeTokenFormFieldName[] = [
		"accountAddress",
		"address",
		"apiKey",
		"apiSecret",
		"expiresAt",
		"passphrase",
		"subaccountName",
	];

	for (const field of fields) {
		form[field] = "";
	}
};

const applyExchangeTokenFieldDefaults = (form: ExchangeTokenForm): void => {
	const permissionConfig = getExchangePermissionConfig(
		form.exchange,
		form.permissionType,
	);

	for (const field of permissionConfig?.fields ?? []) {
		if (field.defaultValue !== undefined && form[field.name].trim() === "") {
			form[field.name] = field.defaultValue;
		}
	}
};
