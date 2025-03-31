import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "../App";

const mockMovies = [
    {
        id: 1,
        title: "Avatar",
        description: "Ein epischer Film",
        year: 2009,
        poster_path: "/avatar.jpg",
        image_path: "/avatar-backdrop.jpg",
        tmdb_id: "123",
        overview: "Ein epischer Film",
        release_date: "2009-12-18",
        rating: 7.8,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
    },
];

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: false,
        },
    },
});

const renderWithProviders = (ui: React.ReactElement) => {
    return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};

type MockResponse = Response & {
    json: () => Promise<unknown>;
};

describe("App", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        queryClient.clear();
    });

    it("zeigt einen Ladeindikator während des Ladens", () => {
        global.fetch = vi.fn(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve([]),
                headers: new Headers(),
                redirected: false,
                status: 200,
                statusText: "OK",
                type: "default",
                url: "",
                clone: () => new Response(),
                body: null,
                bodyUsed: false,
                arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
                blob: () => Promise.resolve(new Blob()),
                formData: () => Promise.resolve(new FormData()),
                text: () => Promise.resolve(""),
            } as MockResponse)
        );

        renderWithProviders(<App />);
        expect(screen.getByRole("progressbar")).toBeInTheDocument();
    });

    it("zeigt eine Fehlermeldung bei einem Ladefehler", async () => {
        global.fetch = vi.fn(() => Promise.reject(new Error("Fehler beim Laden")));

        renderWithProviders(<App />);

        await waitFor(
            () => {
                expect(screen.getByText(/Fehler beim Laden der Filme/i)).toBeInTheDocument();
            },
            { timeout: 3000 }
        );
    });

    it("zeigt die Filme korrekt gruppiert nach Buchstaben an", async () => {
        global.fetch = vi.fn(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve(mockMovies),
                headers: new Headers(),
                redirected: false,
                status: 200,
                statusText: "OK",
                type: "default",
                url: "",
                clone: () => new Response(),
                body: null,
                bodyUsed: false,
                arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
                blob: () => Promise.resolve(new Blob()),
                formData: () => Promise.resolve(new FormData()),
                text: () => Promise.resolve(""),
            } as MockResponse)
        );

        renderWithProviders(<App />);

        await waitFor(
            () => {
                expect(screen.getByRole("heading", { name: "A" })).toBeInTheDocument();
                expect(screen.getByRole("heading", { name: "Avatar" })).toBeInTheDocument();
            },
            { timeout: 3000 }
        );
    });

    it("öffnet den AddMovieDialog beim Klick auf den FAB", async () => {
        global.fetch = vi.fn(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve(mockMovies),
                headers: new Headers(),
                redirected: false,
                status: 200,
                statusText: "OK",
                type: "default",
                url: "",
                clone: () => new Response(),
                body: null,
                bodyUsed: false,
                arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
                blob: () => Promise.resolve(new Blob()),
                formData: () => Promise.resolve(new FormData()),
                text: () => Promise.resolve(""),
            } as MockResponse)
        );

        renderWithProviders(<App />);

        await waitFor(
            () => {
                expect(screen.getByRole("button", { name: /hinzufügen/i })).toBeInTheDocument();
            },
            { timeout: 3000 }
        );

        const addButton = screen.getByRole("button", { name: /hinzufügen/i });
        fireEvent.click(addButton);

        await waitFor(
            () => {
                expect(screen.getByRole("dialog")).toBeInTheDocument();
                expect(screen.getByText("Film hinzufügen")).toBeInTheDocument();
            },
            { timeout: 3000 }
        );
    });

    it("zeigt den MovieDialog beim Klick auf einen Film", async () => {
        global.fetch = vi.fn(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve(mockMovies),
                headers: new Headers(),
                redirected: false,
                status: 200,
                statusText: "OK",
                type: "default",
                url: "",
                clone: () => new Response(),
                body: null,
                bodyUsed: false,
                arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
                blob: () => Promise.resolve(new Blob()),
                formData: () => Promise.resolve(new FormData()),
                text: () => Promise.resolve(""),
            } as MockResponse)
        );

        renderWithProviders(<App />);

        await waitFor(
            () => {
                expect(screen.getByRole("article")).toBeInTheDocument();
            },
            { timeout: 3000 }
        );

        const movieCard = screen.getByRole("article");
        fireEvent.click(movieCard);

        await waitFor(
            () => {
                const dialog = screen.getByRole("dialog");
                const dialogTitle = within(dialog).getByText("Avatar", { selector: ".MuiTypography-h6" });
                expect(dialogTitle).toBeInTheDocument();
            },
            { timeout: 3000 }
        );
    });
});
