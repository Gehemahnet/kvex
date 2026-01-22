import { io, type Socket } from "socket.io-client";
import { computed, onMounted, onUnmounted, ref, shallowRef } from "vue";
import type {
	ClientToServerEvents,
	ConnectionStatus,
	Exchange,
	ServerToClientEvents,
	SpreadOpportunity,
} from "../../services/spreadsSocket/types";

const BFF_URL = import.meta.env.VITE_BFF_URL || "http://localhost:3001";

// Shared state (singleton)
let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

// Map для быстрого доступа по символу
const spreadsMap = shallowRef(new Map<string, SpreadOpportunity>());

const exchangeStatus = ref<Record<Exchange, ConnectionStatus>>({
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
	});

	socket.on("disconnect", () => {
		socketConnected.value = false;
	});

	// Начальный snapshot всех спредов
	socket.on("snapshot", (data) => {
		const newMap = new Map<string, SpreadOpportunity>();
		for (const spread of data) {
			newMap.set(spread.symbol, spread);
		}
		spreadsMap.value = newMap;
	});

	// Обновление одного спреда в реальном времени
	socket.on("spread", (spread) => {
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

export const useSpreadsSocket = () => {
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

	// Отсортированный массив спредов (по spreadPercent desc)
	const spreads = computed(() => {
		return Array.from(spreadsMap.value.values()).sort(
			(a, b) => b.spreadPercent - a.spreadPercent,
		);
	});

	// Только положительные спреды (арбитражные возможности)
	const opportunities = computed(() => {
		return spreads.value.filter((s) => s.spreadPercent > 0);
	});

	const connectedExchanges = computed(() =>
		Object.entries(exchangeStatus.value)
			.filter(([, status]) => status === "connected")
			.map(([exchange]) => exchange as Exchange),
	);

	const getSpread = (symbol: string) => spreadsMap.value.get(symbol);

	return {
		spreads,
		opportunities,
		spreadsMap,
		exchangeStatus,
		isConnected: socketConnected,
		connectedExchanges,
		getSpread,
	};
};
