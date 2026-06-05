import { createServer } from "node:http";
import { startMarketDataStreams } from "../services/markets/market-data-streams";
import { attachMarketDataSocket } from "./realtime/market-data-socket";
import { router } from "./router";

const PORT = process.env.SERVER_PORT ?? "3000";

const server = createServer(router);

attachMarketDataSocket(server);
startMarketDataStreams();

server.listen(PORT, () => {
	console.log(`Server running at ${PORT}`);
});
