import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import { MovieList } from "../../components/MovieList";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import axios from "axios";
import userEvent from "@testing-library/user-event";

vi.mock("axios");

const mockMovies = [
    {
        id: 1,
        title: "Avatar",
        description: "Test Description",
        year: 2009,
        poster_path: "/test.jpg",
        image_path: "/test.jpg",
        tmdb_id: "1",
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
    },
    {
        id: 2,
        title: "Batman",
        description: "Test Description 2",
        year: 2022,
        poster_path: "/test2.jpg",
        image_path: "/test2.jpg",
        tmdb_id: "2",
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
    },
];

describe("MovieList", () => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
            },
        },
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    beforeEach(() => {
        queryClient.clear();
        vi.clearAllMocks();
    });

    it("sollte den Ladezustand anzeigen", () => {
        (axios.get as any).mockImplementation(() => new Promise(() => {}));
        render(<MovieList />, { wrapper });
        expect(screen.getByRole("progressbar")).toBeInTheDocument();
    });

    it("sollte den Fehlerzustand anzeigen", async () => {
        (axios.get as any).mockRejectedValue(new Error("API Error"));
        render(<MovieList />, { wrapper });

        await waitFor(() => {
            const alert = screen.getByRole("alert");
            expect(alert).toBeInTheDocument();
            expect(alert).toHaveTextContent("API Error");
        });
    });

    it("sollte den leeren Zustand anzeigen", async () => {
        (axios.get as any).mockResolvedValue({ data: [] });
        render(<MovieList />, { wrapper });

        await waitFor(() => {
            const alert = screen.getByRole("alert");
            expect(alert).toBeInTheDocument();
            expect(alert).toHaveTextContent("Keine Filme in der Sammlung");
        });
    });

    it("sollte Filme nach Buchstaben gruppiert anzeigen", async () => {
        (axios.get as any).mockResolvedValue({ data: mockMovies });
        render(<MovieList />, { wrapper });

        await waitFor(() => {
            const sectionA = screen.getByTestId("section-A");
            const sectionB = screen.getByTestId("section-B");
            expect(sectionA).toBeInTheDocument();
            expect(sectionB).toBeInTheDocument();
            expect(sectionA).toHaveTextContent("Avatar");
            expect(sectionB).toHaveTextContent("Batman");
        });
    });

    it("sollte den AddMovieDialog öffnen, wenn auf den FAB-Button geklickt wird", async () => {
        (axios.get as any).mockResolvedValue({ data: mockMovies });
        render(<MovieList />, { wrapper });

        await waitFor(() => {
            const fabButton = screen.getByLabelText("Film hinzufügen");
            fireEvent.click(fabButton);
            expect(screen.getByRole("dialog")).toBeInTheDocument();
        });
    });

    it("sollte den MovieDialog öffnen, wenn auf eine MovieCard geklickt wird", async () => {
        (axios.get as any).mockResolvedValue({ data: mockMovies });
        render(<MovieList />, { wrapper });

        await waitFor(() => {
            const movieCard = screen.getByText("Avatar");
            fireEvent.click(movieCard);
            expect(screen.getByRole("dialog")).toBeInTheDocument();
        });
    });

    it("sollte zum entsprechenden Abschnitt scrollen, wenn ein Buchstabe ausgewählt wird", async () => {
        (axios.get as any).mockResolvedValue({ data: mockMovies });
        render(<MovieList />, { wrapper });

        await waitFor(() => {
            const scrollIntoViewMock = vi.fn();
            const sectionA = screen.getByTestId("section-A");
            sectionA.scrollIntoView = scrollIntoViewMock;

            const letterButtons = screen.getAllByText("A");
            const alphabetIndexButton = letterButtons.find((button) => button.className.includes("css-iipm3j"));
            if (alphabetIndexButton) {
                fireEvent.click(alphabetIndexButton);
            }

            expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: "smooth" });
        });
    });

    it("sollte den MovieDialog schließen, wenn onClose aufgerufen wird", async () => {
        const mockMovies = [
            {
                id: 1,
                title: "Avatar",
                description: "Test Description",
                year: 2009,
                poster_path: "/test.jpg",
                rating: 4,
            },
        ];

        (axios.get as any).mockResolvedValueOnce({ data: mockMovies });
        render(<MovieList />, { wrapper });

        await waitFor(() => {
            const movieCard = screen.getByRole("article", { name: "Avatar" });
            fireEvent.click(movieCard);
        });

        const closeButton = screen.getByRole("button", { name: "close" });
        fireEvent.click(closeButton);

        await waitFor(() => {
            expect(screen.queryByRole("dialog", { name: "Avatar" })).not.toBeInTheDocument();
        });
    });

    it("sollte den AddMovieDialog schließen, wenn onClose aufgerufen wird", async () => {
        (axios.get as any).mockResolvedValueOnce({ data: [] });
        render(<MovieList />, { wrapper });

        await waitFor(() => {
            const addButton = screen.getByLabelText("Film hinzufügen");
            fireEvent.click(addButton);
        });

        const closeButton = screen.getByRole("button", { name: /abbrechen/i });
        await userEvent.click(closeButton);

        await waitFor(() => {
            expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        });
    });

    it("sollte die Filme korrekt nach Buchstaben sortieren", async () => {
        const unsortedMovies = [
            { ...mockMovies[1] }, // Batman
            { ...mockMovies[0] }, // Avatar
            { id: 3, title: "Casablanca", description: "Test", year: 1942, rating: 0 },
        ];

        (axios.get as any).mockResolvedValue({ data: unsortedMovies });
        render(<MovieList />, { wrapper });

        await waitFor(() => {
            const sections = screen.getAllByTestId(/section-[A-Z]/);
            expect(sections).toHaveLength(3);
            expect(sections[0]).toHaveTextContent("A");
            expect(sections[1]).toHaveTextContent("B");
            expect(sections[2]).toHaveTextContent("C");
        });
    });

    it("sollte den AlphabetIndex mit den korrekten verfügbaren Buchstaben rendern", async () => {
        const mockMovies = [
            {
                id: 1,
                title: "Avatar",
                description: "Test Description",
                year: 2009,
                poster_path: "/test.jpg",
                rating: 4,
            },
            {
                id: 2,
                title: "Batman",
                description: "Test Description 2",
                year: 2022,
                poster_path: "/test2.jpg",
                rating: 5,
            },
        ];

        (axios.get as any).mockResolvedValueOnce({ data: mockMovies });
        render(<MovieList />, { wrapper });

        await waitFor(() => {
            const letterA = screen.getByTestId("letter-A");
            const letterB = screen.getByTestId("letter-B");
            const letterC = screen.queryByTestId("letter-C");

            expect(letterA).toBeInTheDocument();
            expect(letterB).toBeInTheDocument();
            expect(letterC).toHaveStyle({ opacity: 0.3 });
        });
    });

    it("sollte den selectedLetter aktualisieren und zum Abschnitt scrollen", async () => {
        const mockMovies = [
            {
                id: 1,
                title: "Avatar",
                description: "Test Description",
                year: 2009,
                poster_path: "/test.jpg",
                rating: 4,
            },
        ];

        (axios.get as any).mockResolvedValueOnce({ data: mockMovies });

        // Mock scrollIntoView
        const scrollIntoViewMock = vi.fn();
        window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

        render(<MovieList />, { wrapper });

        await waitFor(() => {
            const letterA = screen.getByTestId("letter-A");
            fireEvent.click(letterA);
            expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: "smooth" });
        });
    });
});
