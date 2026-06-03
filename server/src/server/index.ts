import { createServer } from "node:http";
import { config } from "dotenv";
import { router } from "./router";

const PORT = config().parsed?.SERVER_PORT ?? "3000";

const server = createServer(router);

server.listen(PORT, () => {
	console.log(`Server running at ${PORT}`);
});
