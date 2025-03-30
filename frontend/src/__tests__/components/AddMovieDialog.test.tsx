import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import axios from "axios";
import { AddMovieDialog } from "../../components/AddMovieDialog";

// Mock window.confirm
const mockConfirm = vi.fn(() => true);
window.confirm = mockConfirm;

// Mock axios
vi.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock TMDB API responses
const mockSearchResponse = {
    data: [
        {
            id: 1,
            title: "Test Movie",
            overview: "Test Description",
            release_date: "2024-01-01",
            poster_path: "/test-poster.jpg",
            backdrop_path: "/test-backdrop.jpg",
        },
    ],
};

const mockMovieDetailsResponse = {
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

const mockTMDBTestResponse = {
    data: {
        success: true,
        message: "TMDB API is working",
    },
};

describe("AddMovieDialog", () => {
    let queryClient: QueryClient;

    beforeEach(() => {
        queryClient = new QueryClient({
            defaultOptions: {
                queries: {
                    retry: false,
                },
            },
        });
        vi.clearAllMocks();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("renders the dialog with essential elements", () => {
        render(
            <QueryClientProvider client={queryClient}>
                <AddMovieDialog isOpen={true} onClose={() => {}} />
            </QueryClientProvider>
        );

        expect(screen.getByText("Film hinzufügen")).toBeInTheDocument();
        expect(screen.getByLabelText("Film suchen")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /suchen/i })).toBeInTheDocument();
    });

    it("performs a successful search", async () => {
        mockedAxios.get.mockResolvedValueOnce(mockSearchResponse);

        render(
            <QueryClientProvider client={queryClient}>
                <AddMovieDialog isOpen={true} onClose={() => {}} />
            </QueryClientProvider>
        );

        const searchInput = screen.getByLabelText("Film suchen");
        const searchButton = screen.getByRole("button", { name: /suchen/i });

        fireEvent.change(searchInput, { target: { value: "Test Movie" } });
        fireEvent.click(searchButton);

        await waitFor(
            () => {
                expect(screen.getByText("Test Movie")).toBeInTheDocument();
            },
            { timeout: 2000 }
        );
    });

    it("displays error message when search fails", async () => {
        mockedAxios.get.mockRejectedValueOnce(new Error("Search failed"));

        render(
            <QueryClientProvider client={queryClient}>
                <AddMovieDialog isOpen={true} onClose={() => {}} />
            </QueryClientProvider>
        );

        const searchInput = screen.getByLabelText("Film suchen");
        const searchButton = screen.getByRole("button", { name: /suchen/i });

        fireEvent.change(searchInput, { target: { value: "Test Movie" } });
        fireEvent.click(searchButton);

        await waitFor(
            () => {
                expect(screen.getByText(/fehlgeschlagen/i)).toBeInTheDocument();
            },
            { timeout: 2000 }
        );
    });

    it("shows loading indicator during search", async () => {
        mockedAxios.get.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));

        render(
            <QueryClientProvider client={queryClient}>
                <AddMovieDialog isOpen={true} onClose={() => {}} />
            </QueryClientProvider>
        );

        const searchInput = screen.getByLabelText("Film suchen");
        const searchButton = screen.getByRole("button", { name: /suchen/i });

        fireEvent.change(searchInput, { target: { value: "Test Movie" } });
        fireEvent.click(searchButton);

        expect(screen.getByRole("progressbar")).toBeInTheDocument();

        await waitFor(
            () => {
                expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
            },
            { timeout: 2000 }
        );
    });

    it("successfully adds a movie", async () => {
        mockedAxios.get.mockResolvedValueOnce(mockSearchResponse);
        mockedAxios.get.mockResolvedValueOnce(mockMovieDetailsResponse);
        mockedAxios.post.mockResolvedValueOnce({ data: { success: true } });

        render(
            <QueryClientProvider client={queryClient}>
                <AddMovieDialog isOpen={true} onClose={() => {}} />
            </QueryClientProvider>
        );

        const searchInput = screen.getByLabelText("Film suchen");
        const searchButton = screen.getByRole("button", { name: /suchen/i });

        fireEvent.change(searchInput, { target: { value: "Test Movie" } });
        fireEvent.click(searchButton);

        await waitFor(
            () => {
                expect(screen.getByText("Test Movie")).toBeInTheDocument();
            },
            { timeout: 2000 }
        );

        const addButton = screen.getByRole("button", { name: /hinzufügen/i });
        fireEvent.click(addButton);

        await waitFor(
            () => {
                expect(mockedAxios.post).toHaveBeenCalled();
            },
            { timeout: 2000 }
        );
    });

    it("tests TMDB connection successfully", async () => {
        mockedAxios.get.mockResolvedValueOnce(mockTMDBTestResponse);

        render(
            <QueryClientProvider client={queryClient}>
                <AddMovieDialog isOpen={true} onClose={() => {}} />
            </QueryClientProvider>
        );

        const testButton = screen.getByRole("button", { name: /TMDB Verbindung testen/i });
        fireEvent.click(testButton);

        await waitFor(
            () => {
                expect(screen.getByText(/TMDB API is working/i)).toBeInTheDocument();
            },
            { timeout: 2000 }
        );
    });

    it("shows metadata controls for selected movie", async () => {
        mockedAxios.get.mockResolvedValueOnce(mockSearchResponse);
        mockedAxios.get.mockResolvedValueOnce(mockMovieDetailsResponse);

        render(
            <QueryClientProvider client={queryClient}>
                <AddMovieDialog isOpen={true} onClose={() => {}} />
            </QueryClientProvider>
        );

        const searchInput = screen.getByLabelText("Film suchen");
        const searchButton = screen.getByRole("button", { name: /suchen/i });

        fireEvent.change(searchInput, { target: { value: "Test Movie" } });
        fireEvent.click(searchButton);

        await waitFor(
            () => {
                expect(screen.getByText("Test Movie")).toBeInTheDocument();
            },
            { timeout: 2000 }
        );

        const movieItem = screen.getByText("Test Movie");
        fireEvent.click(movieItem);

        await waitFor(
            () => {
                expect(screen.getByText("Action")).toBeInTheDocument();
                expect(screen.getByText("Test Studio")).toBeInTheDocument();
            },
            { timeout: 2000 }
        );
    });

    it("closes dialog when cancel button is clicked", () => {
        const onClose = vi.fn();
        render(
            <QueryClientProvider client={queryClient}>
                <AddMovieDialog isOpen={true} onClose={onClose} />
            </QueryClientProvider>
        );

        const cancelButton = screen.getByRole("button", { name: /abbrechen/i });
        fireEvent.click(cancelButton);

        expect(onClose).toHaveBeenCalled();
    });
});
