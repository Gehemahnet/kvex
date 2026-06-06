export type PostgresConfig = {
	database: string;
	host: string;
	password: string;
	port: number;
	user: string;
};

const DEFAULT_POSTGRES_HOST = "localhost";
const DEFAULT_POSTGRES_PORT = 5432;

/** Builds Postgres connection config from non-secret environment variables. */
export const getPostgresConfig = (): PostgresConfig | undefined => {
	const database = process.env.POSTGRES_DB;
	const password = process.env.POSTGRES_PASSWORD;
	const user = process.env.POSTGRES_USER;

	if (!database || !password || !user) {
		return undefined;
	}

	return {
		database,
		host: process.env.POSTGRES_HOST ?? DEFAULT_POSTGRES_HOST,
		password,
		port: parsePostgresPort(process.env.POSTGRES_HOST_PORT),
		user,
	};
};

const parsePostgresPort = (value: string | undefined): number => {
	const port = Number(value);

	return Number.isInteger(port) && port > 0 ? port : DEFAULT_POSTGRES_PORT;
};
