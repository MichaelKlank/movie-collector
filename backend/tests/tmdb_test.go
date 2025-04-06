package tests

import (
	"os"
	"testing"

	"github.com/MichaelKlank/movie-collector/backend/tmdb"
	"github.com/stretchr/testify/assert"
)

type MockTMDBClient struct {
	tmdb.Client
}

func (m *MockTMDBClient) SearchMovies(query string) ([]tmdb.Movie, error) {
	return []tmdb.Movie{
		{
			ID:          123,
			Title:       "Test Movie",
			Overview:    "Test Overview",
			PosterPath:  "/test-poster.jpg",
			ReleaseDate: "2024-01-01",
		},
	}, nil
}

func (m *MockTMDBClient) GetMovieDetails(id int) (*tmdb.Movie, error) {
	return &tmdb.Movie{
		ID:          id,
		Title:       "Test Movie Details",
		Overview:    "Test Movie Overview",
		PosterPath:  "/test-poster.jpg",
		ReleaseDate: "2024-01-01",
	}, nil
}

func TestSearchMovies(t *testing.T) {
	os.Setenv("TMDB_API_KEY", "test-key")
	client := &MockTMDBClient{}

	movies, err := client.SearchMovies("test")
	assert.NoError(t, err)
	assert.NotNil(t, movies)
	assert.Len(t, movies, 1)
	assert.Equal(t, "Test Movie", movies[0].Title)
	assert.Equal(t, "Test Overview", movies[0].Overview)
}

func TestGetMovieDetails(t *testing.T) {
	os.Setenv("TMDB_API_KEY", "test-key")
	client := &MockTMDBClient{}

	movie, err := client.GetMovieDetails(123)
	assert.NoError(t, err)
	assert.NotEmpty(t, movie.Title)
	assert.NotEmpty(t, movie.Overview)
	assert.Equal(t, "Test Movie Details", movie.Title)
	assert.Equal(t, "Test Movie Overview", movie.Overview)
}
