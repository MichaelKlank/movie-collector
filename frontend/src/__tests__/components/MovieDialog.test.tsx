import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MovieDialog } from "../../components/MovieDialog";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, beforeEach, vi } from "vitest";
import axios from "axios";
import { Movie } from "../../types";
import { BACKEND_URL } from "../../config";

// Mock window.confirm
const mockConfirm = vi.fn(() => true);
window.confirm = mockConfirm;

// Mock axios
vi.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Setup QueryClient für Tests
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: false,
            enabled: false,
        },
    },
});

const mockMovie: Movie = {
    id: 1,
    title: "Test Movie",
    description: "Test Description",
    year: 2024,
    poster_path: "/test-poster.jpg",
    image_path: "/test-backdrop.jpg",
    tmdb_id: "123",
    overview: "Test Overview",
    release_date: "2024-01-01",
    rating: 8.5,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    genres: [{ id: 1, name: "Action" }],
    production_companies: [{ id: 1, name: "Test Studio" }],
};

const mockTMDBResponse = {
    data: {
        id: 1,
        title: "Test Movie",
        overview: "Test Description",
        release_date: "2024-01-01",
        poster_path: "/test-poster.jpg",
        backdrop_path: "/test-backdrop.jpg",
        genres: [{ id: 1, name: "Action" }],
        production_companies: [{ id: 1, name: "Test Studio" }],
        vote_average: 8.5,
        vote_count: 1000,
    },
};

describe("MovieDialog", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (axios.get as jest.Mock).mockReset();
        (axios.delete as jest.Mock).mockReset();
        (axios.put as jest.Mock).mockReset();
    });

    it("rendert den Dialog mit allen wichtigen Elementen", () => {
        render(
            <QueryClientProvider client={queryClient}>
                <MovieDialog movie={mockMovie} open={true} onClose={() => {}} />
            </QueryClientProvider>
        );

        expect(screen.getByRole("heading", { name: "Test Movie", level: 4 })).toBeInTheDocument();
        expect(screen.getByText("Test Description")).toBeInTheDocument();
        expect(screen.getByText("2024")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Löschen" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Aktualisieren" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Speichern" })).toBeDisabled();
    });

    it("ruft onClose beim Schließen auf", () => {
        const onClose = vi.fn();
        render(
            <QueryClientProvider client={queryClient}>
                <MovieDialog movie={mockMovie} open={true} onClose={onClose} />
            </QueryClientProvider>
        );

        const closeButton = screen.getByRole("button", { name: /close/i });
        fireEvent.click(closeButton);
        expect(onClose).toHaveBeenCalled();
    });

    it("löscht einen Film erfolgreich", async () => {
        const onClose = vi.fn();
        mockedAxios.delete.mockResolvedValueOnce({ data: { success: true } });
        window.confirm = vi.fn(() => true);

        render(
            <QueryClientProvider client={queryClient}>
                <MovieDialog movie={mockMovie} open={true} onClose={onClose} />
            </QueryClientProvider>
        );

        const deleteButton = screen.getByRole("button", { name: "Löschen" });
        fireEvent.click(deleteButton);

        await waitFor(() => {
            expect(mockedAxios.delete).toHaveBeenCalledWith(`${BACKEND_URL}/movies/${mockMovie.id}`);
            expect(onClose).toHaveBeenCalled();
        });
    });

    it("aktualisiert einen Film von TMDB", async () => {
        render(
            <QueryClientProvider client={queryClient}>
                <MovieDialog movie={mockMovie} open={true} onClose={() => {}} />
            </QueryClientProvider>
        );

        // Aktualisiere den Film von TMDB
        mockedAxios.get.mockResolvedValueOnce(mockTMDBResponse);
        const updateButton = screen.getByRole("button", { name: "Aktualisieren" });
        fireEvent.click(updateButton);

        await waitFor(
            () => {
                expect(mockedAxios.get).toHaveBeenCalledWith(`${BACKEND_URL}/tmdb/movie/${mockMovie.tmdb_id}`);
            },
            { timeout: 5000 }
        );

        // Prüfe, ob der Speichern-Button aktiviert wurde
        await waitFor(
            () => {
                expect(screen.getByRole("button", { name: "Speichern" })).toBeEnabled();
            },
            { timeout: 5000 }
        );
    });

    it("speichert Änderungen erfolgreich", async () => {
        mockedAxios.put.mockResolvedValueOnce({ data: { success: true } });
        const onClose = vi.fn();

        render(
            <QueryClientProvider client={queryClient}>
                <MovieDialog movie={mockMovie} open={true} onClose={onClose} />
            </QueryClientProvider>
        );

        // Aktualisiere den Film von TMDB
        mockedAxios.get.mockResolvedValueOnce(mockTMDBResponse);
        const updateButton = screen.getByRole("button", { name: "Aktualisieren" });
        fireEvent.click(updateButton);

        // Warte, bis der Speichern-Button aktiviert wurde
        await waitFor(
            () => {
                expect(screen.getByRole("button", { name: "Speichern" })).toBeEnabled();
            },
            { timeout: 5000 }
        );

        const saveButton = screen.getByRole("button", { name: "Speichern" });
        fireEvent.click(saveButton);

        await waitFor(
            () => {
                expect(mockedAxios.put).toHaveBeenCalledWith(
                    `${BACKEND_URL}/movies/${mockMovie.id}`,
                    expect.objectContaining({
                        ...mockMovie,
                        ...mockTMDBResponse.data,
                        id: mockMovie.id,
                        description: mockTMDBResponse.data.overview,
                        overview: mockTMDBResponse.data.overview,
                    })
                );
                expect(onClose).toHaveBeenCalled();
            },
            { timeout: 5000 }
        );
    });

    it("zeigt Fehlermeldung bei TMDB-Update-Fehler", async () => {
        mockedAxios.get.mockRejectedValueOnce(new Error("TMDB Update fehlgeschlagen"));

        render(
            <QueryClientProvider client={queryClient}>
                <MovieDialog movie={mockMovie} open={true} onClose={() => {}} />
            </QueryClientProvider>
        );

        const updateButton = screen.getByRole("button", { name: "Aktualisieren" });
        fireEvent.click(updateButton);

        await waitFor(() => {
            expect(mockedAxios.get).toHaveBeenCalledWith(`${BACKEND_URL}/tmdb/movie/${mockMovie.tmdb_id}`);
            expect(screen.getByText(/TMDB Update fehlgeschlagen/i)).toBeInTheDocument();
        });
    });

    it("zeigt Fehlermeldung bei Speicherfehler", async () => {
        mockedAxios.get.mockResolvedValueOnce(mockTMDBResponse);
        mockedAxios.put.mockRejectedValueOnce(new Error("Speichern fehlgeschlagen"));

        render(
            <QueryClientProvider client={queryClient}>
                <MovieDialog movie={mockMovie} open={true} onClose={() => {}} />
            </QueryClientProvider>
        );

        const updateButton = screen.getByRole("button", { name: "Aktualisieren" });
        fireEvent.click(updateButton);

        await waitFor(() => {
            expect(screen.getByRole("button", { name: "Speichern" })).toBeEnabled();
        });

        const saveButton = screen.getByRole("button", { name: "Speichern" });
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(screen.getByText(/Speichern fehlgeschlagen/i)).toBeInTheDocument();
        });
    });

    it("erkennt Änderungen korrekt", async () => {
        mockedAxios.get.mockResolvedValueOnce({
            data: {
                ...mockTMDBResponse.data,
                title: "Geänderter Titel",
                overview: "Geänderte Beschreibung",
            },
        });

        render(
            <QueryClientProvider client={queryClient}>
                <MovieDialog movie={mockMovie} open={true} onClose={() => {}} />
            </QueryClientProvider>
        );

        const updateButton = screen.getByRole("button", { name: "Aktualisieren" });
        fireEvent.click(updateButton);

        await waitFor(() => {
            const saveButton = screen.getByRole("button", { name: "Speichern" });
            expect(saveButton).toBeEnabled();
        });
    });

    it("zeigt Platzhalter-Bild wenn kein Poster vorhanden", () => {
        const movieWithoutPoster = {
            ...mockMovie,
            poster_path: undefined,
            image_path: undefined,
        };

        render(
            <QueryClientProvider client={queryClient}>
                <MovieDialog movie={movieWithoutPoster} open={true} onClose={() => {}} />
            </QueryClientProvider>
        );

        const posterImage = screen.getByRole("img", { name: movieWithoutPoster.title });
        expect(posterImage).toHaveAttribute("src", "/placeholder.png");
    });

    it("bestätigt Löschvorgang", () => {
        window.confirm = vi.fn(() => false);
        const onClose = vi.fn();

        render(
            <QueryClientProvider client={queryClient}>
                <MovieDialog movie={mockMovie} open={true} onClose={onClose} />
            </QueryClientProvider>
        );

        const deleteButton = screen.getByRole("button", { name: "Löschen" });
        fireEvent.click(deleteButton);

        expect(window.confirm).toHaveBeenCalledWith(`Möchten Sie "${mockMovie.title}" wirklich löschen?`);
        expect(onClose).not.toHaveBeenCalled();
    });
});
