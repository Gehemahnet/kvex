import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadServerEnvironment } from "#common/env";
import { closePostgresPool, getPostgresPool } from "./postgres.client";

const migrationsDirectory = join(dirname(fileURLToPath(import.meta.url)), "migrations");

/** Runs pending SQL migrations against the configured Postgres database. */
export const runPostgresMigrations = async (): Promise<void> => {
	loadServerEnvironment();

	const pool = getPostgresPool();

	if (pool === undefined) {
		throw new Error("Postgres is not configured");
	}

	const client = await pool.connect();

	try {
		await client.query(`
			CREATE TABLE IF NOT EXISTS schema_migrations (
				name TEXT PRIMARY KEY,
				applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
			)
		`);

		const migrationNames = (await readdir(migrationsDirectory))
			.filter((fileName) => fileName.endsWith(".sql"))
			.sort();

		for (const migrationName of migrationNames) {
			const appliedMigration = await client.query(
				"SELECT name FROM schema_migrations WHERE name = $1 LIMIT 1",
				[migrationName],
			);

			if (appliedMigration.rows.length > 0) {
				continue;
			}

			const sql = await readFile(join(migrationsDirectory, migrationName), "utf8");

			await applyPostgresMigration(client, migrationName, sql);
			console.log(`Applied migration ${migrationName}`);
		}
	} finally {
		client.release();
		await closePostgresPool();
	}
};

const applyPostgresMigration = async (
	client: {
		query: (text: string, values?: unknown[]) => Promise<unknown>;
	},
	migrationName: string,
	sql: string,
): Promise<void> => {
	try {
		await client.query("BEGIN");
		await client.query(sql);
		await client.query(
			"INSERT INTO schema_migrations (name) VALUES ($1)",
			[migrationName],
		);
		await client.query("COMMIT");
	} catch (error) {
		await client.query("ROLLBACK").catch(() => undefined);
		throw error;
	}
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	runPostgresMigrations().catch((error) => {
		console.error(error);
		process.exitCode = 1;
	});
}
