import { fileURLToPath, URL } from "node:url";

export default {
	resolve: {
		alias: {
			"@api": fileURLToPath(new URL("./src/api", import.meta.url)),
			"@assets": fileURLToPath(new URL("./src/assets", import.meta.url)),
			"@components": fileURLToPath(new URL("./src/components", import.meta.url)),
			"@hooks": fileURLToPath(new URL("./src/hooks", import.meta.url)),
			"@router": fileURLToPath(new URL("./src/router/index.ts", import.meta.url)),
			"@shared": fileURLToPath(new URL("./src/shared", import.meta.url)),
			"@theme": fileURLToPath(new URL("./src/theme", import.meta.url)),
			"@types": fileURLToPath(new URL("./src/types", import.meta.url)),
			"@utils": fileURLToPath(new URL("./src/common", import.meta.url)),
			"@views": fileURLToPath(new URL("./src/views", import.meta.url)),
		},
	},
	test: {
		environment: "node",
		include: ["tests/**/*.spec.ts"],
	},
};
