package tests

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"regexp"
	"testing"

	"github.com/MichaelKlank/movie-collector/backend/testutil"
	"github.com/MichaelKlank/movie-collector/backend/version"
	"github.com/stretchr/testify/assert"
)

func TestVersionAPI(t *testing.T) {
	db := testutil.SetupTestDB(t)
	router := testutil.SetupRouter(db)

	t.Run("Versions-API sollte die korrekte Versionsnummer zurückgeben", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/version", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var response map[string]string
		err := json.Unmarshal(w.Body.Bytes(), &response)
		assert.NoError(t, err)

		// Prüfe, ob der Versionsschlüssel existiert
		versionString, exists := response["version"]
		assert.True(t, exists, "Response sollte einen 'version'-Schlüssel enthalten")

		// Prüfe, ob die Version einem der erlaubten Formate entspricht
		// Format 1: Major.Minor.Patch-Hash (z.B. 1.18.3-83eb093) - Release
		// Format 2: Major.Minor.Patch-dev (z.B. 1.18.0-dev) - Entwicklung
		pattern := `^(\d+)\.(\d+)\.(\d+)-([a-f0-9]+|dev)$`
		regex := regexp.MustCompile(pattern)
		assert.True(t, regex.MatchString(versionString),
			"Version sollte dem Format Major.Minor.Patch-Hash oder Major.Minor.Patch-dev entsprechen, ist aber: %s", versionString)

		// Prüfe, ob die API-Version mit der Version aus dem version-Paket übereinstimmt
		assert.Equal(t, version.Version(), versionString,
			"API-Version sollte mit der Version aus dem version-Paket übereinstimmen")
	})
}
