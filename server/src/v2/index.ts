import { createServer } from "node:http";
import { Server } from "socket.io";
import { ethereal, hyperliquid, pacifica, paradex } from "../exchanges";
import { aggregator } from "./exchange-aggregator";
import type {
	ArbitrageOpportunity,
	ConnectionStatus,
	Exchange,
	ServerStats,
	V2ClientToServerEvents,
	V2ServerToClientEvents,
} from "./types";

const PORT = Number(process.env.PORT) || 3002; // Different port from v1
const DEBUG = process.env.DEBUG === "true";

// Stats tracking
let updateCount = 0;
let tradeCount = 0;
let fundingUpdateCount = 0;
let lastStatsTime = Date.now();
const startTime = Date.now();

const logStats = () => {
	const now = Date.now();
	const elapsed = (now - lastStatsTime) / 1000;
	const opportunities = aggregator.getAllOpportunities();
	const executable = opportunities.filter((o) => o.status === "executable");
	const positive = opportunities.filter((o) => o.netSpreadBps > 0);

	const avgScore = opportunities.length > 0
		? opportunities.reduce((sum, o) => sum + o.score, 0) / opportunities.length
		: 0;

	console.log(
		`[v2] Stats: ${updateCount} BBO, ${tradeCount} trades, ${fundingUpdateCount} funding in ${elapsed.toFixed(0)}s | ` +
		`${opportunities.length} opps (${executable.length} exec, ${positive.length} positive) | ` +
		`Avg score: ${avgScore.toFixed(1)}`,
	);

	updateCount = 0;
	tradeCount = 0;
	fundingUpdateCount = 0;
	lastStatsTime = now;
};

// HTTP + Socket.io server
const httpServer = createServer();
const io = new Server<V2ClientToServerEvents, V2ServerToClientEvents>(httpServer, {
	cors: { origin: "*" },
	path: "/v2",
});

// Helper to strip heavy data for list view
const stripOpportunity = (opp: ArbitrageOpportunity): ArbitrageOpportunity => {
	// Create a shallow copy
	const stripped = { ...opp };
	
	// Remove heavy orderbook data
	// We keep the top-level metrics but remove the arrays
	if (stripped.buyData) {
		stripped.buyData = {
			...stripped.buyData,
			bids: [], // Remove full orderbook
			asks: []  // Remove full orderbook
		};
	}
	
	if (stripped.sellData) {
		stripped.sellData = {
			...stripped.sellData,
			bids: [], // Remove full orderbook
			asks: []  // Remove full orderbook
		};
	}
	
	return stripped;
};

// Wire up exchange BBO handlers
const handleBBO = (exchange: Exchange) => (update: { exchange: string; symbol: string; bid: string; bidSize: string; ask: string; askSize: string; timestamp: number }) => {
	updateCount++;
	aggregator.handleBBO({
		exchange,
		symbol: update.symbol,
		bid: update.bid,
		bidSize: update.bidSize,
		ask: update.ask,
		askSize: update.askSize,
		timestamp: update.timestamp,
	});
};

// Wire up exchange orderbook handlers
const handleOrderBook = (exchange: Exchange) => (update: { symbol: string; bids: Array<{ price: string; size: string }>; asks: Array<{ price: string; size: string }>; timestamp: number; receivedAt: number }) => {
	aggregator.handleOrderBook({
		exchange,
		symbol: update.symbol,
		bids: update.bids.map((b) => ({ price: parseFloat(b.price), size: parseFloat(b.size) })),
		asks: update.asks.map((a) => ({ price: parseFloat(a.price), size: parseFloat(a.size) })),
		timestamp: update.timestamp,
		receivedAt: update.receivedAt,
	});
};

// Wire up funding rate handlers
const handleFunding = (exchange: Exchange) => (update: { symbol: string; fundingRate: number; markPrice: number; indexPrice: number }) => {
	fundingUpdateCount++;
	aggregator.handleFundingRate(exchange, update.symbol, update.fundingRate);
};

// Wire up trade handlers (for activity tracking)
const handleTrade = (exchange: Exchange) => (update: { symbol: string; price: number; size: number; side: string }) => {
	tradeCount++;
	// Could track trade activity here for volatility calculation
};

// Wire up status handlers
const handleStatus = (exchange: Exchange) => (status: ConnectionStatus) => {
	aggregator.handleStatus(exchange, status);
};

// Forward opportunity updates to clients
aggregator.onOpportunity((opportunity) => {
	updateCount++;
	
	// Filter out garbage opportunities before emitting to everyone
	// We only send opportunities with a minimal score or positive spread
	// This significantly reduces network traffic and frontend load
	// RELAXED FILTER: Allow more updates through to see depth changes
	// Only filter out absolute garbage (very negative spread AND very low score)
	if (opportunity.score < 0 && opportunity.netSpreadBps < -50) {
		return;
	}
	
	// 1. Send lightweight update to everyone (for the table)
	const stripped = stripOpportunity(opportunity);
	io.emit("opportunity", stripped);
	
	// 2. Send full update ONLY to subscribers of this specific opportunity (for the modal)
	// Room name: "detail:BTC_paradex_hyperliquid"
	io.to(`detail:${opportunity.id}`).emit("opportunity", opportunity);
});

aggregator.onStatus((status) => {
	io.emit("status", status);
});

// Socket.io connection handling
io.on("connection", (socket) => {
	console.log(`[v2] Client connected: ${socket.id}`);

	// Send current snapshot (stripped and filtered)
	const opportunities = aggregator.getAllOpportunities()
		.filter(o => o.score >= 0 || o.netSpreadBps >= -50)
		.map(stripOpportunity);
		
	const status = aggregator.getConnectionStatus();

	socket.emit("snapshot", opportunities);
	socket.emit("status", status);

	socket.on("subscribe", (config) => {
		console.log(`[v2] Client ${socket.id} subscribed with config:`, config);
		// Config can be used for server-side filtering in the future
	});
	
	// New: Subscribe to details
	socket.on("subscribeToDetails", (opportunityId: string) => {
		console.log(`[v2] Client ${socket.id} subscribed to details for ${opportunityId}`);
		socket.join(`detail:${opportunityId}`);
		
		// Immediately send the full object if it exists
		const opp = aggregator.getAllOpportunities().find(o => o.id === opportunityId);
		if (opp) {
			socket.emit("opportunity", opp);
		}
	});
	
	// New: Unsubscribe from details
	socket.on("unsubscribeFromDetails", (opportunityId: string) => {
		console.log(`[v2] Client ${socket.id} unsubscribed from details for ${opportunityId}`);
		socket.leave(`detail:${opportunityId}`);
	});

	socket.on("disconnect", () => {
		console.log(`[v2] Client disconnected: ${socket.id}`);
	});
});

// Periodic stats broadcast
const broadcastStats = () => {
	const opportunities = aggregator.getAllOpportunities();
	const stats: ServerStats = {
		totalSymbols: aggregator.getStats().totalSymbols,
		totalOpportunities: opportunities.length,
		executableCount: opportunities.filter((o) => o.status === "executable").length,
		avgScore: opportunities.length > 0
			? opportunities.reduce((sum, o) => sum + o.score, 0) / opportunities.length
			: 0,
		updatesPerSecond: updateCount / 30, // Rough estimate
		uptime: Date.now() - startTime,
	};
	io.emit("stats", stats);
};

// Initialize and start
const start = async () => {
	console.log("[v2] Initializing exchanges...");

	await Promise.all([
		paradex.fetchMarkets(),
		hyperliquid.fetchCoins(),
		pacifica.fetchSymbols(),
		ethereal.fetchProducts(),
	]);

	// Subscribe to BBO updates
	paradex.onBBO(handleBBO("paradex"));
	hyperliquid.onBBO(handleBBO("hyperliquid"));
	pacifica.onBBO(handleBBO("pacifica"));
	ethereal.onBBO(handleBBO("ethereal"));

	// Subscribe to orderbook updates (for depth calculation)
	paradex.onOrderBook(handleOrderBook("paradex"));
	hyperliquid.onOrderBook(handleOrderBook("hyperliquid"));
	pacifica.onOrderBook(handleOrderBook("pacifica"));
	ethereal.onOrderBook(handleOrderBook("ethereal"));

	// Subscribe to funding rate updates
	if (paradex.onFunding) paradex.onFunding(handleFunding("paradex"));
	if (hyperliquid.onFunding) hyperliquid.onFunding(handleFunding("hyperliquid"));
	if (pacifica.onFunding) pacifica.onFunding(handleFunding("pacifica"));
	if (ethereal.onFunding) ethereal.onFunding(handleFunding("ethereal"));

	// Subscribe to trade updates
	if (paradex.onTrade) paradex.onTrade(handleTrade("paradex"));
	if (hyperliquid.onTrade) hyperliquid.onTrade(handleTrade("hyperliquid"));
	if (pacifica.onTrade) pacifica.onTrade(handleTrade("pacifica"));
	if (ethereal.onTrade) ethereal.onTrade(handleTrade("ethereal"));

	// Subscribe to status updates
	paradex.onStatus(handleStatus("paradex"));
	hyperliquid.onStatus(handleStatus("hyperliquid"));
	pacifica.onStatus(handleStatus("pacifica"));
	ethereal.onStatus(handleStatus("ethereal"));

	// Connect to exchanges
	paradex.connect();
	hyperliquid.connect();
	pacifica.connect();
	ethereal.connect();

	httpServer.listen(PORT, () => {
		console.log(`[v2] Server running on port ${PORT}`);
		console.log(`[v2] Socket.io path: /v2`);
		console.log(`[v2] DEBUG mode: ${DEBUG ? "enabled" : "disabled"}`);

		if (DEBUG) {
			setInterval(logStats, 30000);
		}
		setInterval(broadcastStats, 10000);
	});
};

process.on("SIGINT", () => {
	console.log("\n[v2] Shutting down...");
	paradex.disconnect();
	hyperliquid.disconnect();
	pacifica.disconnect();
	ethereal.disconnect();
	httpServer.close();
	process.exit(0);
});

start();
