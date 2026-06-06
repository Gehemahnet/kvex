import { resolve } from "node:path";
import { config } from "dotenv";

const SERVER_ENV_PATHS = [
	resolve(process.cwd(), ".env"),
	resolve(process.cwd(), "..", ".env"),
];

/** Loads local server environment files without overriding already exported values. */
export const loadServerEnvironment = (): void => {
	config({
		override: false,
		path: SERVER_ENV_PATHS,
		quiet: true,
	});
};
