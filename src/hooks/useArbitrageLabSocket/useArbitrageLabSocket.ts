import { io, type Socket } from "socket.io-client";
import { computed, onMounted, onUnmounted, ref, shallowRef } from "vue";
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
}

// Shared state (singleton)
let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

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
		const newMap = new Map<string, ArbitrageOpportunity>();
		for (const opp of data) {
			newMap.set(opp.id, opp);
		}
		opportunitiesMap.value = newMap;
	});

	socket.on("opportunity", (opp) => {
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
	socketConnected.value = false;
};

export const useArbitrageLabSocket = () => {
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
