package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"sync"
	"time"
)

var baseURL = "https://api.themoviedb.org/3"

type TMDBClient struct {
	apiKey     string
	imageURL   string
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

	var movie TMDBMovie
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

func (c *TMDBClient) TestConnection() error {
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

func (c *TMDBClient) GetImageURL(path string) string {
	if path == "" {
		return ""
	}
	if path[:4] == "http" {
		return path
	}
	return c.imageURL + path
}

func searchTMDBMovies(query string) ([]TMDBMovie, error) {
	apiKey := os.Getenv("TMDB_API_KEY")
	if apiKey == "" {
		return nil, fmt.Errorf("TMDB_API_KEY not set")
	}

	// URL-Encode die Suchanfrage
	encodedQuery := url.QueryEscape(query)
	url := fmt.Sprintf("%s/search/movie?api_key=%s&query=%s&language=de-DE&include_adult=false", baseURL, apiKey, encodedQuery)
	fmt.Printf("TMDB API URL: %s\n", url)
	
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("error creating request: %v", err)
	}

	req.Header.Add("accept", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("error making request: %v", err)
	}
	defer resp.Body.Close()

	// Lese den gesamten Response-Body für bessere Fehlerdiagnose
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("error reading response body: %v", err)
	}

	if resp.StatusCode != http.StatusOK {
		fmt.Printf("TMDB API Error Response: %s\n", string(body))
		return nil, fmt.Errorf("TMDB API returned status code %d: %s", resp.StatusCode, string(body))
	}

	fmt.Printf("TMDB API Response: %s\n", string(body))

	var searchResp TMDBResponse
	if err := json.Unmarshal(body, &searchResp); err != nil {
		return nil, fmt.Errorf("error decoding response: %v", err)
	}

	// Hole für jeden Film die Credits
	for i := range searchResp.Results {
		creditsURL := fmt.Sprintf("%s/movie/%d/credits?api_key=%s&language=de-DE", baseURL, searchResp.Results[i].ID, apiKey)
		creditsReq, err := http.NewRequest("GET", creditsURL, nil)
		if err != nil {
			fmt.Printf("Error creating credits request for movie %d: %v\n", searchResp.Results[i].ID, err)
			continue
		}

		creditsReq.Header.Add("accept", "application/json")

		creditsResp, err := client.Do(creditsReq)
		if err != nil {
			fmt.Printf("Error getting credits for movie %d: %v\n", searchResp.Results[i].ID, err)
			continue
		}

		var credits struct {
			Cast []struct {
				Name string `json:"name"`
			} `json:"cast"`
			Crew []struct {
				Name string `json:"name"`
				Job  string `json:"job"`
			} `json:"crew"`
		}

		if err := json.NewDecoder(creditsResp.Body).Decode(&credits); err != nil {
			fmt.Printf("Error decoding credits for movie %d: %v\n", searchResp.Results[i].ID, err)
			creditsResp.Body.Close()
			continue
		}

		searchResp.Results[i].Credits = credits
		creditsResp.Body.Close()
	}

	// Debug-Ausgabe der gefundenen Filme
	for _, movie := range searchResp.Results {
		fmt.Printf("Movie: %s, Overview: %s\n", movie.Title, movie.Overview)
	}

	return searchResp.Results, nil
} 