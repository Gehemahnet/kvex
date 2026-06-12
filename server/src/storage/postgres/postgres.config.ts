export type PostgresConfig = {
	database: string;
	host: string;
	password: string;
	port: number;
	user: string;
};

const DEFAULT_POSTGRES_HOST = "localhost";

/** Builds Postgres connection config from POSTGRES_* environment variables. */
export const getPostgresConfig = (): PostgresConfig | undefined => {
	const {
		POSTGRES_DB,
		POSTGRES_HOST,
		POSTGRES_HOST_PORT,
		POSTGRES_PASSWORD,
		POSTGRES_USER,
	} = process.env;

	if (
		!POSTGRES_HOST_PORT ||
		!POSTGRES_DB ||
		!POSTGRES_PASSWORD ||
		!POSTGRES_USER
	) {
		return undefined;
	}

	const port = Number(POSTGRES_HOST_PORT);

	if (!Number.isInteger(port) || port <= 0) {
		return undefined;
	}

	return {
		database: POSTGRES_DB,
		host: POSTGRES_HOST || DEFAULT_POSTGRES_HOST,
		password: POSTGRES_PASSWORD,
		port,
		user: POSTGRES_USER,
	};
};
