import type { IncomingMessage } from "node:http";
import { BadRequestError } from "./http-errors";

const DEFAULT_MAX_JSON_BODY_BYTES = 16 * 1024;

/** Reads and parses a bounded JSON request body. */
export const readJsonBody = async <Body extends object>(
	request: IncomingMessage,
	maxBytes = DEFAULT_MAX_JSON_BODY_BYTES,
): Promise<Body> => {
	const chunks: Buffer[] = [];
	let totalBytes = 0;

	for await (const chunk of request) {
		const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
		totalBytes += buffer.byteLength;

		if (totalBytes > maxBytes) {
			throw new BadRequestError("JSON body is too large", "BODY_TOO_LARGE");
		}

		chunks.push(buffer);
	}

	try {
		const body = JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;

		if (typeof body !== "object" || body === null || Array.isArray(body)) {
			throw new BadRequestError("JSON body must be an object", "INVALID_JSON_BODY");
		}

		return body as Body;
	} catch (error) {
		if (error instanceof BadRequestError) {
			throw error;
		}

		throw new BadRequestError("Request body must be valid JSON", "INVALID_JSON");
	}
};
