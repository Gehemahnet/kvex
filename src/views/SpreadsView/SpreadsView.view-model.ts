import { FilterMatchMode } from "@primevue/core/api";
import { computed, ref, shallowRef } from "vue";
import { useArbitrageLabSocket } from "../../hooks/useArbitrageLabSocket";
import type {
	ArbitrageOpportunity,
	OpportunityStatus,
} from "../../hooks/useArbitrageLabSocket/types";

const STATUS_FILTERS = [
	{ label: "Все", value: null },
	{ label: "Исполнимые", value: "executable" },
	{ label: "Пограничные", value: "marginal" },
	{ label: "Теоретические", value: "theoretical" },
] as const;

const MIN_SPREAD_FILTERS = [
	{ label: "Все", value: null },
	{ label: "> 0 bps", value: 0 },
	{ label: "> 5 bps", value: 5 },
	{ label: "> 10 bps", value: 10 },
	{ label: "> 15 bps", value: 15 },
	{ label: "> 25 bps", value: 25 },
] as const;

const MIN_SCORE_FILTERS = [
	{ label: "Все", value: null },
	{ label: "> 20", value: 20 },
	{ label: "> 40", value: 40 },
	{ label: "> 60", value: 60 },
	{ label: "> 80", value: 80 },
] as const;

// Русские названия статусов
const STATUS_LABELS: Record<string, string> = {
	executable: "Исполнимый",
	marginal: "Пограничный",
	theoretical: "Теоретический",
};

// Русские названия рисков
const RISK_LABELS: Record<string, string> = {
	latency_asymmetry: "Асимметрия задержки",
	stale_data: "Устаревшие данные",
	depth_imbalance: "Дисбаланс стакана",
	high_volatility: "Высокая волатильность",
};

export const useSpreadsViewModel = () => {
	const {
		opportunities,
		executableOpportunities,
		positiveOpportunities,
		exchangeStatus,
		isConnected,
		connectedExchanges,
		stats,
	} = useArbitrageLabSocket();

	const statusFilter = ref<OpportunityStatus | null>(null);
	const minNetSpreadBps = ref<number | null>(null);
	const minScore = ref<number | null>(null);

	const filters = ref({
		symbol: { value: null, matchMode: FilterMatchMode.CONTAINS },
	});

	// Detail modal state
	const selectedOpportunity = shallowRef<ArbitrageOpportunity | null>(null);
	const isDetailModalVisible = ref(false);

	const openDetailModal = (opportunity: ArbitrageOpportunity) => {
		selectedOpportunity.value = opportunity;
		isDetailModalVisible.value = true;
	};

	const closeDetailModal = () => {
		isDetailModalVisible.value = false;
		selectedOpportunity.value = null;
	};

	const filteredOpportunities = computed(() => {
		let result = opportunities.value;

		if (statusFilter.value !== null) {
			result = result.filter((o) => o.status === statusFilter.value);
		}

		if (minNetSpreadBps.value !== null) {
			result = result.filter((o) => o.netSpreadBps >= minNetSpreadBps.value!);
		}

		if (minScore.value !== null) {
			result = result.filter((o) => o.score >= minScore.value!);
		}

		return result;
	});

	const tableData = computed(() => {
		return filteredOpportunities.value.map((o) => ({
			...o,
			// Pre-calculate display values
			netSpreadBpsDisplay: o.netSpreadBps.toFixed(1),
			rawSpreadBpsDisplay: o.rawSpreadBps.toFixed(1),
			maxSizeDisplay: formatSize(o.maxExecutableSize),
			depthBuyDisplay: formatSize(o.depthBuyAt10Bps),
			depthSellDisplay: formatSize(o.depthSellAt10Bps),
			fundingDeltaDisplay: o.fundingDeltaBps.toFixed(2),
			lifetimeDisplay: formatLifetime(o.lifecycle.lifetimeMs),
			scoreDisplay: o.score.toFixed(0),
			volatilityDisplay: o.risk.volatility1m.toFixed(1),
			slippageDisplay: o.slippageAt1k.toFixed(1),
			occurrenceDisplay: o.lifecycle.occurrenceCount,
			peakSpreadDisplay: o.lifecycle.peakSpreadBps.toFixed(1),
			avgSpreadDisplay: o.lifecycle.avgSpreadBps.toFixed(1),
			statusLabel: STATUS_LABELS[o.status] || o.status,
			// Translate risks
			riskFlagsTranslated: o.risk.riskFlags.map(flag => RISK_LABELS[flag] || flag)
		}));
	});

	const setStatusFilter = (value: OpportunityStatus | null) => {
		statusFilter.value = value;
	};

	const setMinNetSpreadBps = (value: number | null) => {
		minNetSpreadBps.value = value;
	};

	const setMinScore = (value: number | null) => {
		minScore.value = value;
	};

	const connectedExchangesCount = computed(
		() => connectedExchanges.value.length,
	);

	return {
		// Data
		opportunities: filteredOpportunities,
		tableData,
		stats,

		// Filters
		filters,
		statusFilters: STATUS_FILTERS,
		minSpreadFilters: MIN_SPREAD_FILTERS,
		minScoreFilters: MIN_SCORE_FILTERS,
		statusFilter,
		minNetSpreadBps,
		minScore,
		setStatusFilter,
		setMinNetSpreadBps,
		setMinScore,

		// Status
		exchangeStatus,
		isConnected,
		connectedExchangesCount,

		// Detail modal
		selectedOpportunity,
		isDetailModalVisible,
		openDetailModal,
		closeDetailModal,
	};
};

// Helpers
function formatSize(value: number): string {
	if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
	if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
	return value.toFixed(0);
}

function formatLifetime(ms: number): string {
	if (ms < 1000) return `${ms}ms`;
	if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
	if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
	return `${(ms / 3600000).toFixed(1)}h`;
}
