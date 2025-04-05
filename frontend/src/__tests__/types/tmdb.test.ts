import { describe, it, expect } from "vitest";
import { TMDBMovie } from "../../types/tmdb";

describe("TMDB Types", () => {
    describe("TMDBMovie", () => {
        it("sollte ein gültiges TMDBMovie-Objekt mit Pflichtfeldern akzeptieren", () => {
            const movie: TMDBMovie = {
                id: 1,
                title: "Test Movie",
                poster_path: "/path/to/poster.jpg",
                release_date: "2024-01-01",
            };
            expect(movie).toBeDefined();
            expect(movie.id).toBe(1);
            expect(movie.title).toBe("Test Movie");
            expect(movie.poster_path).toBe("/path/to/poster.jpg");
            expect(movie.release_date).toBe("2024-01-01");
        });

        it("sollte optionale Felder akzeptieren", () => {
            const movie: TMDBMovie = {
                id: 1,
                title: "Test Movie",
                poster_path: "/path/to/poster.jpg",
                release_date: "2024-01-01",
                vote_average: 8.5,
                media_type: "movie",
                overview: "Test Overview",
                credits: {
                    cast: [{ name: "Actor 1" }, { name: "Actor 2" }],
                    crew: [
                        { name: "Director", job: "Director" },
                        { name: "Writer", job: "Writer" },
                    ],
                },
            };
            expect(movie.vote_average).toBe(8.5);
            expect(movie.media_type).toBe("movie");
            expect(movie.overview).toBe("Test Overview");
            expect(movie.credits?.cast).toHaveLength(2);
            expect(movie.credits?.crew).toHaveLength(2);
        });

        it("sollte ein TMDBMovie-Objekt ohne optionale Felder akzeptieren", () => {
            const movie: TMDBMovie = {
                id: 1,
                title: "Test Movie",
                poster_path: "/path/to/poster.jpg",
                release_date: "2024-01-01",
            };
            expect(movie.vote_average).toBeUndefined();
            expect(movie.media_type).toBeUndefined();
            expect(movie.overview).toBeUndefined();
            expect(movie.credits).toBeUndefined();
        });

        it("sollte ein TMDBMovie-Objekt mit teilweise optionalen Feldern akzeptieren", () => {
            const movie: TMDBMovie = {
                id: 1,
                title: "Test Movie",
                poster_path: "/path/to/poster.jpg",
                release_date: "2024-01-01",
                vote_average: 8.5,
                credits: {
                    cast: [{ name: "Actor 1" }],
                    crew: [{ name: "Director", job: "Director" }],
                },
            };
            expect(movie.vote_average).toBe(8.5);
            expect(movie.media_type).toBeUndefined();
            expect(movie.overview).toBeUndefined();
            expect(movie.credits?.cast).toHaveLength(1);
            expect(movie.credits?.crew).toHaveLength(1);
        });

        it("should validate a minimal TMDBMovie object", () => {
            const movie: TMDBMovie = {
                id: 1,
                title: "Test Movie",
                poster_path: "/test.jpg",
                release_date: "2024-01-01",
            };

            expect(movie).toBeDefined();
            expect(movie.id).toBe(1);
            expect(movie.title).toBe("Test Movie");
            expect(movie.poster_path).toBe("/test.jpg");
            expect(movie.release_date).toBe("2024-01-01");
        });

        it("should validate a TMDBMovie object with all optional fields", () => {
            const movie: TMDBMovie = {
                id: 1,
                title: "Test Movie",
                poster_path: "/test.jpg",
                release_date: "2024-01-01",
                vote_average: 8.5,
                media_type: "movie",
                overview: "Test Overview",
                credits: {
                    cast: [{ name: "Test Actor" }],
                    crew: [{ name: "Test Director", job: "Director" }],
                },
            };

            expect(movie).toBeDefined();
            expect(movie.vote_average).toBe(8.5);
            expect(movie.media_type).toBe("movie");
            expect(movie.overview).toBe("Test Overview");
            expect(movie.credits).toBeDefined();
            expect(movie.credits!.cast).toHaveLength(1);
            expect(movie.credits!.cast[0].name).toBe("Test Actor");
            expect(movie.credits!.crew).toHaveLength(1);
            expect(movie.credits!.crew[0].name).toBe("Test Director");
            expect(movie.credits!.crew[0].job).toBe("Director");
        });
    });
});
