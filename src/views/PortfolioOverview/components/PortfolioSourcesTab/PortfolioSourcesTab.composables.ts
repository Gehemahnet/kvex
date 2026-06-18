import { createSharedComposable } from "@vueuse/core";
import {
	useMutation,
	useQueryClient,
} from "@tanstack/vue-query";
import { useToast } from "primevue/usetoast";
import { computed, ref } from "vue";
import { portfolioApi } from "@api/portfolio";
import { useAuthSession } from "@views/Auth/Auth.composable";
import {
	createPortfolioExchangeTokenRows,
	formatPortfolioSource,
	formatUsdValue,
} from "../../Portfolio.utils";
import {
	USER_EXCHANGE_BALANCES_QUERY_KEY,
	USER_EXCHANGE_TOKENS_QUERY_KEY,
	USER_PORTFOLIO_BALANCES_QUERY_KEY,
	USER_PORTFOLIO_SOURCES_QUERY_KEY,
	USER_WALLET_BALANCES_QUERY_KEY,
	useUserExchangeTokensQuery,
	useUserPortfolioBalancesQuery,
	useUserPortfolioSourcesQuery,
} from "../../Portfolio.query";
import type {
	PortfolioExchangeTokenRow,
	PortfolioWalletSourceRow,
} from "../../Portfolio.types";

/** Owns tracked wallet sources, wallet dialog state, and wallet validation. */
export const usePortfolioSourcesTab = createSharedComposable(() => {
	const { authState } = useAuthSession();
	const queryClient = useQueryClient();
	const toast = useToast();

	const userPortfolioSourcesQuery = useUserPortfolioSourcesQuery();
	const userExchangeTokensQuery = useUserExchangeTokensQuery();
	const portfolioBalancesQuery = useUserPortfolioBalancesQuery();

	const isTokenDialogVisible = ref(false);
	const isWalletDialogVisible = ref(false);
	const walletDeleteCandidate = ref<PortfolioWalletSourceRow | null>(null);
	const tokenDeleteCandidate = ref<PortfolioExchangeTokenRow | null>(null);
	const tokenEditCandidate = ref<PortfolioExchangeTokenRow | null>(null);
	const tokenLabelDraft = ref("");
	const isDeleteExchangeTokenDialogVisible = computed({
		get: () => tokenDeleteCandidate.value !== null,
		set: (isVisible: boolean) => {
			if (!isVisible) {
				tokenDeleteCandidate.value = null;
			}
		},
	});
	const isEditExchangeTokenDialogVisible = computed({
		get: () => tokenEditCandidate.value !== null,
		set: (isVisible: boolean) => {
			if (!isVisible) {
				tokenEditCandidate.value = null;
				tokenLabelDraft.value = "";
			}
		},
	});
	const isDeleteWalletSourceDialogVisible = computed({
		get: () => walletDeleteCandidate.value !== null,
		set: (isVisible: boolean) => {
			if (!isVisible) {
				walletDeleteCandidate.value = null;
			}
		},
	});

	const confirmWalletSourceDelete = async () => {
		const source = walletDeleteCandidate.value;

		if (source === null) {
			return;
		}

		await deleteSourceMutation.mutateAsync(source.id);
		walletDeleteCandidate.value = null;
	};

	const removeExchangeToken = async (id: string) => {
		await deleteExchangeTokenMutation.mutateAsync(id);
	};

	const confirmExchangeTokenDelete = async () => {
		const token = tokenDeleteCandidate.value;

		if (token === null) {
			return;
		}

		await deleteExchangeTokenMutation.mutateAsync(token.id);
		tokenDeleteCandidate.value = null;
	};

	const confirmExchangeTokenLabel = async () => {
		const token = tokenEditCandidate.value;

		if (
			token === null ||
			tokenLabelDraft.value.trim().length === 0 ||
			tokenLabelDraft.value.trim() === token.label
		) {
			return;
		}

		await updateExchangeTokenMutation.mutateAsync({
			id: token.id,
			label: tokenLabelDraft.value,
		});
		tokenEditCandidate.value = null;
		tokenLabelDraft.value = "";
	};

	const refreshPortfolioTables = async () => {
		await userPortfolioSourcesQuery.refetch();
		await userExchangeTokensQuery.refetch();
		await portfolioBalancesQuery.refetch();
		await queryClient.invalidateQueries({ queryKey: USER_WALLET_BALANCES_QUERY_KEY });
		await queryClient.invalidateQueries({ queryKey: USER_EXCHANGE_BALANCES_QUERY_KEY });
		await queryClient.invalidateQueries({ queryKey: USER_PORTFOLIO_BALANCES_QUERY_KEY });
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
			...createValueFields(
				walletSourceValueByKey.value.get(createWalletSourceValueKey(source.network, source.address)),
			),
		})),
	);

	const exchangeTokenRows = computed<PortfolioExchangeTokenRow[]>(() =>
		createPortfolioExchangeTokenRows(userExchangeTokensQuery.data.value ?? [])
			.map((row) => ({
				...row,
				...createValueFields(exchangeSourceValueById.value.get(row.id)),
			})),
	);

	const walletSourceValueByKey = computed(() => {
		const totals = new Map<string, number>();

		for (const balance of portfolioBalancesQuery.data.value?.walletBalances.balances ?? []) {
			if (balance.valueUsd === undefined) {
				continue;
			}

			const key = createWalletSourceValueKey(balance.source.network, balance.source.address);
			totals.set(key, (totals.get(key) ?? 0) + balance.valueUsd);
		}

		return totals;
	});

	const exchangeSourceValueById = computed(() => {
		const totals = new Map<string, number>();

		for (const balance of portfolioBalancesQuery.data.value?.exchangeBalances.balances ?? []) {
			const totalValueUsd = balance.totalValueUsd ??
				balance.assets.reduce((total, asset) => total + (asset.valueUsd ?? 0), 0);

			totals.set(balance.accountId, totalValueUsd);
		}

		return totals;
	});

	const deleteSourceMutation = useMutation({
		mutationFn: (id: string) => {
			const csrfToken = authState.value?.csrfToken;

			if (!csrfToken) {
				throw new Error("CSRF token is missing");
			}

			return portfolioApi.deleteUserPortfolioSource(id, csrfToken);
		},
		onSuccess: () => {
			invalidatePortfolioTables();
			showSuccessToast("Wallet source deleted");
		},
		onError: (error) => {
			showErrorToast("Wallet source was not deleted", error);
		},
	});

	const deleteExchangeTokenMutation = useMutation({
		mutationFn: (id: string) => {
			const csrfToken = authState.value?.csrfToken;

			if (!csrfToken) {
				throw new Error("CSRF token is missing");
			}

			return portfolioApi.deleteUserExchangeToken(id, csrfToken);
		},
		onSuccess: () => {
			invalidatePortfolioTables();
			showSuccessToast("Exchange token deleted");
		},
		onError: (error) => {
			showErrorToast("Exchange token was not deleted", error);
		},
	});

	const updateExchangeTokenMutation = useMutation({
		mutationFn: (params: { id: string; label: string }) => {
			const csrfToken = authState.value?.csrfToken;

			if (!csrfToken) {
				throw new Error("CSRF token is missing");
			}

			return portfolioApi.updateUserExchangeToken(
				params.id,
				{ label: params.label.trim() },
				csrfToken,
			);
		},
		onSuccess: () => {
			invalidatePortfolioTables();
			showSuccessToast("Exchange token label updated");
		},
		onError: (error) => {
			showErrorToast("Exchange token label was not updated", error);
		},
	});

	const openDeleteExchangeTokenDialog = (token: PortfolioExchangeTokenRow) => {
		tokenDeleteCandidate.value = token;
	};

	const openDeleteWalletSourceDialog = (source: PortfolioWalletSourceRow) => {
		walletDeleteCandidate.value = source;
	};

	const openEditExchangeTokenDialog = (token: PortfolioExchangeTokenRow) => {
		tokenEditCandidate.value = token;
		tokenLabelDraft.value = token.label;
	};

	return {
		confirmExchangeTokenDelete,
		confirmExchangeTokenLabel,
		confirmWalletSourceDelete,
		exchangeTokenRows,
		isDeleteExchangeTokenDialogVisible,
		isDeleteWalletSourceDialogVisible,
		isDeletingExchangeToken: computed(() => deleteExchangeTokenMutation.isPending.value),
		isEditExchangeTokenDialogVisible,
		isEditingExchangeToken: computed(() => updateExchangeTokenMutation.isPending.value),
		isTokenDialogVisible,
		isWalletDialogVisible,
		isSavingWalletSource: computed(() =>
			deleteSourceMutation.isPending.value || deleteExchangeTokenMutation.isPending.value
		),
		canSaveExchangeTokenLabel: computed(() =>
			tokenEditCandidate.value !== null &&
			tokenLabelDraft.value.trim().length > 0 &&
			tokenLabelDraft.value.trim() !== tokenEditCandidate.value.label
		),
		openDeleteExchangeTokenDialog,
		openDeleteWalletSourceDialog,
		openEditExchangeTokenDialog,
		removeExchangeToken,
		refreshPortfolioTables,
		tokenDeleteCandidate,
		tokenEditCandidate,
		tokenLabelDraft,
		userExchangeTokensQuery,
		userPortfolioSourcesQuery,
		walletAddresses,
		walletDeleteCandidate,
		walletSourceRows,
	};

	function invalidatePortfolioTables() {
		void queryClient.invalidateQueries({ queryKey: USER_EXCHANGE_BALANCES_QUERY_KEY });
		void queryClient.invalidateQueries({ queryKey: USER_EXCHANGE_TOKENS_QUERY_KEY });
		void queryClient.invalidateQueries({ queryKey: USER_PORTFOLIO_BALANCES_QUERY_KEY });
		void queryClient.invalidateQueries({ queryKey: USER_PORTFOLIO_SOURCES_QUERY_KEY });
		void queryClient.invalidateQueries({ queryKey: USER_WALLET_BALANCES_QUERY_KEY });
	}

	function showSuccessToast(summary: string) {
		toast.add({
			severity: "success",
			summary,
			life: 3000,
		});
	}

	function showErrorToast(summary: string, error: unknown) {
		toast.add({
			severity: "error",
			summary,
			detail: getErrorToastDetail(error),
			life: 5000,
		});
	}
});

const getErrorToastDetail = (error: unknown): string =>
	error instanceof Error ? error.message : "Please try again.";

const createWalletSourceValueKey = (network: string, address: string): string =>
	`${network}:${address.toLowerCase()}`;

const createValueFields = (
	valueUsd: number | undefined,
): Pick<PortfolioWalletSourceRow, "valueUsd" | "valueUsdLabel"> => ({
	...(valueUsd === undefined ? {} : { valueUsd }),
	valueUsdLabel: valueUsd === undefined ? "-" : formatUsdValue(valueUsd),
});
