import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import pg from "pg";

// Получаем путь к корню проекта (на две папки выше, чем src/db.ts)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = resolve(__dirname, "../../.env");

// Загружаем переменные из .env файла
dotenv.config({ path: envPath });

const { Pool } = pg;

// Проверяем обязательные переменные
const requiredEnvVars = [
	"POSTGRES_USER",
	"POSTGRES_PASSWORD",
	"POSTGRES_DB",
	"POSTGRES_PORT",
];

for (const envVar of requiredEnvVars) {
	if (!process.env[envVar]) {
		console.error(`[FATAL] Missing required environment variable: ${envVar}`);
		console.error(
			`Please ensure your .env file exists at: ${envPath} and contains ${envVar}`,
		);
		process.exit(1);
	}
}

const dbPort = parseInt(process.env.POSTGRES_PORT as string, 10);
const dbUser = process.env.POSTGRES_USER;
const dbPassword = process.env.POSTGRES_PASSWORD;
const dbName = process.env.POSTGRES_DB;
const dbHost = process.env.POSTGRES_HOST || "localhost";

console.debug(
	`[DB Debug] Connecting to: postgresql://${dbUser}:***@${dbHost}:${dbPort}/${dbName}`,
);

export const pool = new Pool({
	user: dbUser,
	password: dbPassword,
	host: dbHost,
	port: dbPort,
	database: dbName,
});

export const initDb = async () => {
	const client = await pool.connect();
	try {
		console.debug("[DB] Initializing database schema...");

		await client.query(`
      CREATE TABLE IF NOT EXISTS funding_rates (
        id SERIAL PRIMARY KEY,
        exchange VARCHAR(50) NOT NULL,
        symbol VARCHAR(50) NOT NULL,
        funding_rate DOUBLE PRECISION NOT NULL,
        mark_price DOUBLE PRECISION,
        index_price DOUBLE PRECISION,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

		await client.query(`
      CREATE INDEX IF NOT EXISTS idx_funding_rates_symbol_exchange_time 
      ON funding_rates (symbol, exchange, timestamp DESC);
    `);

		console.debug("[DB] Database schema initialized successfully. It works!");
	} catch (error) {
		console.error("[DB] Error initializing database:", error);
	} finally {
		client.release();
	}
};
