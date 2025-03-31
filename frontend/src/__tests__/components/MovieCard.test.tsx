import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MovieCard } from "../../components/MovieCard";

const mockMovie = {
    id: 1,
    title: "Test Movie",
    description: "Test Description",
    year: 2024,
    poster_path: "/test-poster.jpg",
    image_path: "/test-backdrop.jpg",
    rating: 8.5,
    tmdb_id: "123",
    release_date: "2024-01-01",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
};

describe("MovieCard", () => {
    it("renders with all essential elements", () => {
        render(<MovieCard movie={mockMovie} onClick={() => {}} />);

        expect(screen.getByText("Test Movie")).toBeInTheDocument();
        expect(screen.getByText("Test Description")).toBeInTheDocument();
        expect(screen.getByText("2024")).toBeInTheDocument();
        expect(screen.getByRole("img")).toHaveAttribute("src", expect.stringContaining("/test-poster.jpg"));
    });

    it("uses correct TMDB image path for poster", () => {
        render(<MovieCard movie={mockMovie} onClick={() => {}} />);

        const img = screen.getByRole("img");
        expect(img).toHaveAttribute("src", expect.stringContaining("https://image.tmdb.org/t/p/w500/test-poster.jpg"));
    });

    it("shows placeholder image when no poster is available", () => {
        const movieWithoutPoster = { ...mockMovie, poster_path: undefined, image_path: undefined };
        render(<MovieCard movie={movieWithoutPoster} onClick={() => {}} />);

        const img = screen.getByRole("img");
        expect(img).toHaveAttribute("src", "/placeholder.png");
    });

    it("calls onClick with correct movie when clicked", () => {
        const onClick = vi.fn();
        render(<MovieCard movie={mockMovie} onClick={onClick} />);

        fireEvent.click(screen.getByRole("article"));

        expect(onClick).toHaveBeenCalledWith(mockMovie);
    });
});
