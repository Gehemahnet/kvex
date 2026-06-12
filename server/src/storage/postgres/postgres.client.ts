import pg from "pg";
import { getPostgresConfig } from "./postgres.config";

const { Pool } = pg;

export type Queryable = {
	query: <Row extends object = Record<string, unknown>>(
		text: string,
		values?: unknown[],
	) => Promise<{ rows: Row[] }>;
};

let pool: pg.Pool | undefined;

/** Returns the shared Postgres pool when database config is available. */
export const getPostgresPool = (): pg.Pool | undefined => {
	const config = getPostgresConfig();

	if (!config) {
		return undefined;
	}

	pool ??= new Pool(config);

	return pool;
};

/** Closes the cached Postgres pool; intended for tests and controlled shutdown. */
export const closePostgresPool = async (): Promise<void> => {
	await pool?.end();
	pool = undefined;
};
