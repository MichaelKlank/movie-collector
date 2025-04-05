package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"sync"
	"time"
)

var defaultBaseURL = "https://api.themoviedb.org/3"

type TMDBClient struct {
	apiKey     string
	imageURL   string
	baseURL    string
	httpClient *http.Client
	cache      *TMDBCache
}

type TMDBCache struct {
	sync.RWMutex
	movies map[int]*CacheEntry
}

type CacheEntry struct {
	movie      *TMDBMovie
	expiration time.Time
}

type TMDBMovie struct {
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

type TMDBResponse struct {
	Results []TMDBMovie `json:"results"`
}

func NewTMDBClient() *TMDBClient {
	return &TMDBClient{
		apiKey:     os.Getenv("TMDB_API_KEY"),
		imageURL:   "https://image.tmdb.org/t/p/w500",
		baseURL:    defaultBaseURL,
		httpClient: &http.Client{},
		cache:      &TMDBCache{movies: make(map[int]*CacheEntry)},
	}
}

// NewTMDBClientWithBaseURL erstellt einen neuen TMDB-Client mit einer benutzerdefinierten Base-URL
func NewTMDBClientWithBaseURL(baseURL string) *TMDBClient {
	return &TMDBClient{
		apiKey:     os.Getenv("TMDB_API_KEY"),
		imageURL:   "https://image.tmdb.org/t/p/w500",
		baseURL:    baseURL,
		httpClient: &http.Client{},
		cache:      &TMDBCache{movies: make(map[int]*CacheEntry)},
	}
}

func (c *TMDBClient) SearchMovies(query string) ([]TMDBMovie, error) {
	if query == "" {
		return []TMDBMovie{}, nil
	}

	if len(query) > 500 {
		return nil, fmt.Errorf("suchanfrage zu lang")
	}

	searchURL := fmt.Sprintf("%s/search/movie?api_key=%s&query=%s&language=de-DE&include_adult=false", c.baseURL, c.apiKey, url.QueryEscape(query))
	req, err := http.NewRequest("GET", searchURL, nil)
	if err != nil {
		return nil, fmt.Errorf("fehler beim Erstellen der Anfrage: %v", err)
	}

	req.Header.Add("accept", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("fehler bei der TMDB-Suche: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("TMDB-API-Fehler: %d", resp.StatusCode)
	}

	var tmdbResp TMDBResponse
	if err := json.NewDecoder(resp.Body).Decode(&tmdbResp); err != nil {
		return nil, fmt.Errorf("fehler beim Decodieren der TMDB-Antwort: %v", err)
	}

	return tmdbResp.Results, nil
}

func (c *TMDBClient) GetMovieDetails(id int) (*TMDBMovie, error) {
	if id <= 0 {
		return nil, fmt.Errorf("ungültige Film-ID")
	}

	// Prüfe Cache
	c.cache.RLock()
	if entry, exists := c.cache.movies[id]; exists && time.Now().Before(entry.expiration) {
		c.cache.RUnlock()
		return entry.movie, nil
	}
	c.cache.RUnlock()

	movieURL := fmt.Sprintf("%s/movie/%d?api_key=%s&language=de-DE&append_to_response=credits", c.baseURL, id, c.apiKey)
	req, err := http.NewRequest("GET", movieURL, nil)
	if err != nil {
		return nil, fmt.Errorf("fehler beim Erstellen der Anfrage: %v", err)
	}

	req.Header.Add("accept", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("fehler bei der TMDB-Anfrage: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return nil, fmt.Errorf("film nicht gefunden")
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("TMDB-API-Fehler: %d", resp.StatusCode)
	}

	var movie TMDBMovie
	if err := json.NewDecoder(resp.Body).Decode(&movie); err != nil {
		return nil, fmt.Errorf("fehler beim Decodieren der TMDB-Antwort: %v", err)
	}

	// Speichere im Cache
	c.cache.Lock()
	c.cache.movies[id] = &CacheEntry{
		movie:      &movie,
		expiration: time.Now().Add(24 * time.Hour),
	}
	c.cache.Unlock()

	return &movie, nil
}

func (c *TMDBClient) TestConnection() error {
	testURL := fmt.Sprintf("%s/configuration?api_key=%s", c.baseURL, c.apiKey)
	req, err := http.NewRequest("GET", testURL, nil)
	if err != nil {
		return fmt.Errorf("fehler beim Erstellen der Anfrage: %v", err)
	}

	req.Header.Add("accept", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("fehler bei der TMDB-Verbindung: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("TMDB-API-Fehler: %d", resp.StatusCode)
	}

	return nil
}

func (c *TMDBClient) GetImageURL(path string) string {
	if path == "" {
		return ""
	}
	return c.imageURL + path
} 