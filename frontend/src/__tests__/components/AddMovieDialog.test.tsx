import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import axios from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AddMovieDialog } from "../../components/AddMovieDialog";
import userEvent from "@testing-library/user-event";
import { TMDBMovie } from "../../types/tmdb";

// Mocke Axios
vi.mock("axios");

// Definiere den MockAxiosGet Typ für die Tests
type MockAxiosGet = jest.Mock & {
    mockResolvedValue: (value: { data: Array<TMDBMovie> }) => void;
    mockRejectedValue: (error: Error) => void;
};

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
        expect(screen.getByPlaceholderText("Filmtitel eingeben...")).toBeInTheDocument();
    });

    it("führt eine erfolgreiche Suche durch", async () => {
        (axios.get as MockAxiosGet).mockResolvedValue({
            data: [mockMovie],
        });

        renderWithWrapper(<AddMovieDialog isOpen={true} onClose={mockOnClose} />);
        const searchInput = screen.getByPlaceholderText("Filmtitel eingeben...");
        await userEvent.type(searchInput, "Test{enter}");

        await waitFor(() => {
            expect(screen.getByText("Test Movie")).toBeInTheDocument();
        });

        expect(screen.getByText("Test Movie")).toBeInTheDocument();
    });

    it("zeigt Fehlermeldung bei fehlgeschlagener Suche", async () => {
        (axios.get as MockAxiosGet).mockRejectedValue(new Error("API Error"));

        renderWithWrapper(<AddMovieDialog isOpen={true} onClose={mockOnClose} />);

        const searchInput = screen.getByPlaceholderText("Filmtitel eingeben...");
        await userEvent.type(searchInput, "Test{enter}");

        await waitFor(() => {
            expect(screen.getByRole("alert")).toBeInTheDocument();
        });
    });

    it("sollte einen Film hinzufügen können", async () => {
        // Mock für die TMDB Suche
        (axios.get as MockAxiosGet).mockResolvedValue({
            data: [mockMovie],
        });

        // Mock für das Hinzufügen des Films
        (axios.post as jest.Mock).mockResolvedValue({
            data: {
                id: 1,
                title: mockMovie.title,
                description: mockMovie.overview,
            },
        });

        renderWithWrapper(<AddMovieDialog isOpen={true} onClose={mockOnClose} />);

        // Film suchen
        const searchInput = screen.getByPlaceholderText("Filmtitel eingeben...");
        await userEvent.type(searchInput, "Test{enter}");

        // Warten auf die Suchergebnisse und direkt klicken
        await waitFor(() => {
            const movieTitle = screen.getByText("Test Movie");
            fireEvent.click(movieTitle);
        });

        // Film hinzufügen - der Button hat den Text "Film hinzufügen" statt "Hinzufügen"
        const addButton = screen.getByRole("button", { name: "Film hinzufügen" });
        await userEvent.click(addButton);

        // Warten auf die erfolgreiche Mutation
        await waitFor(() => {
            expect(axios.post).toHaveBeenCalledWith(
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
        // Setup für den Test
        (axios.get as MockAxiosGet).mockResolvedValue({
            data: [mockMovie],
        });

        renderWithWrapper(<AddMovieDialog isOpen={true} onClose={mockOnClose} />);

        // Suche nach einem Film
        const searchInput = screen.getByPlaceholderText("Filmtitel eingeben...");
        await userEvent.type(searchInput, "Test{enter}");

        // Prüfe, ob die Suchergebnisse angezeigt werden
        await waitFor(() => {
            expect(screen.getByText("Test Movie")).toBeInTheDocument();
        });

        // Klicke auf das Suchergebnis, um den Film auszuwählen
        const movieItem = screen.getByText("Test Movie");
        fireEvent.click(movieItem);

        // Prüfe, ob nach der Filmauswahl der "Film hinzufügen" Button aktiviert ist
        const addButton = screen.getByRole("button", { name: "Film hinzufügen" });
        expect(addButton).not.toBeDisabled();

        // Prüfe, ob die Filmdetails angezeigt werden
        expect(screen.getByText(/Test Overview/)).toBeInTheDocument();
    });

    it("schließt den Dialog beim Klick auf das Close-Icon", async () => {
        renderWithWrapper(<AddMovieDialog isOpen={true} onClose={mockOnClose} />);
        const closeButton = screen.getByRole("button", { name: /close/i });
        await userEvent.click(closeButton);
        expect(mockOnClose).toHaveBeenCalled();
    });
});
