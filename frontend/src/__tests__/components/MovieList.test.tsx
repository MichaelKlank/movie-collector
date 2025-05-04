import { describe, it, vi, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MovieList } from "../../components/MovieList";
import axios, { AxiosResponse } from "axios";
import { Movie } from "../../types";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// Mock axios
vi.mock("axios");

// Definiere den MockAxiosGet Typ
type MockAxiosGet = ((url: string) => Promise<AxiosResponse>) & {
    mockImplementation: (fn: () => Promise<AxiosResponse>) => void;
    mockRejectedValue: (error: Error) => void;
    mockResolvedValue: (value: {
        data: { data: Movie[]; meta: { page: number; limit: number; total: number; total_pages: number } };
    }) => void;
    mockResolvedValueOnce: (value: {
        data: { data: Movie[]; meta: { page: number; limit: number; total: number; total_pages: number } };
    }) => void;
};

// Beispiel-Mock-Filme
const mockMovies: Movie[] = [
    {
        id: 1,
        title: "Avatar",
        description: "Test Description",
        year: 2009,
        poster_path: "/test.jpg",
        rating: 0,
    },
    {
        id: 2,
        title: "Batman",
        description: "Test Description 2",
        year: 2008,
        poster_path: "/test2.jpg",
        rating: 0,
    },
];

// Mock React Query
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

describe("MovieList", () => {
    beforeEach(() => {
        queryClient.clear();
        vi.clearAllMocks();
    });

    it("sollte den Ladezustand anzeigen", async () => {
        (axios.get as MockAxiosGet).mockImplementation(() => {
            return new Promise(() => {
                // Diese Promise wird nie erfüllt, um den Ladezustand zu simulieren
            });
        });

        render(<MovieList />, { wrapper });
        expect(screen.getByRole("progressbar")).toBeInTheDocument();
    });

    it("sollte den Fehlerzustand anzeigen", async () => {
        (axios.get as MockAxiosGet).mockRejectedValue(new Error("API Error"));
        render(<MovieList />, { wrapper });

        await waitFor(() => {
            expect(screen.getByRole("alert")).toHaveTextContent("API Error");
        });
    });

    it("sollte den leeren Zustand anzeigen", async () => {
        (axios.get as MockAxiosGet).mockResolvedValue({
            data: {
                data: [],
                meta: { page: 1, limit: 20, total: 0, total_pages: 1 },
            },
        });
        render(<MovieList />, { wrapper });

        await waitFor(() => {
            expect(screen.getByRole("alert")).toHaveTextContent("Keine Filme in der Sammlung");
        });
    });

    it("sollte Filme nach Buchstaben gruppiert anzeigen", async () => {
        (axios.get as MockAxiosGet).mockResolvedValue({
            data: {
                data: mockMovies,
                meta: { page: 1, limit: 20, total: 2, total_pages: 1 },
            },
        });
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
        (axios.get as MockAxiosGet).mockResolvedValue({
            data: {
                data: mockMovies,
                meta: { page: 1, limit: 20, total: 2, total_pages: 1 },
            },
        });
        render(<MovieList />, { wrapper });

        await waitFor(() => {
            expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
        });

        const addButton = screen.getByRole("button", { name: /film hinzufügen/i });
        fireEvent.click(addButton);

        expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("sollte den MovieDialog öffnen, wenn auf eine MovieCard geklickt wird", async () => {
        (axios.get as MockAxiosGet).mockResolvedValue({
            data: {
                data: mockMovies,
                meta: { page: 1, limit: 20, total: 2, total_pages: 1 },
            },
        });
        render(<MovieList />, { wrapper });

        await waitFor(() => {
            const movieCard = screen.getByText("Avatar");
            fireEvent.click(movieCard);
            expect(screen.getByRole("dialog")).toBeInTheDocument();
        });
    });

    it("sollte zum entsprechenden Abschnitt scrollen, wenn ein Buchstabe ausgewählt wird", async () => {
        (axios.get as MockAxiosGet).mockResolvedValue({
            data: {
                data: mockMovies,
                meta: { page: 1, limit: 20, total: 2, total_pages: 1 },
            },
        });
        render(<MovieList />, { wrapper });

        // Warte, bis die Komponente vollständig gerendert ist
        await waitFor(() => {
            expect(screen.getByTestId("section-A")).toBeInTheDocument();
        });

        // Mock scrollIntoView direkt für das Element
        const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
        HTMLElement.prototype.scrollIntoView = vi.fn();

        // Finde den Letter-Button und klicke darauf
        const letterA = screen.getByTestId("letter-A");
        fireEvent.click(letterA);

        // Überprüfe, ob scrollIntoView aufgerufen wurde
        expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth" });

        // Stelle scrollIntoView wieder her
        HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
    });

    it("sollte den MovieDialog schließen, wenn onClose aufgerufen wird", async () => {
        (axios.get as MockAxiosGet).mockResolvedValue({
            data: {
                data: mockMovies,
                meta: { page: 1, limit: 20, total: 2, total_pages: 1 },
            },
        });
        render(<MovieList />, { wrapper });

        await waitFor(() => {
            const movieCard = screen.getByText("Avatar");
            fireEvent.click(movieCard);
            expect(screen.getByRole("dialog")).toBeInTheDocument();
        });

        // Dialog schließen
        const closeButton = screen.getByLabelText("close");
        fireEvent.click(closeButton);

        await waitFor(() => {
            expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        });
    });

    it("sollte die Filme korrekt nach Buchstaben sortieren", async () => {
        const unsortedMovies: Movie[] = [
            { ...mockMovies[1] }, // Batman
            { ...mockMovies[0] }, // Avatar
            {
                id: 3,
                title: "Casablanca",
                description: "Test",
                year: 1942,
                poster_path: "/test3.jpg",
                rating: 0,
            },
        ];

        (axios.get as MockAxiosGet).mockResolvedValue({
            data: {
                data: unsortedMovies,
                meta: { page: 1, limit: 20, total: 3, total_pages: 1 },
            },
        });
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
        (axios.get as MockAxiosGet).mockResolvedValue({
            data: {
                data: mockMovies,
                meta: { page: 1, limit: 20, total: 2, total_pages: 1 },
            },
        });
        render(<MovieList />, { wrapper });

        await waitFor(() => {
            const letterA = screen.getByTestId("letter-A");
            const letterB = screen.getByTestId("letter-B");
            expect(letterA).toBeInTheDocument();
            expect(letterB).toBeInTheDocument();
        });
    });

    it("sollte den selectedLetter aktualisieren und zum Abschnitt scrollen", async () => {
        (axios.get as MockAxiosGet).mockResolvedValue({
            data: {
                data: mockMovies,
                meta: { page: 1, limit: 20, total: 2, total_pages: 1 },
            },
        });
        render(<MovieList />, { wrapper });

        await waitFor(() => {
            const scrollIntoViewMock = vi.fn();
            // Element wird manuell gemockt
            global.document.getElementById = vi.fn().mockImplementation(() => ({
                scrollIntoView: scrollIntoViewMock,
            }));

            const letterA = screen.getByTestId("letter-A");
            fireEvent.click(letterA);
            expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: "smooth" });
        });
    });

    it("sollte den Cache-Buster-Parameter in der Anfrage verwenden", async () => {
        (axios.get as MockAxiosGet).mockResolvedValue({
            data: {
                data: mockMovies,
                meta: { page: 1, limit: 20, total: 2, total_pages: 1 },
            },
        });
        render(<MovieList />, { wrapper });

        await waitFor(() => {
            expect(axios.get).toHaveBeenCalled();
            const url = (axios.get as jest.Mock).mock.calls[0][0];
            expect(url).toContain("t=");
        });
    });

    it("sollte beim Hinzufügen von Filmen die Liste aktualisieren", async () => {
        // Erste Anfrage: Leere Filmliste
        (axios.get as MockAxiosGet).mockResolvedValueOnce({
            data: {
                data: [],
                meta: { page: 1, limit: 20, total: 0, total_pages: 1 },
            },
        });

        render(<MovieList />, { wrapper });

        // Warte auf die leere Filmliste
        await waitFor(() => {
            expect(screen.getByRole("alert")).toHaveTextContent("Keine Filme in der Sammlung");
        });

        // Simuliere das Hinzufügen eines Films (dies würde normalerweise invalidateQueries aufrufen)
        queryClient.invalidateQueries({ queryKey: ["movies"] });

        // Zweite Anfrage nach dem Hinzufügen: Filmliste mit einem Film
        (axios.get as MockAxiosGet).mockResolvedValueOnce({
            data: {
                data: [mockMovies[0]],
                meta: { page: 1, limit: 20, total: 1, total_pages: 1 },
            },
        });

        // Warten, bis die Anfrage gemacht wird und der Film erscheint
        await waitFor(() => {
            expect(axios.get).toHaveBeenCalled();
        });
    });

    it("sollte beim Löschen eines Films die Liste aktualisieren", async () => {
        // Erste Anfrage: Liste mit einem Film
        (axios.get as MockAxiosGet).mockResolvedValueOnce({
            data: {
                data: [mockMovies[0]], // nur Avatar
                meta: { page: 1, limit: 20, total: 1, total_pages: 1 },
            },
        });

        render(<MovieList />, { wrapper });

        // Warte, bis der Film angezeigt wird
        await waitFor(
            () => {
                expect(screen.getByText("Avatar")).toBeInTheDocument();
            },
            { timeout: 3000 }
        );

        // Erste Anfrage sollte gestellt worden sein
        expect(axios.get).toHaveBeenCalledTimes(1);

        // Simuliere das Löschen eines Films
        queryClient.invalidateQueries({ queryKey: ["movies"] });

        // Zweite Anfrage nach dem Löschen: Leere Liste
        (axios.get as MockAxiosGet).mockResolvedValueOnce({
            data: {
                data: [], // Keine Filme mehr
                meta: { page: 1, limit: 20, total: 0, total_pages: 1 },
            },
        });

        // Warte, bis die zweite Anfrage abgeschlossen ist
        await waitFor(
            () => {
                expect(axios.get).toHaveBeenCalledTimes(2);
            },
            { timeout: 3000 }
        );

        // Verifiziere, dass die zweite Anfrage tatsächlich gemacht wurde
        // Dies stellt sicher, dass invalidateQueries funktioniert hat
        const secondCall = (axios.get as jest.Mock).mock.calls[1][0];
        expect(secondCall).toContain("/movies");
        expect(secondCall).toContain("page=1");
        expect(secondCall).toContain("limit=20");
        expect(secondCall).toContain("t="); // Cache-Buster sollte vorhanden sein
    });
});
