package tests

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/klank-cnv/go-test/backend/tmdb"
	"github.com/stretchr/testify/assert"
)

// MockTMDBResponse repräsentiert eine typische TMDB-Antwort
type MockTMDBResponse struct {
	Results []struct {
		ID          int    `json:"id"`
		Title       string `json:"title"`
		PosterPath  string `json:"poster_path"`
		ReleaseDate string `json:"release_date"`
		Overview    string `json:"overview"`
		Credits     struct {
			Cast []struct {
				Name string `json:"name"`
			} `json:"cast"`
			Crew []struct {
				Name string `json:"name"`
				Job  string `json:"job"`
			} `json:"crew"`
		} `json:"credits"`
	} `json:"results"`
}

// MockTMDBMovie repräsentiert einen einzelnen Film von TMDB
type MockTMDBMovie struct {
	ID          int    `json:"id"`
	Title       string `json:"title"`
	PosterPath  string `json:"poster_path"`
	ReleaseDate string `json:"release_date"`
	Overview    string `json:"overview"`
	Credits     struct {
		Cast []struct {
			Name string `json:"name"`
		} `json:"cast"`
		Crew []struct {
			Name string `json:"name"`
			Job  string `json:"job"`
		} `json:"crew"`
	} `json:"credits"`
}

func TestTMDB(t *testing.T) {
	// Speichere den aktuellen API-Key
	currentAPIKey := os.Getenv("TMDB_API_KEY")
	// Setze einen Test-API-Key
	os.Setenv("TMDB_API_KEY", "test-api-key")
	// Stelle den API-Key am Ende wieder her
	defer os.Setenv("TMDB_API_KEY", currentAPIKey)

	// Mock-Server für TMDB-API
	mockServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Simuliere eine realistische Netzwerklatenz
		time.Sleep(10 * time.Millisecond)

		// Prüfe API-Key
		apiKey := r.URL.Query().Get("api_key")
		if apiKey != "test-api-key" {
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{
				"status_message": "Invalid API key",
				"status_code":    "401",
			})
			return
		}

		switch r.URL.Path {
		case "/search/movie":
			handleSearchRequest(w, r)
		case "/movie/123":
			handleMovieRequest(w, r)
		case "/movie/999":
			handleErrorRequest(w, r)
		case "/configuration":
			handleConfigurationRequest(w, r)
		default:
			w.WriteHeader(http.StatusNotFound)
		}
	}))
	defer mockServer.Close()

	// Erstelle einen TMDB-Client mit der Mock-Server-URL
	tmdbClient := tmdb.NewClientWithBaseURL(mockServer.URL)

	t.Run("Test TMDB Configuration", func(t *testing.T) {
		// Lösche den API-Key temporär
		os.Unsetenv("TMDB_API_KEY")
		// Erstelle einen neuen Client ohne API-Key
		clientWithoutKey := tmdb.NewClientWithBaseURL(mockServer.URL)
		err := clientWithoutKey.TestConnection()
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "TMDB-API-Fehler: 401")
		// Stelle den Test-API-Key wieder her
		os.Setenv("TMDB_API_KEY", "test-api-key")
	})

	t.Run("Test TMDB Search Success", func(t *testing.T) {
		movies, err := tmdbClient.SearchMovies("test")
		assert.NoError(t, err)
		assert.Greater(t, len(movies), 0)
		assert.Equal(t, "Test Movie", movies[0].Title)
	})

	t.Run("Test TMDB Search Missing Query", func(t *testing.T) {
		movies, err := tmdbClient.SearchMovies("")
		assert.NoError(t, err)
		assert.Empty(t, movies)
	})

	t.Run("Test TMDB Search Empty Query", func(t *testing.T) {
		movies, err := tmdbClient.SearchMovies("")
		assert.NoError(t, err)
		assert.Empty(t, movies)
	})

	t.Run("Test TMDB Movie Success", func(t *testing.T) {
		movie, err := tmdbClient.GetMovieDetails(123)
		assert.NoError(t, err)
		assert.Equal(t, 123, movie.ID)
		assert.Equal(t, "Test Movie", movie.Title)
	})

	t.Run("Test TMDB Movie Not Found", func(t *testing.T) {
		movie, err := tmdbClient.GetMovieDetails(999)
		assert.Error(t, err)
		assert.Nil(t, movie)
		assert.Contains(t, err.Error(), "film nicht gefunden")
	})

	t.Run("Test TMDB Movie Invalid ID", func(t *testing.T) {
		movie, err := tmdbClient.GetMovieDetails(0)
		assert.Error(t, err)
		assert.Nil(t, movie)
		assert.Contains(t, err.Error(), "ungültige Film-ID")
	})
}

func handleSearchRequest(w http.ResponseWriter, r *http.Request) {
	response := MockTMDBResponse{
		Results: []struct {
			ID          int    `json:"id"`
			Title       string `json:"title"`
			PosterPath  string `json:"poster_path"`
			ReleaseDate string `json:"release_date"`
			Overview    string `json:"overview"`
			Credits     struct {
				Cast []struct {
					Name string `json:"name"`
				} `json:"cast"`
				Crew []struct {
					Name string `json:"name"`
					Job  string `json:"job"`
				} `json:"crew"`
			} `json:"credits"`
		}{
			{
				ID:          123,
				Title:       "Test Movie",
				PosterPath:  "/test.jpg",
				ReleaseDate: "2024-01-01",
				Overview:    "Test Overview",
				Credits: struct {
					Cast []struct {
						Name string `json:"name"`
					} `json:"cast"`
					Crew []struct {
						Name string `json:"name"`
						Job  string `json:"job"`
					} `json:"crew"`
				}{
					Cast: []struct {
						Name string `json:"name"`
					}{
						{Name: "Test Actor"},
					},
					Crew: []struct {
						Name string `json:"name"`
						Job  string `json:"job"`
					}{
						{Name: "Test Director", Job: "Director"},
					},
				},
			},
		},
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func handleMovieRequest(w http.ResponseWriter, r *http.Request) {
	response := MockTMDBMovie{
		ID:          123,
		Title:       "Test Movie",
		PosterPath:  "/test.jpg",
		ReleaseDate: "2024-01-01",
		Overview:    "Test Overview",
		Credits: struct {
			Cast []struct {
				Name string `json:"name"`
			} `json:"cast"`
			Crew []struct {
				Name string `json:"name"`
				Job  string `json:"job"`
			} `json:"crew"`
		}{
			Cast: []struct {
				Name string `json:"name"`
			}{
				{Name: "Test Actor"},
			},
			Crew: []struct {
				Name string `json:"name"`
				Job  string `json:"job"`
			}{
				{Name: "Test Director", Job: "Director"},
			},
		},
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func handleErrorRequest(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusNotFound)
	json.NewEncoder(w).Encode(map[string]string{
		"status_message": "The resource you requested could not be found.",
		"status_code":    "404",
	})
}

func handleConfigurationRequest(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"images": map[string]interface{}{
			"base_url": "https://image.tmdb.org/t/p/",
		},
	})
}

func BenchmarkTMDB(b *testing.B) {
	// Speichere den aktuellen API-Key
	currentAPIKey := os.Getenv("TMDB_API_KEY")
	// Setze einen Test-API-Key
	os.Setenv("TMDB_API_KEY", "test-api-key")
	// Stelle den API-Key am Ende wieder her
	defer os.Setenv("TMDB_API_KEY", currentAPIKey)

	// Mock-Server für TMDB-API
	mockServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Simuliere eine realistische Netzwerklatenz
		time.Sleep(50 * time.Millisecond)

		// Prüfe API-Key
		apiKey := r.URL.Query().Get("api_key")
		if apiKey != "test-api-key" {
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{
				"status_message": "Invalid API key",
				"status_code":    "401",
			})
			return
		}

		switch r.URL.Path {
		case "/search/movie":
			handleSearchRequest(w, r)
		case "/movie/123":
			handleMovieRequest(w, r)
		case "/movie/999":
			handleErrorRequest(w, r)
		case "/configuration":
			handleConfigurationRequest(w, r)
		default:
			w.WriteHeader(http.StatusNotFound)
		}
	}))
	defer mockServer.Close()

	// Erstelle einen TMDB-Client mit der Mock-Server-URL
	tmdbClient := tmdb.NewClientWithBaseURL(mockServer.URL)

	b.Run("Benchmark TMDB Search", func(b *testing.B) {
		b.ResetTimer()
		for i := 0; i < b.N; i++ {
			movies, err := tmdbClient.SearchMovies("test")
			if err != nil {
				b.Fatal(err)
			}
			if len(movies) == 0 {
				b.Fatal("keine Filme gefunden")
			}
		}
	})

	b.Run("Benchmark TMDB Movie Details", func(b *testing.B) {
		b.ResetTimer()
		for i := 0; i < b.N; i++ {
			movie, err := tmdbClient.GetMovieDetails(123)
			if err != nil {
				b.Fatal(err)
			}
			if movie == nil {
				b.Fatal("kein Film gefunden")
			}
		}
	})

	b.Run("Benchmark TMDB Cache", func(b *testing.B) {
		// Erste Anfrage, um den Cache zu füllen
		_, err := tmdbClient.GetMovieDetails(123)
		if err != nil {
			b.Fatal(err)
		}

		b.ResetTimer()
		for i := 0; i < b.N; i++ {
			movie, err := tmdbClient.GetMovieDetails(123)
			if err != nil {
				b.Fatal(err)
			}
			if movie == nil {
				b.Fatal("kein Film gefunden")
			}
		}
	})
}
