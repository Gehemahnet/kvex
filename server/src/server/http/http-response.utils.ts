import type { ServerResponse } from "node:http";

type JsonPrimitive = string | number | boolean | null;

export type JsonValue =
	| JsonPrimitive
	| JsonValue[]
	| { [key: string]: JsonValue | undefined };

/** Writes a JSON HTTP response with a stable content type. */
export const writeJsonResponse = <TResponseBody extends JsonValue>(
	response: ServerResponse,
	statusCode: number,
	body: TResponseBody,
) => {
	const payload = JSON.stringify(body);
	const payloadBytes = Buffer.byteLength(payload);

	response.writeHead(statusCode, {
		"Content-Length": String(payloadBytes),
		"Content-Type": "application/json",
	});
	response.end(payload);
};
