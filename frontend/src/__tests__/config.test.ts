import { describe, it, expect, vi, beforeEach } from "vitest";

describe("config", () => {
    beforeEach(() => {
        vi.resetModules();
    });

    it("verwendet VITE_BACKEND_URL wenn definiert", async () => {
        vi.stubEnv("VITE_BACKEND_URL", "http://test-api");
        const { BACKEND_URL } = await import("../config");
        expect(BACKEND_URL).toBe("http://test-api");
    });

    it("verwendet den Fallback-Wert wenn VITE_BACKEND_URL nicht definiert ist", async () => {
        vi.stubEnv("VITE_BACKEND_URL", "");
        const { BACKEND_URL } = await import("../config");
        expect(BACKEND_URL).toBe("http://localhost/api");
    });
});
