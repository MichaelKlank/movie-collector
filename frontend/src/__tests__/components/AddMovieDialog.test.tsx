import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import axios from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AddMovieDialog } from "../../components/AddMovieDialog";
import userEvent from "@testing-library/user-event";
import { TMDBMovie } from "../../types/tmdb";

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

const renderWithWrapper = (ui: React.ReactElement) => {
    return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};

const mockMovie: TMDBMovie = {
    id: 1,
    title: "Test Movie",
    overview: "Test Overview",
    release_date: "2024-01-01",
    poster_path: "/test.jpg",
    credits: {
        cast: [],
        crew: [],
    },
};

describe("AddMovieDialog", () => {
    const mockOnClose = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        queryClient.clear();
    });

    it("rendert den Dialog korrekt", () => {
        renderWithWrapper(<AddMovieDialog isOpen={true} onClose={mockOnClose} />);
        expect(screen.getByText("Film hinzufügen")).toBeInTheDocument();
        expect(screen.getByLabelText("Film suchen")).toBeInTheDocument();
    });

    it("führt eine erfolgreiche Suche durch", async () => {
        const mockResponse = {
            data: [mockMovie],
        };

        mockedAxios.get.mockResolvedValueOnce(mockResponse);

        renderWithWrapper(<AddMovieDialog isOpen={true} onClose={mockOnClose} />);
        const searchInput = screen.getByLabelText("Film suchen");
        await userEvent.type(searchInput, "Test{enter}");

        await waitFor(() => {
            expect(screen.getByText("Test Movie")).toBeInTheDocument();
        });

        const movieTitle = screen.getByText("Test Movie").closest('[role="button"]');
        expect(movieTitle).toBeInTheDocument();
    });

    it("zeigt Fehlermeldung bei fehlgeschlagener Suche", async () => {
        mockedAxios.get.mockRejectedValueOnce(new Error("API Error"));

        renderWithWrapper(<AddMovieDialog isOpen={true} onClose={mockOnClose} />);

        const searchInput = screen.getByLabelText("Film suchen");
        await userEvent.type(searchInput, "Test{enter}");

        await waitFor(() => {
            expect(screen.getByRole("alert")).toBeInTheDocument();
        });
    });

    it("sollte einen Film hinzufügen können", async () => {
        const mockMovie = {
            id: 1,
            title: "Test Movie",
            overview: "Test Overview",
            release_date: "2024-01-01",
            poster_path: "/test.jpg",
            credits: {
                cast: [],
                crew: [],
            },
        };

        mockedAxios.get.mockResolvedValueOnce({ data: [mockMovie] });
        mockedAxios.post.mockResolvedValueOnce({ data: { success: true } });
        renderWithWrapper(<AddMovieDialog isOpen={true} onClose={mockOnClose} />);

        // Film suchen
        const searchInput = screen.getByLabelText("Film suchen");
        await userEvent.type(searchInput, "Test{enter}");

        // Warten auf die Suchergebnisse
        await waitFor(() => {
            const movieResults = screen.getAllByRole("button");
            const movieResult = movieResults.find((button) => button.textContent?.includes("Test Movie"));
            expect(movieResult).toBeInTheDocument();
        });

        // Film auswählen
        const movieResults = screen.getAllByRole("button");
        const movieResult = movieResults.find((button) => button.textContent?.includes("Test Movie"));
        await userEvent.click(movieResult!);

        // Film hinzufügen
        const addButton = screen.getByRole("button", { name: "Hinzufügen" });
        await userEvent.click(addButton);

        // Warten auf die erfolgreiche Mutation
        await waitFor(() => {
            expect(mockedAxios.post).toHaveBeenCalledWith(
                expect.stringContaining("/movies"),
                expect.objectContaining({
                    title: "Test Movie",
                    overview: "Test Overview",
                })
            );
            expect(mockOnClose).toHaveBeenCalled();
        });
    });

    it("schließt den Dialog beim Klick auf Abbrechen", async () => {
        renderWithWrapper(<AddMovieDialog isOpen={true} onClose={mockOnClose} />);
        const cancelButton = screen.getByText("Abbrechen");
        await userEvent.click(cancelButton);
        expect(mockOnClose).toHaveBeenCalled();
    });

    it("verwaltet den Film-Metadaten-Status korrekt", async () => {
        mockedAxios.get.mockResolvedValueOnce({ data: [mockMovie] });
        renderWithWrapper(<AddMovieDialog isOpen={true} onClose={mockOnClose} />);

        const searchInput = screen.getByLabelText("Film suchen");
        await userEvent.type(searchInput, "Test{enter}");

        await waitFor(() => {
            const movieItem = screen.getByText("Test Movie");
            fireEvent.click(movieItem);
        });

        const seenButton = screen.getByLabelText("Als gesehen markieren");
        await userEvent.click(seenButton);

        const watchlistButton = screen.getByLabelText("Zur Merkliste hinzufügen");
        await userEvent.click(watchlistButton);

        expect(seenButton).toHaveAttribute("aria-pressed", "true");
        expect(watchlistButton).toHaveAttribute("aria-pressed", "true");
    });

    it("schließt den Dialog beim Klick auf das Close-Icon", async () => {
        renderWithWrapper(<AddMovieDialog isOpen={true} onClose={mockOnClose} />);
        const closeButton = screen.getByRole("button", { name: /close/i });
        await userEvent.click(closeButton);
        expect(mockOnClose).toHaveBeenCalled();
    });
});
