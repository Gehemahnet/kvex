import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import { fileURLToPath, URL } from "node:url";
import { defineConfig, loadEnv } from "vite";
import vueDevTools from "vite-plugin-vue-devtools";

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), "");
	const serverPort = env.SERVER_PORT || "3000";

	return {
		plugins: [tailwindcss(), vue(), vueDevTools({launchEditor: 'webstorm'})],
		resolve: {
			alias: {
				"@api": fileURLToPath(new URL("./src/api", import.meta.url)),
				"@assets": fileURLToPath(new URL("./src/assets", import.meta.url)),
				"@components": fileURLToPath(new URL("./src/components", import.meta.url)),
				"@hooks": fileURLToPath(new URL("./src/hooks", import.meta.url)),
				"@router": fileURLToPath(new URL("./src/router/index.ts", import.meta.url)),
				"@static": fileURLToPath(new URL("./src/static", import.meta.url)),
				"@shared": fileURLToPath(new URL("./src/shared", import.meta.url)),
				"@theme": fileURLToPath(new URL("./src/theme", import.meta.url)),
				"@types": fileURLToPath(new URL("./src/types", import.meta.url)),
				"@utils": fileURLToPath(new URL("./src/common", import.meta.url)),
				"@views": fileURLToPath(new URL("./src/views", import.meta.url)),
			},
		},
		server: {
			proxy: {
				"/api": {
					target: `http://localhost:${serverPort}`,
					changeOrigin: true,
					rewrite: (path) => path.replace(/^\/api/, ""),
				},
				"/market-data": {
					target: `http://localhost:${serverPort}`,
					changeOrigin: true,
					ws: true,
				},
			},
		},
	};
});
