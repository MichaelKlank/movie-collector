package tests

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"

	"github.com/MichaelKlank/movie-collector/backend/models"
	"github.com/MichaelKlank/movie-collector/backend/testutil"
	"github.com/stretchr/testify/assert"
)

func TestMovieCRUD(t *testing.T) {
	db := testutil.SetupTestDB(t)
	router := testutil.SetupRouter(db)

	t.Run("Create Movie", func(t *testing.T) {
		movie := models.Movie{
			Title:       "Test Movie",
			Description: "Test Description",
			Year:        2024,
		}
		jsonData, _ := json.Marshal(movie)
		req := httptest.NewRequest("POST", "/movies", bytes.NewBuffer(jsonData))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusCreated, w.Code)

		var response models.Movie
		err := json.Unmarshal(w.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.Equal(t, movie.Title, response.Title)
		assert.Equal(t, movie.Description, response.Description)
		assert.Equal(t, movie.Year, response.Year)
	})

	t.Run("Get Movies", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/movies", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var response map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		assert.NoError(t, err)

		// Prüfe, ob die Antwort die erwartete Struktur hat
		assert.Contains(t, response, "data")
		assert.Contains(t, response, "meta")

		// Prüfe, ob Daten vorhanden sind
		data, ok := response["data"].([]interface{})
		assert.True(t, ok)
		assert.Greater(t, len(data), 0)

		// Prüfe Metadaten
		meta, ok := response["meta"].(map[string]interface{})
		assert.True(t, ok)
		assert.Contains(t, meta, "page")
		assert.Contains(t, meta, "limit")
		assert.Contains(t, meta, "total")
		assert.Contains(t, meta, "total_pages")
	})

	t.Run("Get Movie", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/movies/1", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var movie models.Movie
		err := json.Unmarshal(w.Body.Bytes(), &movie)
		assert.NoError(t, err)
		assert.Equal(t, uint(1), movie.ID)
	})

	t.Run("Prevent Duplicate TMDB ID", func(t *testing.T) {
		// Ersten Film erstellen
		firstMovie := models.Movie{
			Title:       "Test Movie 1",
			Description: "Test Description 1",
			Year:        2024,
			TMDBId:      "12345",
		}
		jsonData, _ := json.Marshal(firstMovie)
		req := httptest.NewRequest("POST", "/movies", bytes.NewBuffer(jsonData))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusCreated, w.Code)

		// Versuch, einen zweiten Film mit der gleichen TMDB-ID zu erstellen
		secondMovie := models.Movie{
			Title:       "Test Movie 2",
			Description: "Test Description 2",
			Year:        2024,
			TMDBId:      "12345",
		}
		jsonData, _ = json.Marshal(secondMovie)
		req = httptest.NewRequest("POST", "/movies", bytes.NewBuffer(jsonData))
		req.Header.Set("Content-Type", "application/json")
		w = httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusConflict, w.Code)

		var response map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.Equal(t, "Ein Film mit dieser TMDB-ID existiert bereits", response["error"])
		assert.NotNil(t, response["movie"])
	})

	t.Run("Update Movie", func(t *testing.T) {
		movie := models.Movie{
			Title:       "Updated Movie",
			Description: "Updated Description",
			Year:        2025,
		}
		jsonData, _ := json.Marshal(movie)
		req := httptest.NewRequest("PUT", "/movies/1", bytes.NewBuffer(jsonData))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var response models.Movie
		err := json.Unmarshal(w.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.Equal(t, movie.Title, response.Title)
		assert.Equal(t, movie.Description, response.Description)
		assert.Equal(t, movie.Year, response.Year)

		// Stellen sicher, dass der Cache nach dem Update ungültig ist
		// und die aktualisierten Daten zurückgegeben werden
		req = httptest.NewRequest("GET", "/movies/1", nil)
		w = httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var updatedMovie models.Movie
		err = json.Unmarshal(w.Body.Bytes(), &updatedMovie)
		assert.NoError(t, err)
		assert.Equal(t, movie.Title, updatedMovie.Title)
		assert.Equal(t, movie.Description, updatedMovie.Description)
	})

	t.Run("Cache-Control Headers Test", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/movies", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		// Prüfe, ob die Cache-Control Header korrekt gesetzt sind
		cacheControl := w.Header().Get("Cache-Control")
		pragma := w.Header().Get("Pragma")
		expires := w.Header().Get("Expires")

		assert.Contains(t, cacheControl, "no-store")
		assert.Contains(t, cacheControl, "no-cache")
		assert.Contains(t, cacheControl, "must-revalidate")
		assert.Equal(t, "no-cache", pragma)
		assert.Equal(t, "0", expires)
	})

	t.Run("Delete Movie", func(t *testing.T) {
		// Erstelle einen neuen Film für den Löschtest
		movie := models.Movie{
			Title:       "Movie to Delete",
			Description: "This movie will be deleted",
			Year:        2024,
		}
		jsonData, _ := json.Marshal(movie)
		req := httptest.NewRequest("POST", "/movies", bytes.NewBuffer(jsonData))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusCreated, w.Code)

		var createdMovie models.Movie
		err := json.Unmarshal(w.Body.Bytes(), &createdMovie)
		assert.NoError(t, err)

		// Lösche den Film
		req = httptest.NewRequest("DELETE", "/movies/"+strconv.Itoa(int(createdMovie.ID)), nil)
		w = httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		// Verifiziere, dass der Film gelöscht wurde und nach dem Löschen nicht mehr im Cache ist
		req = httptest.NewRequest("GET", "/movies/"+strconv.Itoa(int(createdMovie.ID)), nil)
		w = httptest.NewRecorder()
		router.ServeHTTP(w, req)
		assert.Equal(t, http.StatusNotFound, w.Code)

		// Prüfe auch die Filmliste, um sicherzustellen, dass der Film dort nicht mehr erscheint
		req = httptest.NewRequest("GET", "/movies", nil)
		w = httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var listResponse map[string]interface{}
		err = json.Unmarshal(w.Body.Bytes(), &listResponse)
		assert.NoError(t, err)

		// Prüfe, ob der gelöschte Film in der Liste fehlt
		data, ok := listResponse["data"].([]interface{})
		assert.True(t, ok)

		for _, item := range data {
			movieData, ok := item.(map[string]interface{})
			assert.True(t, ok)

			if id, ok := movieData["id"].(float64); ok {
				assert.NotEqual(t, float64(createdMovie.ID), id, "Gelöschter Film sollte nicht in der Liste erscheinen")
			}
		}
	})
}
