package tmdb

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"sync"
	"time"
)

var baseURL = "https://api.themoviedb.org/3"

type Client struct {
	apiKey     string
	imageURL   string
	httpClient *http.Client
	cache      *Cache
}

type Cache struct {
	sync.RWMutex
	movies map[int]*CacheEntry
}

type CacheEntry struct {
	movie      *Movie
	expiration time.Time
}

type Movie struct {
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

type Response struct {
	Results []Movie `json:"results"`
}

func NewClient() *Client {
	apiKey := os.Getenv("TMDB_API_KEY")
	if apiKey == "" {
		panic("TMDB_API_KEY environment variable is not set")
	}
	return &Client{
		apiKey:     apiKey,
		imageURL:   "https://image.tmdb.org/t/p/w500",
		httpClient: &http.Client{},
		cache:      &Cache{movies: make(map[int]*CacheEntry)},
	}
}

func (c *Client) SearchMovies(query string) ([]Movie, error) {
	if query == "" {
		return []Movie{}, nil
	}

	if len(query) > 500 {
		return nil, fmt.Errorf("suchanfrage zu lang")
	}

	searchURL := fmt.Sprintf("%s/search/movie?api_key=%s&query=%s&language=de-DE&include_adult=false", baseURL, c.apiKey, url.QueryEscape(query))
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

	var tmdbResp Response
	if err := json.NewDecoder(resp.Body).Decode(&tmdbResp); err != nil {
		return nil, fmt.Errorf("fehler beim Decodieren der TMDB-Antwort: %v", err)
	}

	return tmdbResp.Results, nil
}

func (c *Client) GetMovieDetails(id int) (*Movie, error) {
	if id <= 0 {
		return nil, fmt.Errorf("ungültige Film-ID")
	}

	// Prüfe Cache
	c.cache.RLock()
	if entry, ok := c.cache.movies[id]; ok && time.Now().Before(entry.expiration) {
		c.cache.RUnlock()
		return entry.movie, nil
	}
	c.cache.RUnlock()

	detailsURL := fmt.Sprintf("%s/movie/%d?api_key=%s&language=de-DE", baseURL, id, c.apiKey)
	req, err := http.NewRequest("GET", detailsURL, nil)
	if err != nil {
		return nil, fmt.Errorf("fehler beim Erstellen der Anfrage: %v", err)
	}

	req.Header.Add("accept", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("fehler beim Abrufen der Filmdetails: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return nil, fmt.Errorf("film nicht gefunden")
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("TMDB-API-Fehler: %d", resp.StatusCode)
	}

	var movie Movie
	if err := json.NewDecoder(resp.Body).Decode(&movie); err != nil {
		return nil, fmt.Errorf("fehler beim Decodieren der Filmdetails: %v", err)
	}

	// Speichere im Cache
	c.cache.Lock()
	c.cache.movies[id] = &CacheEntry{
		movie:      &movie,
		expiration: time.Now().Add(1 * time.Hour),
	}
	c.cache.Unlock()

	return &movie, nil
}

func (c *Client) TestConnection() error {
	testURL := fmt.Sprintf("%s/configuration?api_key=%s", baseURL, c.apiKey)
	req, err := http.NewRequest("GET", testURL, nil)
	if err != nil {
		return fmt.Errorf("fehler beim Erstellen der Anfrage: %v", err)
	}

	req.Header.Add("accept", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		if os.IsTimeout(err) {
			return fmt.Errorf("timeout bei der TMDB-Verbindung: %v", err)
		}
		return fmt.Errorf("fehler bei der TMDB-Verbindung: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("TMDB-API-Fehler: %d", resp.StatusCode)
	}

	// Validiere JSON-Antwort
	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return fmt.Errorf("ungültige JSON-Antwort: %v", err)
	}

	return nil
}

func (c *Client) GetImageURL(path string) string {
	if path == "" {
		return ""
	}
	if path[:4] == "http" {
		return path
	}
	return c.imageURL + path
} 