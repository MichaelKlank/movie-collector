import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import SbomDialog from "../../components/SbomDialog";
import { BACKEND_URL } from "../../config";

const mockFrontendSbom = {
    components: [
        {
            name: "react",
            version: "18.2.0",
            description: "React is a JavaScript library for building user interfaces.",
            licenses: [{ license: { id: "MIT" } }],
        },
    ],
};

const mockBackendSbom = {
    components: [
        {
            name: "go",
            version: "1.21.0",
            description: "The Go programming language",
            licenses: [{ license: { id: "BSD-3-Clause" } }],
        },
    ],
};

describe("SbomDialog", () => {
    const mockOnClose = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        // Mock fetch für die Testumgebung
        global.fetch = vi.fn().mockImplementation((url) => {
            if (url === `${window.location.origin}/sbom.json`) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockFrontendSbom),
                });
            }
            if (url === `${BACKEND_URL}/sbom`) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockBackendSbom),
                });
            }
            return Promise.reject(new Error("Ungültige URL"));
        });
    });

    it("lädt die SBOM korrekt in der Testumgebung", async () => {
        render(<SbomDialog open={true} onClose={mockOnClose} />);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(`${window.location.origin}/sbom.json`);
        });
    });

    it("should render loading state initially", async () => {
        // Mock fetch to delay response
        vi.spyOn(global, "fetch").mockImplementation(
            () =>
                new Promise((resolve) =>
                    setTimeout(
                        () =>
                            resolve({
                                ok: true,
                                json: () => Promise.resolve(mockFrontendSbom),
                            } as Response),
                        100
                    )
                )
        );

        render(<SbomDialog open={true} onClose={() => {}} />);

        // Check loading state immediately
        expect(screen.getByTestId("loading-state")).toBeInTheDocument();
        expect(screen.getByText("Lade SBOM...")).toBeInTheDocument();

        // Wait for data to load
        await waitFor(() => {
            expect(screen.getByText("react")).toBeInTheDocument();
        });
    });

    it("should render frontend SBOM data", async () => {
        await act(async () => {
            render(<SbomDialog open={true} onClose={() => {}} />);
        });

        await waitFor(() => {
            expect(screen.getByText("react")).toBeInTheDocument();
            expect(screen.getByText("18.2.0")).toBeInTheDocument();
            expect(screen.getByText("MIT")).toBeInTheDocument();
        });
    });

    it("should handle fetch errors gracefully", async () => {
        vi.spyOn(global, "fetch").mockImplementation(() =>
            Promise.reject(new Error("Frontend SBOM konnte nicht geladen werden"))
        );

        await act(async () => {
            render(<SbomDialog open={true} onClose={() => {}} />);
        });

        await waitFor(() => {
            expect(screen.getByText("Frontend SBOM konnte nicht geladen werden")).toBeInTheDocument();
        });
    });

    it("should switch between frontend and backend tabs", async () => {
        await act(async () => {
            render(<SbomDialog open={true} onClose={() => {}} />);
        });

        await waitFor(() => {
            expect(screen.getByText("react")).toBeInTheDocument();
        });

        await act(async () => {
            const backendTab = screen.getByText("Backend");
            fireEvent.click(backendTab);
        });

        await waitFor(() => {
            expect(screen.getByText("go")).toBeInTheDocument();
            expect(screen.getByText("1.21.0")).toBeInTheDocument();
            expect(screen.getByText("BSD-3-Clause")).toBeInTheDocument();
        });
    });
});
