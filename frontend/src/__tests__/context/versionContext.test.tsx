import { describe, it, vi, expect, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { VersionProvider, useVersionContext } from "../../context/versionContext";
import axios from "axios";
import React from "react";

// Mock Axios
vi.mock("axios");
const mockAxios = axios as jest.Mocked<typeof axios>;

describe("VersionContext", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("sollte die initiale Frontend-Version und den Ladestatus korrekt setzen", () => {
        // Verzögere die Axios-Antwort, um den Ladezustand zu testen
        mockAxios.get.mockImplementation(
            () =>
                new Promise((resolve) => {
                    setTimeout(() => {
                        resolve({ data: { version: "1.18.4-123456a" } });
                    }, 100);
                })
        );

        const wrapper = ({ children }: { children: React.ReactNode }) => <VersionProvider>{children}</VersionProvider>;

        const { result } = renderHook(() => useVersionContext(), { wrapper });

        // Anfangszustand testen
        expect(result.current.frontendVersion).toBeDefined();
        expect(result.current.isLoading).toBe(true);
        expect(result.current.error).toBeNull();
        expect(result.current.backendVersion).toBe("Lädt...");
    });

    it("sollte die Backend-Version nach erfolgreicher API-Anfrage setzen", async () => {
        mockAxios.get.mockResolvedValue({ data: { version: "1.18.4-123456a" } });

        const wrapper = ({ children }: { children: React.ReactNode }) => <VersionProvider>{children}</VersionProvider>;

        const { result } = renderHook(() => useVersionContext(), { wrapper });

        // Warte auf die Aktualisierung des Zustands
        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.backendVersion).toBe("1.18.4-123456a");
        expect(result.current.error).toBeNull();
        expect(mockAxios.get).toHaveBeenCalled();
    });

    it("sollte einen Fehler setzen, wenn die API-Anfrage fehlschlägt", async () => {
        mockAxios.get.mockRejectedValue(new Error("API Error"));

        const wrapper = ({ children }: { children: React.ReactNode }) => <VersionProvider>{children}</VersionProvider>;

        const { result } = renderHook(() => useVersionContext(), { wrapper });

        // Warte auf die Aktualisierung des Zustands
        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.backendVersion).toBe("Nicht verfügbar");
        expect(result.current.error).toBeTruthy();
    });
});
