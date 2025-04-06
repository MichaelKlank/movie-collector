package tests

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/MichaelKlank/movie-collector/backend/testutil"
	"github.com/stretchr/testify/assert"
)

func TestImage(t *testing.T) {
	db := testutil.SetupTestDB(t)
	router := testutil.SetupRouter(db)

	t.Run("Test Image Upload", func(t *testing.T) {
		req := httptest.NewRequest("POST", "/movies/1/image", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusNotFound, w.Code)
	})

	t.Run("Test Image Get", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/movies/1/image", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusNotFound, w.Code)
	})

	t.Run("Test Image Delete", func(t *testing.T) {
		req := httptest.NewRequest("DELETE", "/movies/1/image", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusNotFound, w.Code)
	})
}
