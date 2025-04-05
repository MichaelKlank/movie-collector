import { Movie, Genre, ProductionCompany } from "../../types";

describe("Types", () => {
    it("should validate a valid Movie object", () => {
        const movie: Movie = {
            id: 1,
            title: "Test Movie",
            description: "Test Description",
            year: 2024,
            rating: 8.5,
        };

        expect(movie).toBeDefined();
        expect(movie.id).toBe(1);
        expect(movie.title).toBe("Test Movie");
        expect(movie.description).toBe("Test Description");
        expect(movie.year).toBe(2024);
        expect(movie.rating).toBe(8.5);
    });

    it("should validate a Movie object with optional fields", () => {
        const genre: Genre = {
            id: 1,
            name: "Action",
        };

        const productionCompany: ProductionCompany = {
            id: 1,
            name: "Test Studio",
        };

        const movie: Movie = {
            id: 1,
            title: "Test Movie",
            description: "Test Description",
            year: 2024,
            rating: 8.5,
            image_path: "/test.jpg",
            poster_path: "/poster.jpg",
            tmdb_id: "123",
            overview: "Test Overview",
            release_date: "2024-01-01",
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z",
            genres: [genre],
            production_companies: [productionCompany],
        };

        expect(movie).toBeDefined();
        expect(movie.image_path).toBe("/test.jpg");
        expect(movie.poster_path).toBe("/poster.jpg");
        expect(movie.tmdb_id).toBe("123");
        expect(movie.overview).toBe("Test Overview");
        expect(movie.release_date).toBe("2024-01-01");
        expect(movie.created_at).toBe("2024-01-01T00:00:00Z");
        expect(movie.updated_at).toBe("2024-01-01T00:00:00Z");
        expect(movie.genres).toHaveLength(1);
        expect(movie.genres![0]).toEqual(genre);
        expect(movie.production_companies).toHaveLength(1);
        expect(movie.production_companies![0]).toEqual(productionCompany);
    });
});
