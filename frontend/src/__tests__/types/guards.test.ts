import { describe, it, expect } from "vitest";
import { isGenre, isProductionCompany, isMovie, isTMDBMovie } from "../../types/guards";

describe("Type Guards", () => {
    describe("isGenre", () => {
        it("sollte ein gültiges Genre-Objekt erkennen", () => {
            const validGenre = { id: 1, name: "Action" };
            expect(isGenre(validGenre)).toBe(true);
        });

        it("sollte ungültige Genre-Objekte ablehnen", () => {
            expect(isGenre(null)).toBe(false);
            expect(isGenre(undefined)).toBe(false);
            expect(isGenre({})).toBe(false);
            expect(isGenre({ id: "string", name: "Action" })).toBe(false);
            expect(isGenre({ id: 1, name: 123 })).toBe(false);
        });
    });

    describe("isProductionCompany", () => {
        it("sollte eine gültige Produktionsfirma erkennen", () => {
            const validCompany = { id: 1, name: "Studio" };
            expect(isProductionCompany(validCompany)).toBe(true);
        });

        it("sollte ungültige Produktionsfirmen ablehnen", () => {
            expect(isProductionCompany(null)).toBe(false);
            expect(isProductionCompany(undefined)).toBe(false);
            expect(isProductionCompany({})).toBe(false);
            expect(isProductionCompany({ id: "string", name: "Studio" })).toBe(false);
            expect(isProductionCompany({ id: 1, name: 123 })).toBe(false);
        });
    });

    describe("isMovie", () => {
        const validMovie = {
            id: 1,
            title: "Test Movie",
            description: "Test Description",
            year: 2024,
            rating: 8.5,
        };

        it("sollte ein gültiges Movie-Objekt erkennen", () => {
            expect(isMovie(validMovie)).toBe(true);
        });

        it("sollte ein vollständiges Movie-Objekt mit optionalen Feldern erkennen", () => {
            const fullMovie = {
                ...validMovie,
                image_path: "/path/to/image",
                poster_path: "/path/to/poster",
                tmdb_id: "123",
                overview: "Overview",
                release_date: "2024-01-01",
                created_at: "2024-01-01T00:00:00Z",
                updated_at: "2024-01-01T00:00:00Z",
                genres: [{ id: 1, name: "Action" }],
                production_companies: [{ id: 1, name: "Studio" }],
            };
            expect(isMovie(fullMovie)).toBe(true);
        });

        it("sollte ungültige Movie-Objekte ablehnen", () => {
            expect(isMovie(null)).toBe(false);
            expect(isMovie(undefined)).toBe(false);
            expect(isMovie({})).toBe(false);
            expect(isMovie({ ...validMovie, id: "1" })).toBe(false);
            expect(isMovie({ ...validMovie, title: 123 })).toBe(false);
            expect(isMovie({ ...validMovie, description: 123 })).toBe(false);
            expect(isMovie({ ...validMovie, year: "2024" })).toBe(false);
            expect(isMovie({ ...validMovie, rating: "8.5" })).toBe(false);
        });

        it("sollte ungültige optionale Felder ablehnen", () => {
            expect(isMovie({ ...validMovie, image_path: 123 })).toBe(false);
            expect(isMovie({ ...validMovie, poster_path: 123 })).toBe(false);
            expect(isMovie({ ...validMovie, tmdb_id: 123 })).toBe(false);
            expect(isMovie({ ...validMovie, overview: 123 })).toBe(false);
            expect(isMovie({ ...validMovie, release_date: 123 })).toBe(false);
            expect(isMovie({ ...validMovie, created_at: 123 })).toBe(false);
            expect(isMovie({ ...validMovie, updated_at: 123 })).toBe(false);
        });

        it("sollte ungültige Genre-Arrays ablehnen", () => {
            expect(isMovie({ ...validMovie, genres: "not-an-array" })).toBe(false);
            expect(isMovie({ ...validMovie, genres: [{ id: "string", name: "Action" }] })).toBe(false);
            expect(isMovie({ ...validMovie, genres: [{ id: 1, name: 123 }] })).toBe(false);
        });

        it("sollte ungültige Production-Company-Arrays ablehnen", () => {
            expect(isMovie({ ...validMovie, production_companies: "not-an-array" })).toBe(false);
            expect(isMovie({ ...validMovie, production_companies: [{ id: "string", name: "Studio" }] })).toBe(false);
            expect(isMovie({ ...validMovie, production_companies: [{ id: 1, name: 123 }] })).toBe(false);
        });
    });

    describe("isTMDBMovie", () => {
        const validTMDBMovie = {
            id: 1,
            title: "Test Movie",
            poster_path: "/path/to/poster",
            release_date: "2024-01-01",
        };

        it("sollte ein gültiges TMDBMovie-Objekt erkennen", () => {
            expect(isTMDBMovie(validTMDBMovie)).toBe(true);
        });

        it("sollte ein vollständiges TMDBMovie-Objekt mit optionalen Feldern erkennen", () => {
            const fullTMDBMovie = {
                ...validTMDBMovie,
                vote_average: 8.5,
                media_type: "movie",
                overview: "Overview",
                credits: {
                    cast: [{ name: "Actor Name" }],
                    crew: [{ name: "Crew Name", job: "Director" }],
                },
            };
            expect(isTMDBMovie(fullTMDBMovie)).toBe(true);
        });

        it("sollte ungültige TMDBMovie-Objekte ablehnen", () => {
            expect(isTMDBMovie(null)).toBe(false);
            expect(isTMDBMovie(undefined)).toBe(false);
            expect(isTMDBMovie({})).toBe(false);
            expect(isTMDBMovie({ ...validTMDBMovie, id: "1" })).toBe(false);
            expect(isTMDBMovie({ ...validTMDBMovie, title: 123 })).toBe(false);
            expect(isTMDBMovie({ ...validTMDBMovie, poster_path: 123 })).toBe(false);
            expect(isTMDBMovie({ ...validTMDBMovie, release_date: 123 })).toBe(false);
        });

        it("sollte ungültige optionale Felder ablehnen", () => {
            expect(isTMDBMovie({ ...validTMDBMovie, vote_average: "8.5" })).toBe(false);
            expect(isTMDBMovie({ ...validTMDBMovie, media_type: 123 })).toBe(false);
            expect(isTMDBMovie({ ...validTMDBMovie, overview: 123 })).toBe(false);
        });

        it("sollte ungültige Credits ablehnen", () => {
            expect(isTMDBMovie({ ...validTMDBMovie, credits: "not-an-object" })).toBe(false);
            expect(isTMDBMovie({ ...validTMDBMovie, credits: { cast: "not-an-array", crew: [] } })).toBe(false);
            expect(isTMDBMovie({ ...validTMDBMovie, credits: { cast: [], crew: "not-an-array" } })).toBe(false);
            expect(
                isTMDBMovie({
                    ...validTMDBMovie,
                    credits: {
                        cast: [{ name: 123 }],
                        crew: [{ name: "Name", job: "Job" }],
                    },
                })
            ).toBe(false);
            expect(
                isTMDBMovie({
                    ...validTMDBMovie,
                    credits: {
                        cast: [{ name: "Name" }],
                        crew: [{ name: "Name", job: 123 }],
                    },
                })
            ).toBe(false);
        });
    });
});
