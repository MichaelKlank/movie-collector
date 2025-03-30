package tests

import (
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/klank-cnv/go-test/backend/testutil"
	"github.com/stretchr/testify/assert"
)

func TestTMDB(t *testing.T) {
	db := testutil.SetupTestDB(t)
	router := testutil.SetupRouter(db)

	t.Run("Test TMDB Configuration", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/tmdb/test", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		if os.Getenv("TMDB_API_KEY") == "" {
			assert.Equal(t, http.StatusInternalServerError, w.Code)
			return
		}

		assert.Equal(t, http.StatusOK, w.Code)
	})

	t.Run("Test TMDB Search", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/tmdb/search?query=test", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusInternalServerError, w.Code)
	})

	t.Run("Test TMDB Search Missing Query", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/tmdb/search", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("Test TMDB Movie", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/tmdb/movie/123", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusInternalServerError, w.Code)
	})
}
