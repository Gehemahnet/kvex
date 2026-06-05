import type { IncomingMessage, ServerResponse } from "node:http";

export type RouteHandler = (
	request: IncomingMessage,
	response: ServerResponse,
	url: URL,
) => Promise<void>;

export type Route = {
	method: string;
	pathname: string;
	handler: RouteHandler;
};
