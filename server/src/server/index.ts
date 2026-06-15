import { createServer } from "node:http";
import { loadServerEnvironment } from "#common/env";
import { startMarketDataStreams } from "#services/markets/market-data-streams/market-data-streams";
import { attachMarketDataSocket } from "./realtime/market-data-socket";
import { router } from "./router";

loadServerEnvironment();

const PORT = process.env.SERVER_PORT ?? "3000";

const server = createServer(router);

attachMarketDataSocket(server);
startMarketDataStreams();

server.listen(PORT, () => {
	console.log(JSON.stringify({
		timestamp: new Date().toISOString(),
		level: "info",
		message: "server_started",
		port: PORT,
	}));
});
