import { FilterMatchMode } from "@primevue/core/api";
import { computed, ref } from "vue";
import type { EnhancedSpreadOpportunity, OpportunityStatus } from "../../common/types";
import { useSpreadsLabSocket } from "../../hooks/useSpreadsLabSocket";

const STATUS_FILTERS = [
	{ label: "All", value: null },
	{ label: "Executable", value: "executable" },
	{ label: "Marginal", value: "marginal" },
	{ label: "Theoretical", value: "theoretical" },
] as const;

const MIN_SPREAD_FILTERS = [
	{ label: "All", value: null },
	{ label: "> 0 bps", value: 0 },
	{ label: "> 5 bps", value: 5 },
	{ label: "> 10 bps", value: 10 },
	{ label: "> 15 bps", value: 15 },
	{ label: "> 25 bps", value: 25 },
] as const;

export const useSpreadsLabViewModel = () => {
	const {
		spreads,
		executableOpportunities,
		positiveOpportunities,
		exchangeStatus,
		isConnected,
		connectedExchanges,
	} = useSpreadsLabSocket();

	const statusFilter = ref<OpportunityStatus | null>(null);
	const minNetSpreadBps = ref<number | null>(null);

	const filters = ref({
		symbol: { value: null, matchMode: FilterMatchMode.CONTAINS },
	});

	const filteredSpreads = computed(() => {
		let result = spreads.value;

		if (statusFilter.value !== null) {
			result = result.filter((s) => s.status === statusFilter.value);
		}

		if (minNetSpreadBps.value !== null) {
			result = result.filter((s) => s.netSpreadBps >= minNetSpreadBps.value!);
		}

		return result;
	});

	const tableData = computed(() => {
		return filteredSpreads.value.map((s) => ({
			...s,
			// Pre-calculate display values
			netSpreadBpsDisplay: s.netSpreadBps.toFixed(1),
			rawSpreadBpsDisplay: s.rawSpreadBps.toFixed(1),
			maxSizeDisplay: s.maxExecutableSize.toFixed(0),
			depthBidDisplay: s.buyData.bidDepthAtBps.bps10.toFixed(0),
			depthAskDisplay: s.sellData.askDepthAtBps.bps10.toFixed(0),
			totalFeesDisplay: s.totalFeesBps.toFixed(1),
			fundingDisplay: s.fundingCostBps.toFixed(2),
			lifetimeDisplay: (s.lifetimeMs / 1000).toFixed(1),
			scoreDisplay: s.score.toFixed(1),
		}));
	});

	const stats = computed(() => ({
		total: spreads.value.length,
		executable: executableOpportunities.value.length,
		positive: positiveOpportunities.value.length,
		avgScore: spreads.value.length > 0
			? (spreads.value.reduce((sum, s) => sum + s.score, 0) / spreads.value.length).toFixed(1)
			: "0",
	}));

	const setStatusFilter = (value: OpportunityStatus | null) => {
		statusFilter.value = value;
	};

	const setMinNetSpreadBps = (value: number | null) => {
		minNetSpreadBps.value = value;
	};

	const connectedExchangesCount = computed(
		() => connectedExchanges.value.length,
	);

	return {
		// Data
		spreads: filteredSpreads,
		tableData,
		stats,

		// Filters
		filters,
		statusFilters: STATUS_FILTERS,
		minSpreadFilters: MIN_SPREAD_FILTERS,
		statusFilter,
		minNetSpreadBps,
		setStatusFilter,
		setMinNetSpreadBps,

		// Status
		exchangeStatus,
		isConnected,
		connectedExchangesCount,
	};
};
