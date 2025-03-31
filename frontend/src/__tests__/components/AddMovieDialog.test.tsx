import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import axios from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AddMovieDialog } from "../../components/AddMovieDialog";

// Mock axios
vi.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: false,
            gcTime: 0,
            staleTime: 0,
        },
    },
});

describe("AddMovieDialog", () => {
    const mockOnClose = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("rendert den Dialog mit Sucheingabe", () => {
        render(
            <QueryClientProvider client={queryClient}>
                <AddMovieDialog isOpen={true} onClose={mockOnClose} />
            </QueryClientProvider>
        );

        expect(screen.getByText("Film hinzufügen")).toBeInTheDocument();
        expect(screen.getByLabelText("Film suchen")).toBeInTheDocument();
    });

    it("führt eine erfolgreiche Suche durch", async () => {
        // Mock für erfolgreiche Suche
        mockedAxios.get.mockResolvedValueOnce({
            data: {
                results: [
                    {
                        id: 1,
                        title: "Test Movie",
                        overview: "Test Description",
                        release_date: "2024-01-01",
                        poster_path: "/test-poster.jpg",
                    },
                ],
            },
        });

        render(
            <QueryClientProvider client={queryClient}>
                <AddMovieDialog isOpen={true} onClose={mockOnClose} />
            </QueryClientProvider>
        );

        const searchInput = screen.getByLabelText("Film suchen");
        fireEvent.change(searchInput, { target: { value: "Test Movie" } });

        const searchButton = screen.getByText("Suchen");
        fireEvent.click(searchButton);

        await waitFor(
            () => {
                expect(screen.getByText("Test Movie")).toBeInTheDocument();
            },
            { timeout: 3000 }
        );
    });

    it("zeigt Fehlermeldung bei fehlgeschlagener Suche", async () => {
        // Mock für fehlgeschlagene Suche
        mockedAxios.get.mockRejectedValueOnce(new Error("Fehler bei der Suche"));

        render(
            <QueryClientProvider client={queryClient}>
                <AddMovieDialog isOpen={true} onClose={mockOnClose} />
            </QueryClientProvider>
        );

        const searchInput = screen.getByLabelText("Film suchen");
        fireEvent.change(searchInput, { target: { value: "Error Movie" } });

        const searchButton = screen.getByText("Suchen");
        fireEvent.click(searchButton);

        await waitFor(
            () => {
                expect(screen.getByText("Fehler bei der Suche")).toBeInTheDocument();
            },
            { timeout: 3000 }
        );
    });

    it("fügt einen Film erfolgreich hinzu", async () => {
        // Mock für erfolgreiche Suche
        mockedAxios.get.mockResolvedValueOnce({
            data: {
                results: [
                    {
                        id: 1,
                        title: "Test Movie",
                        overview: "Test Description",
                        release_date: "2024-01-01",
                        poster_path: "/test-poster.jpg",
                    },
                ],
            },
        });

        // Mock für erfolgreiches Hinzufügen
        global.fetch = vi.fn().mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ success: true }),
        });

        render(
            <QueryClientProvider client={queryClient}>
                <AddMovieDialog isOpen={true} onClose={mockOnClose} />
            </QueryClientProvider>
        );

        // Suche nach dem Film
        const searchInput = screen.getByLabelText("Film suchen");
        fireEvent.change(searchInput, { target: { value: "Test Movie" } });

        const searchButton = screen.getByText("Suchen");
        fireEvent.click(searchButton);

        await waitFor(
            () => {
                expect(screen.getByText("Test Movie")).toBeInTheDocument();
            },
            { timeout: 3000 }
        );

        // Film auswählen
        const movieItem = screen.getByText("Test Movie");
        fireEvent.click(movieItem);

        // Film hinzufügen
        const addButton = screen.getByText("Hinzufügen");
        fireEvent.click(addButton);

        await waitFor(
            () => {
                expect(mockOnClose).toHaveBeenCalled();
            },
            { timeout: 3000 }
        );
    });

    it("schließt den Dialog beim Klicken auf Abbrechen", () => {
        render(
            <QueryClientProvider client={queryClient}>
                <AddMovieDialog isOpen={true} onClose={mockOnClose} />
            </QueryClientProvider>
        );

        const cancelButton = screen.getByText("Abbrechen");
        fireEvent.click(cancelButton);

        expect(mockOnClose).toHaveBeenCalled();
    });
});
