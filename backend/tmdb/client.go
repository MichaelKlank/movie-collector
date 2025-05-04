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

var defaultBaseURL = "https://api.themoviedb.org/3"

type Client struct {
	apiKey     string
	imageURL   string
	baseURL    string
	httpClient *http.Client
	cache      *Cache
	CacheTTL   time.Duration
}

type Cache struct {
	mutex sync.RWMutex
	items map[string]struct{}
}

func NewCache() *Cache {
	return &Cache{
		items: make(map[string]struct{}),
	}
}

func (c *Cache) Lock() {
	c.mutex.Lock()
}

func (c *Cache) Unlock() {
	c.mutex.Unlock()
}

func (c *Cache) RLock() {
	c.mutex.RLock()
}

func (c *Cache) RUnlock() {
	c.mutex.RUnlock()
}

func (c *Cache) Set(key string) {
	c.Lock()
	defer c.Unlock()
	c.items[key] = struct{}{}
}

func (c *Cache) Get(key string) bool {
	c.RLock()
	defer c.RUnlock()
	_, exists := c.items[key]
	return exists
}

func (c *Cache) Delete(key string) {
	c.Lock()
	defer c.Unlock()
	delete(c.items, key)
}

type Movie struct {
	ID          int     `json:"id"`
	Title       string  `json:"title"`
	Overview    string  `json:"overview"`
	ReleaseDate string  `json:"release_date"`
	PosterPath  string  `json:"poster_path"`
	VoteAverage float32 `json:"vote_average"`
}

type Response struct {
	Results []Movie `json:"results"`
}

func NewClient() *Client {
	return &Client{
		apiKey:     os.Getenv("TMDB_API_KEY"),
		imageURL:   "https://image.tmdb.org/t/p/w500",
		baseURL:    defaultBaseURL,
		httpClient: &http.Client{},
		cache:      NewCache(),
		CacheTTL:   24 * time.Hour,
	}
}

func NewClientWithBaseURL(baseURL string) *Client {
	return &Client{
		apiKey:     os.Getenv("TMDB_API_KEY"),
		imageURL:   "https://image.tmdb.org/t/p/w500",
		baseURL:    baseURL,
		httpClient: &http.Client{},
		cache:      NewCache(),
		CacheTTL:   24 * time.Hour,
	}
}

func (c *Client) SearchMovies(query string) ([]Movie, error) {
	escapedQuery := url.QueryEscape(query)
	url := fmt.Sprintf("%s/search/movie?api_key=%s&query=%s", c.baseURL, c.apiKey, escapedQuery)
	resp, err := c.httpClient.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var result Response
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	return result.Results, nil
}

func (c *Client) GetMovieDetails(id int) (*Movie, error) {
	url := fmt.Sprintf("%s/movie/%d?api_key=%s", c.baseURL, id, c.apiKey)
	resp, err := c.httpClient.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var movie Movie
	if err := json.NewDecoder(resp.Body).Decode(&movie); err != nil {
		return nil, err
	}

	return &movie, nil
}

func (c *Client) GetImageURL(path string) string {
	if path == "" {
		return ""
	}
	if len(path) >= 4 && path[:4] == "http" {
		return path
	}
	return c.imageURL + path
}

func (c *Client) TestConnection() error {
	url := fmt.Sprintf("%s/configuration?api_key=%s", c.baseURL, c.apiKey)
	resp, err := c.httpClient.Get(url)
	if err != nil {
		return fmt.Errorf("fehler bei der TMDB-Verbindung: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("TMDB-API-Fehler: %d", resp.StatusCode)
	}

	return nil
}

func (c *Client) GetBaseURL() string {
	return c.baseURL
}
