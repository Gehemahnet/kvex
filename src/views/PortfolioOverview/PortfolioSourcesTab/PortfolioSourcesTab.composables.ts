import { createSharedComposable } from "@vueuse/core";
import {
	useMutation,
	useQueryClient,
} from "@tanstack/vue-query";
import { computed, ref } from "vue";
import { portfolioApi } from "@api/portfolio";
import { useAuthSession } from "@views/Auth/Auth.composable";
import {
	createPortfolioExchangeTokenRows,
	formatPortfolioSource,
} from "../PortfolioOverview.utils";
import {
	USER_EXCHANGE_BALANCES_QUERY_KEY,
	USER_EXCHANGE_TOKENS_QUERY_KEY,
	USER_PORTFOLIO_SOURCES_QUERY_KEY,
	USER_WALLET_BALANCES_QUERY_KEY,
	useUserExchangeTokensQuery,
	useUserPortfolioSourcesQuery,
} from "../PortfolioOverview.query";
import type {
	PortfolioExchangeTokenRow,
	PortfolioWalletSourceRow,
} from "../PortfolioOverview.types";

/** Owns tracked wallet sources, wallet dialog state, and wallet validation. */
export const usePortfolioSourcesTab = createSharedComposable(() => {
	const { authState } = useAuthSession();
	const queryClient = useQueryClient();

	const userPortfolioSourcesQuery = useUserPortfolioSourcesQuery();
	const userExchangeTokensQuery = useUserExchangeTokensQuery();

	const isTokenDialogVisible = ref(false);
	const isWalletDialogVisible = ref(false);

	const removeWalletSource = async (id: string) => {
		await deleteSourceMutation.mutateAsync(id);
	};

	const removeExchangeToken = async (id: string) => {
		await deleteExchangeTokenMutation.mutateAsync(id);
	};

	const refreshPortfolioTables = async () => {
		await userPortfolioSourcesQuery.refetch();
		await userExchangeTokensQuery.refetch();
		await queryClient.invalidateQueries({ queryKey: USER_WALLET_BALANCES_QUERY_KEY });
		await queryClient.invalidateQueries({ queryKey: USER_EXCHANGE_BALANCES_QUERY_KEY });
	};

	const walletAddresses = computed(() =>
		walletSourceRows.value.map((source) => source.address),
	);

	const walletSourceRows = computed<PortfolioWalletSourceRow[]>(() =>
		(userPortfolioSourcesQuery.data.value ?? []).map((source) => ({
			id: source.id,
			address: source.address,
			...(source.label === undefined ? {} : { label: source.label }),
			network: source.network,
			sourceLabel: source.label ?? formatPortfolioSource(source.address),
			status: source.status,
		})),
	);

	const exchangeTokenRows = computed<PortfolioExchangeTokenRow[]>(() =>
		createPortfolioExchangeTokenRows(userExchangeTokensQuery.data.value ?? []),
	);

	const deleteSourceMutation = useMutation({
		mutationFn: (id: string) => {
			const csrfToken = authState.value?.csrfToken;

			if (!csrfToken) {
				throw new Error("CSRF token is missing");
			}

			return portfolioApi.deleteUserPortfolioSource(id, csrfToken);
		},
		onSuccess: invalidatePortfolioTables,
	});

	const deleteExchangeTokenMutation = useMutation({
		mutationFn: (id: string) => {
			const csrfToken = authState.value?.csrfToken;

			if (!csrfToken) {
				throw new Error("CSRF token is missing");
			}

			return portfolioApi.deleteUserExchangeToken(id, csrfToken);
		},
		onSuccess: invalidatePortfolioTables,
	});

	const openAddTokenDialog = () => {
		isTokenDialogVisible.value = true;
	};

	const openAddWalletDialog = () => {
		isWalletDialogVisible.value = true;
	};

	return {
		exchangeTokenRows,
		isTokenDialogVisible,
		isWalletDialogVisible,
		isSavingWalletSource: computed(() =>
			deleteSourceMutation.isPending.value || deleteExchangeTokenMutation.isPending.value
		),
		openAddTokenDialog,
		openAddWalletDialog,
		removeExchangeToken,
		removeWalletSource,
		refreshPortfolioTables,
		userExchangeTokensQuery,
		userPortfolioSourcesQuery,
		walletAddresses,
		walletSourceRows,
	};

	function invalidatePortfolioTables() {
		void queryClient.invalidateQueries({ queryKey: USER_EXCHANGE_BALANCES_QUERY_KEY });
		void queryClient.invalidateQueries({ queryKey: USER_EXCHANGE_TOKENS_QUERY_KEY });
		void queryClient.invalidateQueries({ queryKey: USER_PORTFOLIO_SOURCES_QUERY_KEY });
		void queryClient.invalidateQueries({ queryKey: USER_WALLET_BALANCES_QUERY_KEY });
	}
});
