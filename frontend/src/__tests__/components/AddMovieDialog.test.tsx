import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import axios from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AddMovieDialog } from "../../components/AddMovieDialog";
import userEvent from "@testing-library/user-event";

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

const renderWithProviders = (ui: React.ReactElement) => {
    return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};

describe("AddMovieDialog", () => {
    const mockOnClose = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        queryClient.clear();
    });

    it("rendert den Dialog korrekt", () => {
        renderWithProviders(<AddMovieDialog isOpen={true} onClose={mockOnClose} />);
        expect(screen.getByText("Film hinzufügen")).toBeInTheDocument();
        expect(screen.getByLabelText("Film suchen")).toBeInTheDocument();
    });

    it("führt eine erfolgreiche Suche durch", async () => {
        const mockResponse = {
            data: [
                {
                    id: 1,
                    title: "Test Movie",
                    overview: "Test Overview",
                    release_date: "2024-01-01",
                    poster_path: "/test.jpg",
                    credits: {
                        cast: [],
                        crew: [],
                    },
                },
            ],
        };

        mockedAxios.get.mockResolvedValueOnce(mockResponse);

        renderWithProviders(<AddMovieDialog isOpen={true} onClose={mockOnClose} />);
        const searchInput = screen.getByLabelText(/Film suchen/i);
        await userEvent.type(searchInput, "Test{enter}");

        await waitFor(() => {
            expect(screen.getByText("Test Movie")).toBeInTheDocument();
        });

        const movieTitle = screen.getByText("Test Movie").closest('[role="button"]');
        expect(movieTitle).toBeInTheDocument();
    });

    it("zeigt Fehlermeldung bei fehlgeschlagener Suche", async () => {
        mockedAxios.get.mockRejectedValueOnce(new Error("API Error"));

        renderWithProviders(<AddMovieDialog isOpen={true} onClose={mockOnClose} />);

        const searchInput = screen.getByLabelText("Film suchen");
        fireEvent.change(searchInput, { target: { value: "Test" } });
        fireEvent.keyDown(searchInput, { key: "Enter" });

        await waitFor(() => {
            expect(screen.getByText(/API Error/)).toBeInTheDocument();
        });
    });

    it("fügt einen Film erfolgreich hinzu", async () => {
        const mockSearchResponse = {
            data: [
                {
                    id: 1,
                    title: "Test Movie",
                    overview: "Test Overview",
                    release_date: "2024-01-01",
                    poster_path: "/test.jpg",
                    credits: {
                        cast: [],
                        crew: [],
                    },
                },
            ],
        };

        mockedAxios.get.mockResolvedValueOnce(mockSearchResponse);
        mockedAxios.post.mockResolvedValueOnce({ data: { id: 1 } });

        renderWithProviders(<AddMovieDialog isOpen={true} onClose={mockOnClose} />);
        const searchInput = screen.getByLabelText(/Film suchen/i);
        await userEvent.type(searchInput, "Test{enter}");

        await waitFor(() => {
            expect(screen.getByText("Test Movie")).toBeInTheDocument();
        });

        const movieTitle = screen.getByText("Test Movie").closest('[role="button"]');
        await userEvent.click(movieTitle!);

        const addButton = screen.getByRole("button", { name: /Hinzufügen/i });
        await userEvent.click(addButton);

        await waitFor(() => {
            expect(mockOnClose).toHaveBeenCalled();
        });
    });

    it("schließt den Dialog beim Klick auf Abbrechen", () => {
        renderWithProviders(<AddMovieDialog isOpen={true} onClose={mockOnClose} />);
        const cancelButton = screen.getByText("Abbrechen");
        fireEvent.click(cancelButton);
        expect(mockOnClose).toHaveBeenCalled();
    });
});
