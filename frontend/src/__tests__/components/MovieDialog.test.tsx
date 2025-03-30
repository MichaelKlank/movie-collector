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

        expect(screen.getByRole("heading", { name: "Test Movie" })).toBeInTheDocument();
        expect(screen.getByText("Test Overview")).toBeInTheDocument();
        expect(screen.getByText("2024")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /löschen/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /speichern/i })).toBeInTheDocument();
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
        mockedAxios.delete.mockResolvedValueOnce({ data: { success: true } });
        const onClose = vi.fn();

        render(
            <QueryClientProvider client={queryClient}>
                <MovieDialog movie={mockMovie} open={true} onClose={onClose} />
            </QueryClientProvider>
        );

        const deleteButton = screen.getByRole("button", { name: /löschen/i });
        fireEvent.click(deleteButton);

        expect(mockConfirm).toHaveBeenCalled();
        expect(mockedAxios.delete).toHaveBeenCalledWith(`${BACKEND_URL}/movies/${mockMovie.id}`);
        expect(onClose).toHaveBeenCalled();
    });

    it("aktualisiert einen Film von TMDB", async () => {
        mockedAxios.get.mockResolvedValueOnce(mockTMDBResponse);
        mockedAxios.put.mockResolvedValueOnce({ data: { success: true } });

        render(
            <QueryClientProvider client={queryClient}>
                <MovieDialog movie={mockMovie} open={true} onClose={() => {}} />
            </QueryClientProvider>
        );

        const updateButton = screen.getByRole("button", { name: /refresh/i });
        fireEvent.click(updateButton);

        await waitFor(
            () => {
                expect(mockedAxios.get).toHaveBeenCalledWith(`${BACKEND_URL}/tmdb/movie/${mockMovie.tmdb_id}`);
                expect(screen.getByRole("button", { name: /speichern/i })).toBeEnabled();
            },
            { timeout: 2000 }
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
        const updateButton = screen.getByRole("button", { name: /refresh/i });
        fireEvent.click(updateButton);

        await waitFor(() => {
            expect(screen.getByRole("button", { name: /speichern/i })).toBeEnabled();
        });

        const saveButton = screen.getByRole("button", { name: /speichern/i });
        fireEvent.click(saveButton);

        await waitFor(
            () => {
                expect(mockedAxios.put).toHaveBeenCalledWith(
                    `${BACKEND_URL}/movies/${mockMovie.id}`,
                    expect.any(Object)
                );
                expect(onClose).toHaveBeenCalled();
            },
            { timeout: 2000 }
        );
    });
});
