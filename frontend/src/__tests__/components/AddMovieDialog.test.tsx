import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AddMovieDialog } from "../../components/AddMovieDialog";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock axios
vi.mock("axios");

// Mock Timer
vi.useFakeTimers();

// Setup QueryClient für Tests
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: false,
        },
    },
});

// Mock für die TMDB API
const mockSearchResponse = {
    results: [
        {
            id: 1,
            title: "Test Movie",
            release_date: "2023-01-01",
            overview: "Test Overview",
            poster_path: "/test.jpg",
        },
    ],
};

const mockMovieDetails = {
    id: 1,
    title: "Test Movie",
    release_date: "2023-01-01",
    overview: "Test Overview",
    poster_path: "/test.jpg",
    director: "Test Director",
    vote_average: 8.5,
};

// Mock für fetch
global.fetch = vi.fn();

describe("AddMovieDialog", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (global.fetch as jest.Mock).mockReset();
    });

    it("rendert den Dialog mit allen wichtigen Elementen", () => {
        render(
            <QueryClientProvider client={queryClient}>
                <AddMovieDialog isOpen={true} onClose={() => {}} />
            </QueryClientProvider>
        );

        expect(screen.getByText("Film hinzufügen")).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/titel/i)).toBeInTheDocument();
        expect(screen.getByText("TMDB Suche")).toBeInTheDocument();
        expect(screen.getByText("Debug")).toBeInTheDocument();
    });

    it("führt eine erfolgreiche Suche durch", async () => {
        (global.fetch as jest.Mock).mockImplementationOnce(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve(mockSearchResponse),
            })
        );

        render(
            <QueryClientProvider client={queryClient}>
                <AddMovieDialog isOpen={true} onClose={() => {}} />
            </QueryClientProvider>
        );

        const searchInput = screen.getByPlaceholderText(/titel/i);
        fireEvent.change(searchInput, { target: { value: "Test Movie" } });

        await waitFor(
            () => {
                expect(screen.getByText("Test Movie")).toBeInTheDocument();
            },
            { timeout: 5000 }
        );
    });

    it("zeigt Fehlermeldung bei fehlgeschlagener Suche", async () => {
        (global.fetch as jest.Mock).mockImplementationOnce(() =>
            Promise.resolve({
                ok: false,
                status: 404,
            })
        );

        render(
            <QueryClientProvider client={queryClient}>
                <AddMovieDialog isOpen={true} onClose={() => {}} />
            </QueryClientProvider>
        );

        const searchInput = screen.getByPlaceholderText(/titel/i);
        fireEvent.change(searchInput, { target: { value: "Error Movie" } });

        await waitFor(
            () => {
                expect(screen.getByText(/fehler/i)).toBeInTheDocument();
            },
            { timeout: 5000 }
        );
    });

    it("zeigt Ladeindikator während der Suche", async () => {
        (global.fetch as jest.Mock).mockImplementationOnce(() => new Promise((resolve) => setTimeout(resolve, 100)));

        render(
            <QueryClientProvider client={queryClient}>
                <AddMovieDialog isOpen={true} onClose={() => {}} />
            </QueryClientProvider>
        );

        const searchInput = screen.getByPlaceholderText(/titel/i);
        fireEvent.change(searchInput, { target: { value: "Test Movie" } });

        expect(screen.getByRole("progressbar")).toBeInTheDocument();

        await waitFor(
            () => {
                expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
            },
            { timeout: 5000 }
        );
    });

    it("zeigt Debug-Informationen nach TMDB-Test", async () => {
        (global.fetch as jest.Mock).mockImplementationOnce(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve(mockSearchResponse),
            })
        );

        render(
            <QueryClientProvider client={queryClient}>
                <AddMovieDialog isOpen={true} onClose={() => {}} />
            </QueryClientProvider>
        );

        const searchInput = screen.getByPlaceholderText(/titel/i);
        fireEvent.change(searchInput, { target: { value: "Test Movie" } });

        await waitFor(
            () => {
                expect(screen.getByText(/tmdb test erfolgreich/i)).toBeInTheDocument();
            },
            { timeout: 5000 }
        );
    });

    it("zeigt keine 'Keine Filme gefunden' Nachricht während des Ladens", async () => {
        (global.fetch as jest.Mock).mockImplementationOnce(() => new Promise((resolve) => setTimeout(resolve, 100)));

        render(
            <QueryClientProvider client={queryClient}>
                <AddMovieDialog isOpen={true} onClose={() => {}} />
            </QueryClientProvider>
        );

        const searchInput = screen.getByPlaceholderText(/titel/i);
        fireEvent.change(searchInput, { target: { value: "Test Movie" } });

        expect(screen.queryByText(/keine filme gefunden/i)).not.toBeInTheDocument();

        await waitFor(
            () => {
                expect(screen.queryByText(/keine filme gefunden/i)).toBeInTheDocument();
            },
            { timeout: 5000 }
        );
    });

    it("fügt einen Film erfolgreich hinzu", async () => {
        const onMovieAdded = vi.fn();
        (global.fetch as jest.Mock)
            .mockImplementationOnce(() =>
                Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockSearchResponse),
                })
            )
            .mockImplementationOnce(() =>
                Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockMovieDetails),
                })
            );

        render(
            <QueryClientProvider client={queryClient}>
                <AddMovieDialog isOpen={true} onClose={() => {}} />
            </QueryClientProvider>
        );

        const searchInput = screen.getByPlaceholderText(/titel/i);
        fireEvent.change(searchInput, { target: { value: "Test Movie" } });

        await waitFor(
            () => {
                expect(screen.getByText("Test Movie")).toBeInTheDocument();
            },
            { timeout: 5000 }
        );

        const addButton = screen.getByText("Film hinzufügen");
        fireEvent.click(addButton);

        await waitFor(
            () => {
                expect(onMovieAdded).toHaveBeenCalled();
            },
            { timeout: 5000 }
        );
    });
});
