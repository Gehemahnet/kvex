import { createServer } from "node:http";
import { Server } from "socket.io";
import { ethereal, hyperliquid, pacifica, paradex } from "./exchanges";
import type {
	BBOUpdate,
	ClientToServerEvents,
	ConnectionStatus,
	Exchange,
	ServerToClientEvents,
	SpreadOpportunity,
} from "./types";

const PORT = Number(process.env.PORT) || 3001;
const DEBUG = process.env.DEBUG === "true";

// BBO Cache: symbol -> exchange -> BBO
const bboBySymbol = new Map<string, Map<Exchange, BBOUpdate>>();

// Stats for logging
let spreadUpdateCount = 0;
let lastStatsTime = Date.now();
let statsInterval: ReturnType<typeof setInterval> | null = null;

const logStats = () => {
	const now = Date.now();
	const elapsed = (now - lastStatsTime) / 1000;
	const allSpreads = getAllSpreads();
	const positiveSpreads = allSpreads.filter((s) => s.spreadPercent > 0);
	const bestSpread = positiveSpreads[0];

	let statsMsg = `[server] Stats: ${spreadUpdateCount} spread updates in ${elapsed.toFixed(0)}s, ${bboBySymbol.size} symbols tracked`;

	if (positiveSpreads.length > 0 && bestSpread) {
		statsMsg += `, ${positiveSpreads.length} arbitrage opportunities, best: ${bestSpread.symbol} ${bestSpread.spreadPercent.toFixed(3)}%`;
	} else {
		statsMsg += `, no arbitrage opportunities`;
	}

	console.log(statsMsg);
	spreadUpdateCount = 0;
	lastStatsTime = now;
};

// Статусы подключений
const connectionStatus: Record<Exchange, ConnectionStatus> = {
	paradex: "disconnected",
	hyperliquid: "disconnected",
	pacifica: "disconnected",
	ethereal: "disconnected",
};

// Нормализация символа
const normalizeSymbol = (symbol: string): string => {
	return symbol
		.replace(/-USD-PERP$/i, "")
		.replace(/-PERP$/i, "")
		.replace(/\/USD$/i, "")
		.replace(/-USD$/i, "")
		.replace(/USDC$/i, "")
		.replace(/USD$/i, "")
		.toUpperCase();
};

// Расчёт спреда для одного символа
const calculateSpreadForSymbol = (symbol: string): SpreadOpportunity | null => {
	const exchanges = bboBySymbol.get(symbol);
	if (!exchanges || exchanges.size < 2) return null;

	let bestBid: { exchange: Exchange; price: number; size: number } | null =
		null;
	let bestAsk: { exchange: Exchange; price: number; size: number } | null =
		null;
	let latestUpdate = 0;

	for (const [exchange, bbo] of exchanges) {
		const bidPrice = parseFloat(bbo.bid);
		const askPrice = parseFloat(bbo.ask);
		const bidSize = parseFloat(bbo.bidSize) || 0;
		const askSize = parseFloat(bbo.askSize) || 0;

		if (!isNaN(bidPrice) && bidPrice > 0) {
			if (!bestBid || bidPrice > bestBid.price) {
				bestBid = { exchange, price: bidPrice, size: bidSize };
			}
		}

		if (!isNaN(askPrice) && askPrice > 0) {
			if (!bestAsk || askPrice < bestAsk.price) {
				bestAsk = { exchange, price: askPrice, size: askSize };
			}
		}

		if (bbo.timestamp > latestUpdate) {
			latestUpdate = bbo.timestamp;
		}
	}

	if (!bestBid || !bestAsk) return null;

	// Спред должен быть между разными биржами для арбитража
	if (bestBid.exchange === bestAsk.exchange) return null;

	const spreadAbsolute = bestBid.price - bestAsk.price;
	const spreadPercent = (spreadAbsolute / bestAsk.price) * 100;

	// Доступный размер (для информации)
	let availableSize = Math.min(bestBid.size, bestAsk.size);
	if (availableSize === 0) {
		availableSize = Math.max(bestBid.size, bestAsk.size);
	}

	// Расчёт прибыли на позицию $1000
	const positionUsd = 1000;
	const potentialProfitUsd = positionUsd * (spreadPercent / 100);

	return {
		symbol,
		sellExchange: bestBid.exchange,
		buyExchange: bestAsk.exchange,
		bestBid: bestBid.price,
		bestAsk: bestAsk.price,
		spreadAbsolute,
		spreadPercent,
		availableSize,
		potentialProfitUsd,
		lastUpdatedAt: latestUpdate || Date.now(),
	};
};

// HTTP + Socket.io сервер
const httpServer = createServer();
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
	cors: { origin: "*" },
});

// Обработчик BBO - мгновенно отправляем обновление спреда
const handleBBO = (exchange: Exchange) => (update: BBOUpdate) => {
	const symbol = normalizeSymbol(update.symbol);

	// Обновляем кэш
	if (!bboBySymbol.has(symbol)) {
		bboBySymbol.set(symbol, new Map());
	}
	bboBySymbol.get(symbol)!.set(exchange, update);

	// Сразу считаем и отправляем спред для этого символа
	const spread = calculateSpreadForSymbol(symbol);
	if (spread) {
		spreadUpdateCount++;
		io.emit("spread", spread);
	}
};

// Обработчик статуса
const handleStatus = (exchange: Exchange) => (status: ConnectionStatus) => {
	connectionStatus[exchange] = status;
	io.emit("status", { ...connectionStatus });
};

// Получить все текущие спреды (для нового клиента)
const getAllSpreads = (): SpreadOpportunity[] => {
	const spreads: SpreadOpportunity[] = [];
	for (const symbol of bboBySymbol.keys()) {
		const spread = calculateSpreadForSymbol(symbol);
		if (spread) spreads.push(spread);
	}
	return spreads.sort((a, b) => b.spreadPercent - a.spreadPercent);
};

// Инициализация и запуск
const start = async () => {
	console.log("Initializing exchanges...");

	await Promise.all([
		paradex.fetchMarkets(),
		hyperliquid.fetchCoins(),
		pacifica.fetchSymbols(),
		ethereal.fetchProducts(),
	]);

	// Подписываемся на BBO
	paradex.onBBO(handleBBO("paradex"));
	hyperliquid.onBBO(handleBBO("hyperliquid"));
	pacifica.onBBO(handleBBO("pacifica"));
	ethereal.onBBO(handleBBO("ethereal"));

	// Подписываемся на статусы
	paradex.onStatus(handleStatus("paradex"));
	hyperliquid.onStatus(handleStatus("hyperliquid"));
	pacifica.onStatus(handleStatus("pacifica"));
	ethereal.onStatus(handleStatus("ethereal"));

	// Подключаемся к биржам
	paradex.connect();
	hyperliquid.connect();
	pacifica.connect();
	ethereal.connect();

	// Socket.io подключения
	io.on("connection", (socket) => {
		console.log(`[server] Client connected: ${socket.id}`);

		// Сразу отправляем текущие данные
		const spreads = getAllSpreads();
		const positiveSpreads = spreads.filter((s) => s.spreadPercent > 0);
		console.log(
			`[server] Sending snapshot: ${spreads.length} spreads (${positiveSpreads.length} positive)`,
		);

		socket.emit("status", { ...connectionStatus });
		socket.emit("snapshot", spreads);

		socket.on("disconnect", () => {
			console.log(`[server] Client disconnected: ${socket.id}`);
		});
	});

	httpServer.listen(PORT, () => {
		console.log(`BFF Server running on port ${PORT}`);
		console.log(`DEBUG mode: ${DEBUG ? "enabled" : "disabled"}`);

		// Запускаем периодическое логирование статистики
		if (DEBUG) {
			statsInterval = setInterval(logStats, 30000);
		}
	});
};

process.on("SIGINT", () => {
	console.log("\nShutting down...");
	if (statsInterval) {
		clearInterval(statsInterval);
	}
	paradex.disconnect();
	hyperliquid.disconnect();
	pacifica.disconnect();
	ethereal.disconnect();
	httpServer.close();
	process.exit(0);
});

start();
