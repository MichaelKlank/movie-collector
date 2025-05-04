import { screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "../App";
import { renderWithProviders } from "./test-utils";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { Movie } from "../types";
import { useQuery, QueryObserverResult } from "@tanstack/react-query";

const mockMovies: Movie[] = [
    {
        id: 1,
        title: "Andromeda",
        description: "A young man must travel to the furthest reaches of the universe to find his long lost father.",
        year: 2022,
        poster_path: "/tr12gW9tqHJ4jypEpNuE5vRtAOw.jpg",
        image_path: "/tr12gW9tqHJ4jypEpNuE5vRtAOw.jpg",
        tmdb_id: "123",
        overview: "A young man must travel to the furthest reaches of the universe to find his long lost father.",
        release_date: "2022-01-01",
        rating: 7.8,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
    },
    {
        id: 2,
        title: "Berta",
        description:
            "Following the extraordinary DANA, Spanish filmmaker Lucía Forner Segarra returns to Fantasia with BERTA...",
        year: 2024,
        poster_path: "/ha8LoZnnQGXcwH8atEUTNcGn2fU.jpg",
        image_path: "/ha8LoZnnQGXcwH8atEUTNcGn2fU.jpg",
        tmdb_id: "124",
        overview: "Following the extraordinary DANA...",
        release_date: "2024-01-01",
        rating: 8.2,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
    },
];

const defaultQueryResult = {
    dataUpdatedAt: 0,
    errorUpdatedAt: 0,
    failureCount: 0,
    failureReason: null,
    errorUpdateCount: 0,
    isFetchedAfterMount: false,
    isPaused: false,
    isPlaceholderData: false,
    isPreviousData: false,
    isRefetchError: false,
    isRefetching: false,
    isRefetchingError: false,
    isRefetchingSuccess: false,
    isStale: false,
    isStaleError: false,
    isStaleSuccess: false,
    isFetching: false,
    isFetchingError: false,
    isFetchingSuccess: false,
    isPausedError: false,
    isPausedSuccess: false,
    isPlaceholderDataError: false,
    isPlaceholderDataSuccess: false,
    refetch: vi.fn(),
    remove: vi.fn(),
    isInitialLoading: false,
    promise: Promise.resolve([] as Movie[]),
};

// Definiere den Typ für die paginierte Antwort
interface PaginatedResponse<T> {
    data: T[];
    meta: {
        page: number;
        limit: number;
        total: number;
        total_pages: number;
    };
}

vi.mock("@tanstack/react-query", async () => {
    const actual = await vi.importActual("@tanstack/react-query");
    return {
        ...actual,
        useQuery: vi.fn().mockImplementation(({ queryKey }): QueryObserverResult<PaginatedResponse<Movie>, Error> => {
            if (queryKey[0] === "movies" && !queryKey[1]) {
                const response: PaginatedResponse<Movie> = {
                    data: mockMovies,
                    meta: { page: 1, limit: 20, total: 2, total_pages: 1 },
                };
                return {
                    ...defaultQueryResult,
                    data: response,
                    isLoading: false,
                    isError: false,
                    error: null,
                    isSuccess: true,
                    isPending: false,
                    isFetched: true,
                    isFetchedAfterMount: true,
                    isLoadingError: false,
                    isRefetchError: false,
                    isPlaceholderData: false,
                    fetchStatus: "idle" as const,
                    status: "success" as const,
                    promise: Promise.resolve(response),
                };
            }
            return {
                ...defaultQueryResult,
                data: undefined,
                isLoading: false,
                isError: false,
                error: null,
                isSuccess: false,
                isPending: true,
                isFetched: false,
                isLoadingError: false,
                isRefetchError: false,
                isPlaceholderData: false,
                fetchStatus: "idle" as const,
                status: "pending" as const,
                promise: Promise.resolve(undefined) as unknown as Promise<PaginatedResponse<Movie>>,
            };
        }),
        useMutation: vi.fn().mockImplementation(() => ({
            mutate: vi.fn(),
            reset: vi.fn(),
            data: undefined,
            error: null,
            isError: false,
            isIdle: true,
            isPaused: false,
            isSuccess: false,
            status: "idle",
            variables: undefined,
            failureCount: 0,
            failureReason: null,
        })),
        QueryClient: vi.fn().mockImplementation(() => ({
            defaultOptions: {
                queries: {
                    retry: false,
                    staleTime: Infinity,
                },
                mutations: {
                    retry: false,
                },
            },
            setQueryData: vi.fn(),
            setQueryDefaults: vi.fn(),
            getQueryDefaults: vi.fn(),
            getQueryCache: vi.fn(),
            getMutationCache: vi.fn().mockReturnValue({
                build: vi.fn(),
                add: vi.fn(),
                remove: vi.fn(),
                clear: vi.fn(),
                getAll: vi.fn(),
                notify: vi.fn(),
                onFocus: vi.fn(),
                onOnline: vi.fn(),
            }),
            getQueryData: vi.fn(),
            ensureQueryData: vi.fn(),
            getQueriesData: vi.fn(),
            getQueryState: vi.fn(),
            removeQueries: vi.fn(),
            resetQueries: vi.fn(),
            cancelQueries: vi.fn(),
            invalidateQueries: vi.fn(),
            refetchQueries: vi.fn(),
            fetchQuery: vi.fn(),
            prefetchQuery: vi.fn(),
            fetchInfiniteQuery: vi.fn(),
            prefetchInfiniteQuery: vi.fn(),
            setMutationData: vi.fn(),
            getMutationData: vi.fn(),
            getMutationState: vi.fn(),
            executeMutation: vi.fn(),
            mount: vi.fn(),
            unmount: vi.fn(),
            isFetching: vi.fn(),
            isMutating: vi.fn(),
            getLogger: vi.fn(),
            clear: vi.fn(),
            suspend: vi.fn(),
            resumePausedMutations: vi.fn(),
            getDefaultState: vi.fn(),
            setOptions: vi.fn(),
            setLogger: vi.fn(),
            getOptions: vi.fn(),
            defaultMutationOptions: vi.fn(),
        })),
    };
});

describe("App", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("zeigt einen Ladeindikator während des Ladens", async () => {
        vi.mocked(useQuery).mockImplementationOnce(
            (): QueryObserverResult<Movie[], Error> => ({
                ...defaultQueryResult,
                data: undefined,
                isLoading: true,
                isError: false,
                error: null,
                isSuccess: false,
                isPending: true,
                isFetched: false,
                isLoadingError: false,
                isRefetchError: false,
                isPlaceholderData: false,
                fetchStatus: "fetching" as const,
                status: "pending" as const,
                isInitialLoading: true,
                promise: Promise.resolve([] as Movie[]),
            })
        );

        renderWithProviders(<App />);
        expect(screen.getByRole("progressbar")).toBeInTheDocument();
    });

    it("zeigt eine Fehlermeldung bei einem Ladefehler", async () => {
        const testError = new Error("Test Error");
        vi.mocked(useQuery).mockImplementationOnce(
            (): QueryObserverResult<Movie[], Error> => ({
                ...defaultQueryResult,
                data: undefined,
                isLoading: false,
                isError: true,
                error: testError,
                isSuccess: false,
                isPending: false,
                isFetched: true,
                isLoadingError: true,
                isRefetchError: false,
                isPlaceholderData: false,
                fetchStatus: "idle" as const,
                status: "error" as const,
                isInitialLoading: false,
                promise: Promise.resolve([] as Movie[]),
            })
        );

        renderWithProviders(<App />);
        const alert = await screen.findByRole("alert");
        expect(alert).toHaveTextContent("Test Error");
    });

    it("zeigt die Filme korrekt gruppiert nach Buchstaben an", async () => {
        vi.mocked(useQuery).mockImplementation(({ queryKey }): QueryObserverResult<PaginatedResponse<Movie>, Error> => {
            if (queryKey[0] === "movies" && !queryKey[1]) {
                const response: PaginatedResponse<Movie> = {
                    data: mockMovies,
                    meta: { page: 1, limit: 20, total: 2, total_pages: 1 },
                };
                return {
                    ...defaultQueryResult,
                    data: response,
                    isLoading: false,
                    isError: false,
                    error: null,
                    isSuccess: true,
                    isPending: false,
                    isFetched: true,
                    isFetchedAfterMount: true,
                    isLoadingError: false,
                    isRefetchError: false,
                    isPlaceholderData: false,
                    fetchStatus: "idle" as const,
                    status: "success" as const,
                    promise: Promise.resolve(response),
                };
            }
            return {
                ...defaultQueryResult,
                data: undefined,
                isLoading: false,
                isError: false,
                error: null,
                isSuccess: false,
                isPending: true,
                isFetched: false,
                isLoadingError: false,
                isRefetchError: false,
                isPlaceholderData: false,
                fetchStatus: "idle" as const,
                status: "pending" as const,
                promise: Promise.resolve(undefined) as unknown as Promise<PaginatedResponse<Movie>>,
            };
        });

        renderWithProviders(<App />);

        await waitFor(() => {
            expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
            expect(screen.queryByText("Keine Filme in der Sammlung")).not.toBeInTheDocument();
        });

        const sectionA = screen.getByTestId("section-A");
        const sectionB = screen.getByTestId("section-B");

        expect(sectionA).toBeInTheDocument();
        expect(sectionB).toBeInTheDocument();

        expect(within(sectionA).getByText("Andromeda")).toBeInTheDocument();
        expect(within(sectionB).getByText("Berta")).toBeInTheDocument();
    });

    it("öffnet den AddMovieDialog beim Klick auf den FAB", async () => {
        renderWithProviders(<App />);
        const user = userEvent.setup();

        await waitFor(() => {
            expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
        });

        const addButton = screen.getByRole("button", { name: /film hinzufügen/i });
        await user.click(addButton);

        const dialog = screen.getByRole("dialog");
        expect(dialog).toHaveTextContent(/film hinzufügen/i);
    });

    it("zeigt den MovieDialog beim Klick auf einen Film", async () => {
        vi.mocked(useQuery).mockImplementation(({ queryKey }): QueryObserverResult<PaginatedResponse<Movie>, Error> => {
            if (queryKey[0] === "movies" && !queryKey[1]) {
                const response: PaginatedResponse<Movie> = {
                    data: mockMovies,
                    meta: { page: 1, limit: 20, total: 2, total_pages: 1 },
                };
                return {
                    ...defaultQueryResult,
                    data: response,
                    isLoading: false,
                    isError: false,
                    error: null,
                    isSuccess: true,
                    isPending: false,
                    isFetched: true,
                    isFetchedAfterMount: true,
                    isLoadingError: false,
                    isRefetchError: false,
                    isPlaceholderData: false,
                    fetchStatus: "idle" as const,
                    status: "success" as const,
                    promise: Promise.resolve(response),
                };
            }
            return {
                ...defaultQueryResult,
                data: undefined,
                isLoading: false,
                isError: false,
                error: null,
                isSuccess: false,
                isPending: true,
                isFetched: false,
                isLoadingError: false,
                isRefetchError: false,
                isPlaceholderData: false,
                fetchStatus: "idle" as const,
                status: "pending" as const,
                promise: Promise.resolve(undefined) as unknown as Promise<PaginatedResponse<Movie>>,
            };
        });

        renderWithProviders(<App />);
        const user = userEvent.setup();

        await waitFor(() => {
            expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
            expect(screen.queryByText("Keine Filme in der Sammlung")).not.toBeInTheDocument();
        });

        await waitFor(() => {
            expect(screen.getByText("Andromeda")).toBeInTheDocument();
        });

        const movieCard = screen.getByRole("article", { name: "Andromeda" });
        await user.click(movieCard);

        const dialog = await screen.findByRole("dialog");
        expect(dialog).toHaveTextContent("Andromeda");
    });
});
