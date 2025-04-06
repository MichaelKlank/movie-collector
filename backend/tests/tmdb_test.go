package tests

import (
	"fmt"
	"net/http"
	"net/http/httptest"
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

func TestNewClient(t *testing.T) {
	client := tmdb.NewClient()
	assert.NotNil(t, client)
	assert.Equal(t, "https://api.themoviedb.org/3", client.GetBaseURL())
}

func TestNewClientWithBaseURL(t *testing.T) {
	customURL := "https://custom.api.example.com"
	client := tmdb.NewClientWithBaseURL(customURL)
	assert.NotNil(t, client)
	assert.Equal(t, customURL, client.GetBaseURL())
}

func TestGetImageURL(t *testing.T) {
	client := tmdb.NewClient()
	tests := []struct {
		name     string
		path     string
		expected string
	}{
		{
			name:     "Leerer Pfad",
			path:     "",
			expected: "",
		},
		{
			name:     "HTTP URL",
			path:     "http://example.com/image.jpg",
			expected: "http://example.com/image.jpg",
		},
		{
			name:     "Relativer Pfad",
			path:     "/abc123.jpg",
			expected: "https://image.tmdb.org/t/p/w500/abc123.jpg",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := client.GetImageURL(tt.path)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestSearchMovies(t *testing.T) {
	os.Setenv("TMDB_API_KEY", "test-key")

	// Test mit Mock-Client
	client := &MockTMDBClient{}
	movies, err := client.SearchMovies("test")
	assert.NoError(t, err)
	assert.NotNil(t, movies)
	assert.Len(t, movies, 1)
	assert.Equal(t, "Test Movie", movies[0].Title)
	assert.Equal(t, "Test Overview", movies[0].Overview)

	// Test mit HTTP-Server
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, err := w.Write([]byte(`{
			"results": [
				{
					"id": 123,
					"title": "Test Movie",
					"overview": "A test movie",
					"release_date": "2024-01-01",
					"poster_path": "/test.jpg",
					"vote_average": 7.5
				}
			]
		}`))
		assert.NoError(t, err)
	}))
	defer server.Close()

	client2 := tmdb.NewClientWithBaseURL(server.URL)
	movies, err = client2.SearchMovies("test")
	assert.NoError(t, err)
	assert.Len(t, movies, 1)
	assert.Equal(t, 123, movies[0].ID)
}

func TestGetMovieDetails(t *testing.T) {
	os.Setenv("TMDB_API_KEY", "test-key")

	// Test mit Mock-Client
	client := &MockTMDBClient{}
	movie, err := client.GetMovieDetails(123)
	assert.NoError(t, err)
	assert.NotEmpty(t, movie.Title)
	assert.NotEmpty(t, movie.Overview)
	assert.Equal(t, "Test Movie Details", movie.Title)
	assert.Equal(t, "Test Movie Overview", movie.Overview)

	// Test mit HTTP-Server
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, err := w.Write([]byte(`{
			"id": 123,
			"title": "Test Movie",
			"overview": "A test movie",
			"release_date": "2024-01-01",
			"poster_path": "/test.jpg",
			"vote_average": 7.5
		}`))
		assert.NoError(t, err)
	}))
	defer server.Close()

	client2 := tmdb.NewClientWithBaseURL(server.URL)
	movie, err = client2.GetMovieDetails(123)
	assert.NoError(t, err)
	assert.NotNil(t, movie)
	assert.Equal(t, 123, movie.ID)
}

func TestCache(t *testing.T) {
	cache := tmdb.NewCache()
	cache.Set("test-key")
	assert.True(t, cache.Get("test-key"))
	cache.Delete("test-key")
	assert.False(t, cache.Get("test-key"))
}

func TestCacheConcurrency(t *testing.T) {
	cache := tmdb.NewCache()
	const numGoroutines = 100
	done := make(chan bool)

	// Parallel Schreiben
	for i := 0; i < numGoroutines; i++ {
		go func(index int) {
			key := fmt.Sprintf("key-%d", index)
			cache.Set(key)
			done <- true
		}(i)
	}

	// Warte auf alle Schreibvorgänge
	for i := 0; i < numGoroutines; i++ {
		<-done
	}

	// Überprüfe, ob alle Schlüssel geschrieben wurden
	for i := 0; i < numGoroutines; i++ {
		key := fmt.Sprintf("key-%d", i)
		assert.True(t, cache.Get(key), "Schlüssel %s wurde nicht im Cache gefunden", key)
	}
}

func TestSearchMoviesError(t *testing.T) {
	// Test für ungültige Server-Antwort
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer server.Close()

	client := tmdb.NewClientWithBaseURL(server.URL)
	movies, err := client.SearchMovies("test")
	assert.Error(t, err)
	assert.Nil(t, movies)

	// Test für ungültige JSON-Antwort
	server = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, err := w.Write([]byte(`{invalid json}`))
		assert.NoError(t, err)
	}))
	defer server.Close()

	client = tmdb.NewClientWithBaseURL(server.URL)
	movies, err = client.SearchMovies("test")
	assert.Error(t, err)
	assert.Nil(t, movies)
}

func TestGetMovieDetailsError(t *testing.T) {
	// Test für ungültige Server-Antwort
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
	}))
	defer server.Close()

	client := tmdb.NewClientWithBaseURL(server.URL)
	movie, err := client.GetMovieDetails(123)
	assert.Error(t, err)
	assert.Nil(t, movie)

	// Test für ungültige JSON-Antwort
	server = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, err := w.Write([]byte(`{invalid json}`))
		assert.NoError(t, err)
	}))
	defer server.Close()

	client = tmdb.NewClientWithBaseURL(server.URL)
	movie, err = client.GetMovieDetails(123)
	assert.Error(t, err)
	assert.Nil(t, movie)
}

func TestTestConnection(t *testing.T) {
	// Test für erfolgreiche Verbindung
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	client := tmdb.NewClientWithBaseURL(server.URL)
	err := client.TestConnection()
	assert.NoError(t, err)

	// Test für fehlgeschlagene Verbindung
	server = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
	}))
	defer server.Close()

	client = tmdb.NewClientWithBaseURL(server.URL)
	err = client.TestConnection()
	assert.Error(t, err)
}
