import {
	useMutation,
	useQueryClient,
} from "@tanstack/vue-query";
import useVuelidate from "@vuelidate/core";
import { useToast } from "primevue/usetoast";
import {
	computed,
	nextTick,
	ref,
} from "vue";
import {
	portfolioApi,
	type CreateUserPortfolioSourceRequest,
	type WalletBalanceNetwork,
} from "@api/portfolio";
import { useAuthSession } from "@views/Auth/Auth.composable";
import {
	USER_PORTFOLIO_SOURCES_QUERY_KEY,
	USER_WALLET_BALANCES_QUERY_KEY,
} from "@views/PortfolioOverview/Portfolio.query";
import {
	parseSolanaWalletAddressesInput,
	parseWalletAddressesInput,
} from "@views/PortfolioOverview/Portfolio.utils";
import type { WalletType } from "@shared/types";
import { validationRules } from "@shared/utils/validation";

export const useAddWalletDialog = () => {
	const walletForm = ref({
		addresses: "",
	});
	const activeWalletNetwork = ref<WalletType>("evm");
	const queryClient = useQueryClient();
	const toast = useToast();

	const { validateAddress, requiredField } = validationRules;

	const { authState } = useAuthSession();

	const createSourceMutation = useMutation({
		mutationFn: (sources: CreateUserPortfolioSourceRequest[]) => {
			const session = authState.value;

			if (!session) {
				throw new Error("Not authenticated");
			}

			return portfolioApi.createUserPortfolioSources({ sources }, session.csrfToken);
		},
		onSuccess: () => {
			invalidatePortfolioTables();
			toast.add({
				severity: "success",
				summary: "Wallet source added",
				life: 3000,
			});
		},
		onError: (error) => {
			toast.add({
				severity: "error",
				summary: "Wallet source was not added",
				detail: getErrorToastDetail(error),
				life: 5000,
			});
		},
	});

	const confirmWalletAddresses = async () => {
		const isValid = await walletValidation.value.$validate();

		if (!isValid) {
			return;
		}

		const parser = activeWalletNetwork.value === "evm"
			? parseWalletAddressesInput
			: parseSolanaWalletAddressesInput;
		const addresses = parser(walletForm.value.addresses);
		await createSourceMutation.mutateAsync(
			addresses.map((address) => ({
				address,
				network: activeWalletNetwork.value,
			})),
		);
	};

	const walletRules = computed(() => ({
		addresses: {
			requiredField,
			walletAddresses: validateAddress(activeWalletNetwork),
		},
	}));

	const walletValidation = useVuelidate(walletRules, walletForm);

	const setWalletNetwork = (network: WalletBalanceNetwork) => {
		activeWalletNetwork.value = network;
		walletForm.value.addresses = "";
		void nextTick(() => {
			walletValidation.value.$reset();
		});
	};

	return {
		activeWalletNetwork,
		confirmWalletAddresses,
		setWalletNetwork,
		walletForm,
		walletValidation,
	};

	function invalidatePortfolioTables() {
		void queryClient.invalidateQueries({ queryKey: USER_PORTFOLIO_SOURCES_QUERY_KEY });
		void queryClient.invalidateQueries({ queryKey: USER_WALLET_BALANCES_QUERY_KEY });
	}

};

const getErrorToastDetail = (error: unknown): string =>
	error instanceof Error ? error.message : "Please try again.";
