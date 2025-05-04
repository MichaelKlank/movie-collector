import { describe, it, vi, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { VersionInfo } from "../../components/VersionInfo";
import * as versionContext from "../../context/versionContext";

describe("VersionInfo Component", () => {
    // Mock des Contexts
    const mockUseVersionContext = vi.spyOn(versionContext, "useVersionContext");

    it("sollte Frontend- und Backend-Versionen korrekt anzeigen", () => {
        // Mock-Werte für den Kontext
        mockUseVersionContext.mockReturnValue({
            frontendVersion: "1.18.5-abcdef1",
            backendVersion: "1.18.4-123456a",
            isLoading: false,
            error: null,
        });

        render(<VersionInfo />);

        // Prüfe, ob beide Versionen angezeigt werden
        expect(screen.getByText("FE: 1.18.5-abcdef1")).toBeInTheDocument();
        expect(screen.getByText("BE: 1.18.4-123456a")).toBeInTheDocument();
    });

    it("sollte 'Lädt...' anzeigen, wenn die Backend-Version noch lädt", () => {
        mockUseVersionContext.mockReturnValue({
            frontendVersion: "1.18.5-abcdef1",
            backendVersion: "Lädt...",
            isLoading: true,
            error: null,
        });

        render(<VersionInfo />);

        expect(screen.getByText("FE: 1.18.5-abcdef1")).toBeInTheDocument();
        expect(screen.getByText("BE: Lädt...")).toBeInTheDocument();
    });

    it("sollte 'Fehler' anzeigen, wenn ein Fehler beim Laden der Backend-Version auftritt", () => {
        mockUseVersionContext.mockReturnValue({
            frontendVersion: "1.18.5-abcdef1",
            backendVersion: "Nicht verfügbar",
            isLoading: false,
            error: "Verbindungsfehler",
        });

        render(<VersionInfo />);

        expect(screen.getByText("FE: 1.18.5-abcdef1")).toBeInTheDocument();
        expect(screen.getByText("BE: Fehler")).toBeInTheDocument();
    });

    // Bereinigen nach den Tests
    afterEach(() => {
        vi.clearAllMocks();
    });
});
