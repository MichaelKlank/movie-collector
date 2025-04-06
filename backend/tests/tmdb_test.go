package tests

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"sync"
	"testing"
	"time"

	"github.com/MichaelKlank/movie-collector/backend/tmdb"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
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

func setupTestServer(t *testing.T) (*httptest.Server, *tmdb.Client) {
	// Setup test environment variables
	os.Setenv("TMDB_API_KEY", "test-api-key")

	// Create test server
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Verify API key
		if r.URL.Query().Get("api_key") != "test-api-key" {
			http.Error(w, "Invalid API key", http.StatusUnauthorized)
			return
		}

		switch r.URL.Path {
		case "/search/movie":
			response := tmdb.Response{
				Results: []tmdb.Movie{
					{
						ID:          1,
						Title:       "Test Movie",
						PosterPath:  "/test.jpg",
						ReleaseDate: "2024-01-01",
						Overview:    "Test Overview",
					},
				},
			}
			if err := json.NewEncoder(w).Encode(response); err != nil {
				http.Error(w, "Failed to encode response", http.StatusInternalServerError)
				return
			}

		case "/movie/1":
			movie := tmdb.Movie{
				ID:          1,
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
			if err := json.NewEncoder(w).Encode(movie); err != nil {
				http.Error(w, "Failed to encode movie", http.StatusInternalServerError)
				return
			}

		case "/configuration":
			w.WriteHeader(http.StatusOK)

		default:
			http.Error(w, "Not found", http.StatusNotFound)
		}
	}))

	// Create client with test server URL
	client := tmdb.NewClientWithBaseURL(server.URL)

	return server, client
}

func TestTMDBClient(t *testing.T) {
	server, client := setupTestServer(t)
	defer server.Close()

	t.Run("NewClient", func(t *testing.T) {
		client := tmdb.NewClient()
		assert.NotNil(t, client)
		assert.Equal(t, "https://api.themoviedb.org/3", client.BaseURL())
	})

	t.Run("NewClientWithBaseURL", func(t *testing.T) {
		client := tmdb.NewClientWithBaseURL("http://test.com")
		assert.NotNil(t, client)
		assert.Equal(t, "http://test.com", client.BaseURL())
	})

	t.Run("SearchMovies", func(t *testing.T) {
		movies, err := client.SearchMovies("Test")
		require.NoError(t, err)
		assert.Len(t, movies, 1)
		assert.Equal(t, "Test Movie", movies[0].Title)
		assert.Equal(t, "/test.jpg", movies[0].PosterPath)
	})

	t.Run("SearchMovies with empty query", func(t *testing.T) {
		movies, err := client.SearchMovies("")
		require.NoError(t, err)
		assert.Empty(t, movies)
	})

	t.Run("SearchMovies with too long query", func(t *testing.T) {
		longQuery := string(make([]byte, 501))
		_, err := client.SearchMovies(longQuery)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "suchanfrage zu lang")
	})

	t.Run("GetMovieDetails", func(t *testing.T) {
		movie, err := client.GetMovieDetails(1)
		require.NoError(t, err)
		assert.Equal(t, "Test Movie", movie.Title)
		assert.Equal(t, "/test.jpg", movie.PosterPath)
		assert.Equal(t, "Test Overview", movie.Overview)
		assert.Len(t, movie.Credits.Cast, 1)
		assert.Equal(t, "Test Actor", movie.Credits.Cast[0].Name)
		assert.Len(t, movie.Credits.Crew, 1)
		assert.Equal(t, "Test Director", movie.Credits.Crew[0].Name)
		assert.Equal(t, "Director", movie.Credits.Crew[0].Job)
	})

	t.Run("GetMovieDetails with invalid ID", func(t *testing.T) {
		_, err := client.GetMovieDetails(0)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "ungültige Film-ID")
	})

	t.Run("GetMovieDetails with non-existent ID", func(t *testing.T) {
		_, err := client.GetMovieDetails(999)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "film nicht gefunden")
	})

	t.Run("TestConnection", func(t *testing.T) {
		err := client.TestConnection()
		assert.NoError(t, err)
	})

	t.Run("GetImageURL", func(t *testing.T) {
		// Test with empty path
		assert.Empty(t, client.GetImageURL(""))

		// Test with absolute URL
		assert.Equal(t, "https://example.com/image.jpg", client.GetImageURL("https://example.com/image.jpg"))

		// Test with relative path
		assert.Equal(t, "https://image.tmdb.org/t/p/w500/test.jpg", client.GetImageURL("/test.jpg"))
	})

	t.Run("Cache functionality", func(t *testing.T) {
		// First call should hit the server
		movie1, err := client.GetMovieDetails(1)
		require.NoError(t, err)

		// Second call should use cache
		movie2, err := client.GetMovieDetails(1)
		require.NoError(t, err)

		// Both should be the same object
		assert.Same(t, movie1, movie2)
	})

	t.Run("SearchMovies with invalid JSON response", func(t *testing.T) {
		// Erstelle einen neuen Server mit ungültiger JSON-Antwort
		invalidServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if _, err := w.Write([]byte("invalid json")); err != nil {
				t.Errorf("Failed to write response: %v", err)
			}
		}))
		defer invalidServer.Close()

		invalidClient := tmdb.NewClientWithBaseURL(invalidServer.URL)
		_, err := invalidClient.SearchMovies("test")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "fehler beim Decodieren")
	})

	t.Run("GetMovieDetails with invalid JSON response", func(t *testing.T) {
		// Erstelle einen neuen Server mit ungültiger JSON-Antwort
		invalidServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if _, err := w.Write([]byte("invalid json")); err != nil {
				t.Errorf("Failed to write response: %v", err)
			}
		}))
		defer invalidServer.Close()

		invalidClient := tmdb.NewClientWithBaseURL(invalidServer.URL)
		_, err := invalidClient.GetMovieDetails(1)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "fehler beim Decodieren")
	})

	t.Run("GetMovieDetails with server error", func(t *testing.T) {
		// Erstelle einen neuen Server, der einen 500er Fehler zurückgibt
		errorServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusInternalServerError)
		}))
		defer errorServer.Close()

		errorClient := tmdb.NewClientWithBaseURL(errorServer.URL)
		_, err := errorClient.GetMovieDetails(1)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "TMDB-API-Fehler: 500")
	})

	t.Run("Cache expiration", func(t *testing.T) {
		// Erstelle einen Client mit sehr kurzer Cache-Ablaufzeit
		shortCacheClient := tmdb.NewClientWithBaseURL(server.URL)
		shortCacheClient.CacheTTL = 1 * time.Second

		// Erste Anfrage
		movie1, err := shortCacheClient.GetMovieDetails(1)
		require.NoError(t, err)

		// Warte, bis der Cache abläuft
		time.Sleep(2 * time.Second)

		// Zweite Anfrage sollte den Server erneut kontaktieren
		movie2, err := shortCacheClient.GetMovieDetails(1)
		require.NoError(t, err)

		// Die Objekte sollten unterschiedlich sein
		assert.NotSame(t, movie1, movie2)
	})

	t.Run("GetImageURL with invalid path", func(t *testing.T) {
		// Test mit ungültigem Pfad (kein http und kein /)
		assert.Equal(t, "https://image.tmdb.org/t/p/w500abc", client.GetImageURL("abc"))
	})

	t.Run("TestConnection with invalid API key", func(t *testing.T) {
		// Erstelle einen Client ohne API-Key
		os.Unsetenv("TMDB_API_KEY")
		noKeyClient := tmdb.NewClientWithBaseURL(server.URL)

		err := noKeyClient.TestConnection()
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "TMDB-API-Fehler: 401")

		// Stelle den API-Key wieder her
		os.Setenv("TMDB_API_KEY", "test-api-key")
	})

	t.Run("Network error", func(t *testing.T) {
		// Erstelle einen Client mit einer nicht erreichbaren URL
		errorClient := tmdb.NewClientWithBaseURL("http://nicht-erreichbar.local")

		// Test SearchMovies
		_, err := errorClient.SearchMovies("test")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "fehler bei der TMDB-Suche")

		// Test GetMovieDetails
		_, err = errorClient.GetMovieDetails(1)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "fehler bei der TMDB-Anfrage")

		// Test TestConnection
		err = errorClient.TestConnection()
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "fehler bei der TMDB-Verbindung")
	})

	t.Run("Concurrent cache access", func(t *testing.T) {
		const goroutines = 10
		var wg sync.WaitGroup
		wg.Add(goroutines)

		for i := 0; i < goroutines; i++ {
			go func() {
				defer wg.Done()
				movie, err := client.GetMovieDetails(1)
				assert.NoError(t, err)
				assert.NotNil(t, movie)
			}()
		}

		wg.Wait()
	})

	t.Run("Rate limiting", func(t *testing.T) {
		// Erstelle einen Server mit Rate-Limiting
		var requestCount int
		var mu sync.Mutex
		rateLimitServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Prüfe API-Key
			if r.URL.Query().Get("api_key") != "test-api-key" {
				w.WriteHeader(http.StatusUnauthorized)
				return
			}

			mu.Lock()
			requestCount++
			currentCount := requestCount
			mu.Unlock()

			if currentCount > 5 {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusTooManyRequests)
				if err := json.NewEncoder(w).Encode(map[string]interface{}{
					"status_message": "Too many requests",
					"status_code":    429,
				}); err != nil {
					t.Errorf("Failed to encode response: %v", err)
				}
				return
			}

			// Normal response
			w.Header().Set("Content-Type", "application/json")
			movie := tmdb.Movie{
				ID:    1,
				Title: fmt.Sprintf("Test Movie %d", currentCount),
			}
			if err := json.NewEncoder(w).Encode(movie); err != nil {
				t.Errorf("Failed to encode movie: %v", err)
			}
		}))
		defer rateLimitServer.Close()

		// Setze API-Key
		os.Setenv("TMDB_API_KEY", "test-api-key")
		rateLimitClient := tmdb.NewClientWithBaseURL(rateLimitServer.URL)
		rateLimitClient.CacheTTL = 0 // Deaktiviere Cache für diesen Test

		// Erste 5 Anfragen sollten erfolgreich sein
		for i := 0; i < 5; i++ {
			movie, err := rateLimitClient.GetMovieDetails(1)
			require.NoError(t, err)
			require.NotNil(t, movie)
			require.Equal(t, fmt.Sprintf("Test Movie %d", i+1), movie.Title)
		}

		// 6. Anfrage sollte Rate-Limit-Fehler zurückgeben
		_, err := rateLimitClient.GetMovieDetails(1)
		require.Error(t, err)
		require.Contains(t, err.Error(), "TMDB-API-Fehler: 429")

		// Prüfe, dass wirklich 6 Anfragen gemacht wurden
		mu.Lock()
		require.Equal(t, 6, requestCount)
		mu.Unlock()
	})

	t.Run("Different HTTP methods", func(t *testing.T) {
		methodServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Prüfe API-Key
			if r.URL.Query().Get("api_key") != "test-api-key" {
				w.WriteHeader(http.StatusUnauthorized)
				return
			}

			// Nur GET-Anfragen erlauben
			if r.Method != http.MethodGet {
				w.WriteHeader(http.StatusMethodNotAllowed)
				return
			}

			// Normal response
			movie := tmdb.Movie{
				ID:    1,
				Title: "Test Movie",
			}
			if err := json.NewEncoder(w).Encode(movie); err != nil {
				t.Errorf("Failed to encode movie: %v", err)
			}
		}))
		defer methodServer.Close()

		// Setze API-Key
		os.Setenv("TMDB_API_KEY", "test-api-key")
		methodClient := tmdb.NewClientWithBaseURL(methodServer.URL)

		// GET sollte funktionieren
		movie, err := methodClient.GetMovieDetails(1)
		assert.NoError(t, err)
		assert.NotNil(t, movie)

		// POST-Anfrage simulieren (durch Manipulation des Clients)
		req, _ := http.NewRequest(http.MethodPost, fmt.Sprintf("%s/movie/1?api_key=test-api-key", methodServer.URL), nil)
		resp, err := methodClient.HTTPClient().Do(req)
		if err != nil {
			t.Fatal(err)
		}
		defer resp.Body.Close()
		assert.Equal(t, http.StatusMethodNotAllowed, resp.StatusCode)
	})

	// Test für ungültige JSON-Antwort
	invalidServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if err := json.NewEncoder(w).Encode(map[string]interface{}{
			"results": "invalid",
		}); err != nil {
			t.Errorf("Failed to encode response: %v", err)
		}
	}))
	defer invalidServer.Close()

	// Test für ungültige JSON-Antwort
	testMovie := tmdb.Movie{
		ID:          1,
		Title:       "Test Movie",
		PosterPath:  "/test.jpg",
		ReleaseDate: "2024-01-01",
		Overview:    "Test Overview",
	}
	invalidServer = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if err := json.NewEncoder(w).Encode(testMovie); err != nil {
			t.Errorf("Failed to encode movie: %v", err)
		}
	}))
	defer invalidServer.Close()

	// Test für ungültige JSON-Antwort
	invalidServer = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if err := json.NewEncoder(w).Encode(testMovie); err != nil {
			t.Errorf("Failed to encode movie: %v", err)
		}
	}))
	defer invalidServer.Close()

	// Test für ungültige JSON-Antwort
	invalidServer = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if err := json.NewEncoder(w).Encode(map[string]interface{}{
			"results": "invalid",
		}); err != nil {
			t.Errorf("Failed to encode response: %v", err)
		}
	}))
	defer invalidServer.Close()

	// Test für ungültige JSON-Antwort
	invalidServer = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if err := json.NewEncoder(w).Encode(testMovie); err != nil {
			t.Errorf("Failed to encode movie: %v", err)
		}
	}))
	defer invalidServer.Close()

	// Test für ungültige JSON-Antwort
	invalidServer = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if err := json.NewEncoder(w).Encode(map[string]interface{}{
			"results": "invalid",
		}); err != nil {
			t.Errorf("Failed to encode response: %v", err)
		}
	}))
	defer invalidServer.Close()

	// Test für ungültige JSON-Antwort
	invalidServer = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if err := json.NewEncoder(w).Encode(testMovie); err != nil {
			t.Errorf("Failed to encode movie: %v", err)
		}
	}))
	defer invalidServer.Close()
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
			if err := json.NewEncoder(w).Encode(map[string]string{
				"status_message": "Invalid API key",
				"status_code":    "401",
			}); err != nil {
				b.Errorf("Failed to encode error response: %v", err)
			}
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
	if err := json.NewEncoder(w).Encode(response); err != nil {
		http.Error(w, "Failed to encode search response", http.StatusInternalServerError)
	}
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
	if err := json.NewEncoder(w).Encode(response); err != nil {
		http.Error(w, "Failed to encode movie response", http.StatusInternalServerError)
	}
}

func handleErrorRequest(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusNotFound)
	if err := json.NewEncoder(w).Encode(map[string]string{
		"status_message": "The resource you requested could not be found.",
		"status_code":    "404",
	}); err != nil {
		http.Error(w, "Failed to encode error response", http.StatusInternalServerError)
	}
}

func handleConfigurationRequest(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(map[string]interface{}{
		"images": map[string]interface{}{
			"base_url": "https://image.tmdb.org/t/p/",
		},
	}); err != nil {
		http.Error(w, "Failed to encode configuration", http.StatusInternalServerError)
	}
}
