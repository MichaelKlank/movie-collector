/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
    plugins: [react()],
    test: {
        globals: true,
        environment: "jsdom",
        setupFiles: ["./src/setupTests.ts"],
        include: ["**/__tests__/**/*.test.{ts,tsx}"],
        coverage: {
            provider: "v8",
            reporter: ["text", "json", "html"],
        },
        deps: {
            optimizer: {
                web: {
                    include: ["@testing-library/react"],
                },
            },
        },
        environmentOptions: {
            jsdom: {
                resources: "usable",
                pretendToBeVisual: true,
                runScripts: "dangerously",
            },
        },
        testTimeout: 10000,
    },
});
