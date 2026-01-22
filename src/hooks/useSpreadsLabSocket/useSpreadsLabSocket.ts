import { io, type Socket } from "socket.io-client";
import { computed, onMounted, onUnmounted, ref, shallowRef } from "vue";
import type {
	ConnectionStatus,
	EnhancedSpreadOpportunity,
	LowercaseExchange,
} from "../../common/types";

const BFF_URL = import.meta.env.VITE_BFF_URL || "http://localhost:3001";

interface ServerToClientEvents {
	labSpread: (opportunity: EnhancedSpreadOpportunity) => void;
	labSnapshot: (opportunities: EnhancedSpreadOpportunity[]) => void;
	status: (status: Record<LowercaseExchange, ConnectionStatus>) => void;
}

interface ClientToServerEvents {
	subscribeLab: () => void;
}

// Shared state (singleton)
let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

const spreadsMap = shallowRef(new Map<string, EnhancedSpreadOpportunity>());

const exchangeStatus = ref<Record<LowercaseExchange, ConnectionStatus>>({
	paradex: "disconnected",
	hyperliquid: "disconnected",
	pacifica: "disconnected",
	ethereal: "disconnected",
});
const socketConnected = ref(false);
let refCount = 0;

const connectSocket = () => {
	if (socket) return;

	socket = io(BFF_URL, {
		transports: ["websocket"],
		reconnection: true,
		reconnectionAttempts: 10,
		reconnectionDelay: 1000,
	});

	socket.on("connect", () => {
		socketConnected.value = true;
		socket?.emit("subscribeLab");
	});

	socket.on("disconnect", () => {
		socketConnected.value = false;
	});

	socket.on("labSnapshot", (data) => {
		const newMap = new Map<string, EnhancedSpreadOpportunity>();
		for (const spread of data) {
			newMap.set(spread.symbol, spread);
		}
		spreadsMap.value = newMap;
	});

	socket.on("labSpread", (spread) => {
		const newMap = new Map(spreadsMap.value);
		newMap.set(spread.symbol, spread);
		spreadsMap.value = newMap;
	});

	socket.on("status", (data) => {
		exchangeStatus.value = data;
	});
};

const disconnectSocket = () => {
	if (!socket) return;
	socket.disconnect();
	socket = null;
	socketConnected.value = false;
};

export const useSpreadsLabSocket = () => {
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
	const spreads = computed(() => {
		return Array.from(spreadsMap.value.values()).sort(
			(a, b) => b.score - a.score,
		);
	});

	// Only executable opportunities
	const executableOpportunities = computed(() => {
		return spreads.value.filter((s) => s.status === "executable");
	});

	// All positive net spread opportunities
	const positiveOpportunities = computed(() => {
		return spreads.value.filter((s) => s.netSpreadBps > 0);
	});

	const connectedExchanges = computed(() =>
		Object.entries(exchangeStatus.value)
			.filter(([, status]) => status === "connected")
			.map(([exchange]) => exchange as LowercaseExchange),
	);

	const getSpread = (symbol: string) => spreadsMap.value.get(symbol);

	return {
		spreads,
		executableOpportunities,
		positiveOpportunities,
		spreadsMap,
		exchangeStatus,
		isConnected: socketConnected,
		connectedExchanges,
		getSpread,
	};
};
