import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), "");
    return {
        plugins: [react()],
        base: "/app/movie/",
        define: {
            "process.env.VITE_BACKEND_URL": JSON.stringify(env.VITE_BACKEND_URL),
        },
        server: {
            port: 5173,
            proxy: {
                "/api": {
                    target: "http://localhost/api",
                    changeOrigin: true,
                },
            },
        },
    };
});
