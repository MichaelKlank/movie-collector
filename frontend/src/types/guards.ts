import { Genre, Movie, ProductionCompany } from "../types";
import { TMDBMovie } from "./tmdb";

export function isGenre(obj: unknown): obj is Genre {
    return (
        typeof obj === "object" &&
        obj !== null &&
        "id" in obj &&
        typeof (obj as Genre).id === "number" &&
        "name" in obj &&
        typeof (obj as Genre).name === "string"
    );
}

export function isProductionCompany(obj: unknown): obj is ProductionCompany {
    return (
        typeof obj === "object" &&
        obj !== null &&
        "id" in obj &&
        typeof (obj as ProductionCompany).id === "number" &&
        "name" in obj &&
        typeof (obj as ProductionCompany).name === "string"
    );
}

export function isMovie(obj: unknown): obj is Movie {
    if (
        typeof obj !== "object" ||
        obj === null ||
        !("id" in obj) ||
        !("title" in obj) ||
        !("description" in obj) ||
        !("year" in obj) ||
        !("rating" in obj)
    ) {
        return false;
    }

    const movie = obj as Movie;

    if (
        typeof movie.id !== "number" ||
        typeof movie.title !== "string" ||
        typeof movie.description !== "string" ||
        typeof movie.year !== "number" ||
        typeof movie.rating !== "number"
    ) {
        return false;
    }

    // Optional fields type checking
    if (
        (movie.image_path !== undefined && typeof movie.image_path !== "string") ||
        (movie.poster_path !== undefined && typeof movie.poster_path !== "string") ||
        (movie.tmdb_id !== undefined && typeof movie.tmdb_id !== "string") ||
        (movie.overview !== undefined && typeof movie.overview !== "string") ||
        (movie.release_date !== undefined && typeof movie.release_date !== "string") ||
        (movie.created_at !== undefined && typeof movie.created_at !== "string") ||
        (movie.updated_at !== undefined && typeof movie.updated_at !== "string")
    ) {
        return false;
    }

    // Check arrays of complex types
    if (movie.genres !== undefined && (!Array.isArray(movie.genres) || !movie.genres.every(isGenre))) {
        return false;
    }

    if (
        movie.production_companies !== undefined &&
        (!Array.isArray(movie.production_companies) || !movie.production_companies.every(isProductionCompany))
    ) {
        return false;
    }

    return true;
}

export function isTMDBMovie(obj: unknown): obj is TMDBMovie {
    if (
        typeof obj !== "object" ||
        obj === null ||
        !("id" in obj) ||
        !("title" in obj) ||
        !("poster_path" in obj) ||
        !("release_date" in obj)
    ) {
        return false;
    }

    const movie = obj as TMDBMovie;

    if (
        typeof movie.id !== "number" ||
        typeof movie.title !== "string" ||
        typeof movie.poster_path !== "string" ||
        typeof movie.release_date !== "string"
    ) {
        return false;
    }

    // Optional fields type checking
    if (
        (movie.vote_average !== undefined && typeof movie.vote_average !== "number") ||
        (movie.media_type !== undefined && typeof movie.media_type !== "string") ||
        (movie.overview !== undefined && typeof movie.overview !== "string")
    ) {
        return false;
    }

    // Check credits if present
    if (movie.credits !== undefined) {
        if (
            typeof movie.credits !== "object" ||
            !Array.isArray(movie.credits.cast) ||
            !Array.isArray(movie.credits.crew)
        ) {
            return false;
        }

        // Check cast array
        if (
            !movie.credits.cast.every(
                (cast) => typeof cast === "object" && cast !== null && "name" in cast && typeof cast.name === "string"
            )
        ) {
            return false;
        }

        // Check crew array
        if (
            !movie.credits.crew.every(
                (crew) =>
                    typeof crew === "object" &&
                    crew !== null &&
                    "name" in crew &&
                    typeof crew.name === "string" &&
                    "job" in crew &&
                    typeof crew.job === "string"
            )
        ) {
            return false;
        }
    }

    return true;
}
