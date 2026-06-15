import { computed, reactive } from "vue";
import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { portfolioApi } from "@api/portfolio";
import type {
	CreateUserExchangeTokenRequest,
	UserExchangePermission,
	UserExchangeTokenExchange,
} from "@api/portfolio";
import { useAuthSession } from "@views/Auth/Auth.composable";
import {
	DEFAULT_EXCHANGE_TOKEN_PERMISSIONS,
} from "../PortfolioOverview.constants";
import {
	USER_EXCHANGE_BALANCES_QUERY_KEY,
	USER_EXCHANGE_TOKENS_QUERY_KEY,
} from "../PortfolioOverview.query";

type ExchangeTokenForm = {
	accountAddress: string;
	address: string;
	apiKey: string;
	apiSecret: string;
	exchange: UserExchangeTokenExchange;
	expiresAt: string;
	label: string;
	passphrase: string;
	permissions: UserExchangePermission[];
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
	permissions: [...DEFAULT_EXCHANGE_TOKEN_PERMISSIONS],
});

/** Owns the Add Tokens dialog form and submit action. */
export const useAddTokenDialog = () => {
	const { authState } = useAuthSession();
	const queryClient = useQueryClient();
	const tokenForm = reactive<ExchangeTokenForm>(createInitialExchangeTokenForm());

	const requiresPassphrase = computed(() => tokenForm.exchange === "okx");
	const supportsAddress = computed(() => tokenForm.exchange === "hyperliquid");
	const supportsAccountAddress = computed(() => tokenForm.exchange === "pacifica");

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
		},
	});

	const resetTokenForm = () => {
		Object.assign(tokenForm, createInitialExchangeTokenForm());
	};

	const confirmExchangeToken = async () => {
		await createTokenMutation.mutateAsync();
		resetTokenForm();
	};

	return {
		confirmExchangeToken,
		isSavingExchangeToken: computed(() => createTokenMutation.isPending.value),
		requiresPassphrase,
		resetTokenForm,
		supportsAccountAddress,
		supportsAddress,
		tokenForm,
	};
};

const createTokenRequest = (
	form: ExchangeTokenForm,
): CreateUserExchangeTokenRequest => ({
	exchange: form.exchange,
	permissions: [...form.permissions],
	...readOptionalString("accountAddress", form.accountAddress),
	...readOptionalString("address", form.address),
	...readOptionalString("apiKey", form.apiKey),
	...readOptionalString("apiSecret", form.apiSecret),
	...readOptionalString("expiresAt", form.expiresAt),
	...readOptionalString("label", form.label),
	...readOptionalString("passphrase", form.passphrase),
});

const readOptionalString = <TKey extends keyof CreateUserExchangeTokenRequest>(
	key: TKey,
	value: string,
): Partial<Pick<CreateUserExchangeTokenRequest, TKey>> => {
	const normalizedValue = value.trim();

	return normalizedValue
		? { [key]: normalizedValue } as Partial<Pick<CreateUserExchangeTokenRequest, TKey>>
		: {};
};
