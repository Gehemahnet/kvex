import { io, type Socket } from "socket.io-client";
import { type ComputedRef, type Ref, computed, onMounted, onUnmounted, ref, shallowRef } from "vue";
import type { ConnectionStatus, LowercaseExchange } from "../../common/types";
import type { ArbitrageOpportunity, ServerStats, SubscriptionConfig } from "./types";

const BFF_URL = import.meta.env.VITE_BFF_URL || "http://localhost:3002";

interface ServerToClientEvents {
	opportunity: (opp: ArbitrageOpportunity) => void;
	snapshot: (opps: ArbitrageOpportunity[]) => void;
	remove: (id: string) => void;
	status: (status: Record<LowercaseExchange, ConnectionStatus>) => void;
	stats: (stats: ServerStats) => void;
}

interface ClientToServerEvents {
	subscribe: (config?: SubscriptionConfig) => void;
	unsubscribe: () => void;
	subscribeToDetails: (opportunityId: string) => void;
	unsubscribeFromDetails: (opportunityId: string) => void;
}

/**
 * Интерфейс возвращаемого значения хука useArbitrageLabSocket.
 */
export interface UseArbitrageLabSocketReturn {
	/** Ссылка на активный сокет (для использования в других хуках) */
	socket: Ref<Socket<ServerToClientEvents, ClientToServerEvents> | null>;
	/** Все доступные возможности, отсортированные по Score (desc) */
	opportunities: ComputedRef<ArbitrageOpportunity[]>;
	/** Только возможности со статусом 'executable' */
	executableOpportunities: ComputedRef<ArbitrageOpportunity[]>;
	/** Возможности с положительным чистым спредом */
	positiveOpportunities: ComputedRef<ArbitrageOpportunity[]>;
	/** Возможности со статусом 'marginal' */
	marginalOpportunities: ComputedRef<ArbitrageOpportunity[]>;
	/** Сырая карта возможностей (ID -> Opportunity) */
	opportunitiesMap: Ref<Map<string, ArbitrageOpportunity>>;
	/** Статусы подключения к биржам */
	exchangeStatus: Ref<Record<LowercaseExchange, ConnectionStatus>>;
	/** Статистика сервера (аптайм, кол-во обновлений) */
	serverStats: Ref<ServerStats>;
	/** Агрегированная статистика для UI (всего, прибыльных и т.д.) */
	stats: ComputedRef<{
		total: number;
		executable: number;
		positive: number;
		marginal: number;
		avgScore: number;
		updatesPerSecond: number;
	}>;
	/** Флаг подключения к BFF серверу */
	isConnected: Ref<boolean>;
	/** Список подключенных бирж (массив строк) */
	connectedExchanges: ComputedRef<LowercaseExchange[]>;
	/** Функция получения возможности по ID */
	getOpportunity: (id: string) => ArbitrageOpportunity | undefined;
}

// Shared state (singleton)
let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;
const socketRef = ref<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);

const opportunitiesMap = shallowRef(new Map<string, ArbitrageOpportunity>());

const exchangeStatus = ref<Record<LowercaseExchange, ConnectionStatus>>({
	paradex: "disconnected",
	hyperliquid: "disconnected",
	pacifica: "disconnected",
	ethereal: "disconnected",
});

const serverStats = ref<ServerStats>({
	totalSymbols: 0,
	totalOpportunities: 0,
	executableCount: 0,
	avgScore: 0,
	updatesPerSecond: 0,
	uptime: 0,
});

const socketConnected = ref(false);
let refCount = 0;

const connectSocket = () => {
	if (socket) return;

	socket = io(BFF_URL, {
		path: "/v2",
		transports: ["websocket"],
		reconnection: true,
		reconnectionAttempts: 10,
		reconnectionDelay: 1000,
	});
	
	socketRef.value = socket;

	socket.on("connect", () => {
		console.log("[v2] Connected to server");
		socketConnected.value = true;
		socket?.emit("subscribe");
	});

	socket.on("disconnect", () => {
		console.log("[v2] Disconnected from server");
		socketConnected.value = false;
	});

	socket.on("snapshot", (data) => {
		console.log(`[v2] Snapshot received: ${data.length} items`);
		const newMap = new Map<string, ArbitrageOpportunity>();
		for (const opp of data) {
			newMap.set(opp.id, opp);
		}
		opportunitiesMap.value = newMap;
	});

	socket.on("opportunity", (opp) => {
		// console.log(`[v2] Update for ${opp.id}: ${opp.netSpreadBps.toFixed(2)} bps`);
		const newMap = new Map(opportunitiesMap.value);
		newMap.set(opp.id, opp);
		opportunitiesMap.value = newMap;
	});

	socket.on("remove", (id) => {
		const newMap = new Map(opportunitiesMap.value);
		newMap.delete(id);
		opportunitiesMap.value = newMap;
	});

	socket.on("status", (data) => {
		exchangeStatus.value = data;
	});

	socket.on("stats", (data) => {
		serverStats.value = data;
	});
};

const disconnectSocket = () => {
	if (!socket) return;
	socket.disconnect();
	socket = null;
	socketRef.value = null;
	socketConnected.value = false;
};

/**
 * Хук для подключения к WebSocket серверу арбитража (V2).
 * Использует паттерн Singleton для сокета: подключение создается один раз
 * и переиспользуется всеми компонентами.
 */
export const useArbitrageLabSocket = (): UseArbitrageLabSocketReturn => {
	onMounted(() => {
		refCount++;
		if (refCount === 1) {
			connectSocket();
		}
	});

	onUnmounted(() => {
		refCount--;
		if (refCount === 0) {
			disconnectSocket();
		}
	});

	// Sorted by score (desc)
	const opportunities = computed(() => {
		return Array.from(opportunitiesMap.value.values()).sort(
			(a, b) => b.score - a.score,
		);
	});

	// Only executable opportunities
	const executableOpportunities = computed(() => {
		return opportunities.value.filter((o) => o.status === "executable");
	});

	// All positive net spread opportunities
	const positiveOpportunities = computed(() => {
		return opportunities.value.filter((o) => o.netSpreadBps > 0);
	});

	// Marginal opportunities
	const marginalOpportunities = computed(() => {
		return opportunities.value.filter((o) => o.status === "marginal");
	});

	const connectedExchanges = computed(() =>
		Object.entries(exchangeStatus.value)
			.filter(([, status]) => status === "connected")
			.map(([exchange]) => exchange as LowercaseExchange),
	);

	const getOpportunity = (id: string) => opportunitiesMap.value.get(id);

	const stats = computed(() => ({
		total: opportunities.value.length,
		executable: executableOpportunities.value.length,
		positive: positiveOpportunities.value.length,
		marginal: marginalOpportunities.value.length,
		avgScore: serverStats.value.avgScore,
		updatesPerSecond: serverStats.value.updatesPerSecond,
	}));

	return {
		socket: socketRef,
		opportunities,
		executableOpportunities,
		positiveOpportunities,
		marginalOpportunities,
		opportunitiesMap,
		exchangeStatus,
		serverStats,
		stats,
		isConnected: socketConnected,
		connectedExchanges,
		getOpportunity,
	};
};
