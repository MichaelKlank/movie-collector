import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "../ThemeContext";
import { Movie } from "../types";

interface RenderOptions {
    movies?: {
        error: Error | null;
        loading: boolean;
        movies: Movie[];
    };
}

const defaultMovies = {
    error: null,
    loading: false,
    movies: [
        {
            id: 1,
            title: "Andromeda",
            description:
                "A young man must travel to the furthest reaches of the universe to find his long lost father.",
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
    ],
};

export const renderWithProviders = (ui: React.ReactElement, options: RenderOptions = {}) => {
    const mockMovies = options.movies || defaultMovies;
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
                staleTime: Infinity,
            },
            mutations: {
                retry: false,
            },
        },
    });

    if (mockMovies.loading) {
        queryClient.setQueryData(["movies"], undefined);
        queryClient.setQueryDefaults(["movies"], {
            enabled: true,
            refetchOnWindowFocus: false,
        });
    } else if (mockMovies.error) {
        queryClient.setQueryData(["movies"], undefined);
        queryClient.setQueryDefaults(["movies"], {
            enabled: true,
            refetchOnWindowFocus: false,
        });
    } else {
        queryClient.setQueryData(["movies"], mockMovies.movies);
        queryClient.setQueryDefaults(["movies"], {
            enabled: true,
            refetchOnWindowFocus: false,
        });
    }

    return render(
        <QueryClientProvider client={queryClient}>
            <ThemeProvider>{ui}</ThemeProvider>
        </QueryClientProvider>
    );
};
