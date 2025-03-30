package tests

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/klank-cnv/go-test/backend/models"
	"github.com/klank-cnv/go-test/backend/testutil"
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

		var movies []models.Movie
		err := json.Unmarshal(w.Body.Bytes(), &movies)
		assert.NoError(t, err)
		assert.Greater(t, len(movies), 0)
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
	})

	t.Run("Delete Movie", func(t *testing.T) {
		req := httptest.NewRequest("DELETE", "/movies/1", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		// Verify movie is deleted
		req = httptest.NewRequest("GET", "/movies/1", nil)
		w = httptest.NewRecorder()
		router.ServeHTTP(w, req)
		assert.Equal(t, http.StatusNotFound, w.Code)
	})
}
