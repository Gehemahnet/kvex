import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		testTimeout: 20000,
		name: "unit",
		include: ["tests/**/*.spec.ts"],
	},
});
