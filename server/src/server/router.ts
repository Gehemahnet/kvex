import { IncomingMessage, ServerResponse } from "http";

export const router = (request: IncomingMessage, response: ServerResponse) => {
	if (request.url === "/funding" && request.method === "GET") {
		response.writeHead(200);
		return response.end("Successful access to server on route /funding");
	}
	response.writeHead(404);
	return response.end("Wrong route found");
};
