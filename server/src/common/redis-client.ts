import { createClient, type RedisClientType } from "redis";
import { log } from "./logger";

const DISABLED_REDIS_URL_VALUES = new Set(["", "0", "false", "off"]);

let redisClientPromise: Promise<RedisClientType | undefined> | undefined;
let redisStatus: RedisStatus = {
	configured: false,
	connected: false,
};

export type RedisStatus = {
	configured: boolean;
	connected: boolean;
	lastError?: string;
};

/** Returns a Redis URL from process environment or undefined when Redis is disabled. */
export const getRedisUrl = (): string | undefined => {
	const redisUrl = process.env.REDIS_URL?.trim();

	if (redisUrl === undefined || DISABLED_REDIS_URL_VALUES.has(redisUrl.toLowerCase())) {
		return undefined;
	}

	return redisUrl;
};

/** Returns a shared Redis client when REDIS_URL is configured and reachable. */
export const getRedisClient = async (): Promise<RedisClientType | undefined> => {
	const redisUrl = getRedisUrl();
	redisStatus = {
		...redisStatus,
		configured: redisUrl !== undefined,
	};

	if (redisUrl === undefined) {
		return undefined;
	}

	redisClientPromise ??= connectRedisClient(redisUrl);

	return redisClientPromise;
};

/** Resets the cached Redis connection promise after connection failures or tests. */
export const resetRedisClient = (): void => {
	redisClientPromise = undefined;
};

/** Returns current Redis connection diagnostics for local metrics. */
export const getRedisStatus = (): RedisStatus => redisStatus;

/** Creates and connects a Redis client, falling back silently when Redis is unavailable. */
const connectRedisClient = async (
	redisUrl: string,
): Promise<RedisClientType | undefined> => {
	try {
		const client = createClient({ url: redisUrl });

		client.on("error", (error) => {
			redisStatus = {
				configured: true,
				connected: false,
				lastError: error.message,
			};
			log("warn", "redis_client_error", { error: error.message });
		});

		await client.connect();
		redisStatus = {
			configured: true,
			connected: true,
		};

		return client as RedisClientType;
	} catch (error) {
		resetRedisClient();
		redisStatus = {
			configured: true,
			connected: false,
			lastError: String(error),
		};
		log("warn", "redis_unavailable", { error: String(error) });

		return undefined;
	}
};
