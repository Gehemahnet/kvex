import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import { defineConfig, loadEnv } from "vite";
import vueDevTools from "vite-plugin-vue-devtools";

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), "");
	const serverPort = env.SERVER_PORT || "3000";

	return {
		plugins: [tailwindcss(), vue(), vueDevTools()],
		server: {
			proxy: {
				"/funding": {
					target: `http://localhost:${serverPort}`,
					changeOrigin: true,
				},
			},
		},
	};
});
