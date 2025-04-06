package tests

import (
	"testing"
	"time"

	"github.com/MichaelKlank/movie-collector/backend/models"
	"github.com/stretchr/testify/assert"
)

func TestMovieValidation(t *testing.T) {
	tests := []struct {
		name    string
		movie   models.Movie
		wantErr bool
	}{
		{
			name: "Valid Movie",
			movie: models.Movie{
				Title:       "Test Movie",
				Year:        2024,
				Description: "Test Description",
			},
			wantErr: false,
		},
		{
			name: "Missing Title",
			movie: models.Movie{
				Year:        2024,
				Description: "Test Description",
			},
			wantErr: true,
		},
		{
			name: "Missing Year",
			movie: models.Movie{
				Title:       "Test Movie",
				Description: "Test Description",
			},
			wantErr: true,
		},
		{
			name: "Invalid Year - Too Early",
			movie: models.Movie{
				Title:       "Test Movie",
				Year:        1800,
				Description: "Test Description",
			},
			wantErr: true,
		},
		{
			name: "Invalid Year - Future Year",
			movie: models.Movie{
				Title:       "Test Movie",
				Year:        2100,
				Description: "Test Description",
			},
			wantErr: true,
		},
		{
			name: "Valid Movie with Optional Fields",
			movie: models.Movie{
				Title:       "Test Movie",
				Year:        2024,
				Description: "Test Description",
				ImagePath:   "/test.jpg",
				PosterPath:  "/test-poster.jpg",
				TMDBId:      "123",
				Overview:    "Test Overview",
				ReleaseDate: "2024-01-01",
				Rating:      8.5,
			},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateMovie(tt.movie)
			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestMovieTimeFields(t *testing.T) {
	now := time.Now()
	movie := models.Movie{
		Title:     "Test Movie",
		Year:      2024,
		CreatedAt: now,
		UpdatedAt: now,
	}

	assert.Equal(t, now, movie.CreatedAt)
	assert.Equal(t, now, movie.UpdatedAt)
}

func TestMovieOptionalFields(t *testing.T) {
	movie := models.Movie{
		Title:       "Test Movie",
		Year:        2024,
		Description: "Test Description",
		ImagePath:   "/test.jpg",
		PosterPath:  "/test-poster.jpg",
		TMDBId:      "123",
		Overview:    "Test Overview",
		ReleaseDate: "2024-01-01",
		Rating:      8.5,
	}

	assert.Equal(t, "Test Description", movie.Description)
	assert.Equal(t, "/test.jpg", movie.ImagePath)
	assert.Equal(t, "/test-poster.jpg", movie.PosterPath)
	assert.Equal(t, "123", movie.TMDBId)
	assert.Equal(t, "Test Overview", movie.Overview)
	assert.Equal(t, "2024-01-01", movie.ReleaseDate)
	assert.Equal(t, float32(8.5), movie.Rating)
}

// Hilfsfunktion zur Validierung eines Movies
func validateMovie(movie models.Movie) error {
	if movie.Title == "" {
		return assert.AnError
	}
	if movie.Year <= 0 || movie.Year < 1888 || movie.Year > time.Now().Year()+1 {
		return assert.AnError
	}
	return nil
}
