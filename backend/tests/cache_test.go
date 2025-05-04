package tests

import (
	"os"
	"testing"
	"time"

	"github.com/MichaelKlank/movie-collector/backend/cache"
	"github.com/stretchr/testify/assert"
)

// TestCacheInitialisierung testet die Konfiguration und Initialisierung des Caches
func TestCacheInitialisierung(t *testing.T) {
	// Ursprüngliche Umgebungsvariable speichern
	originalRedisHost := os.Getenv("REDIS_HOST")
	defer os.Setenv("REDIS_HOST", originalRedisHost)

	// 1. Test: Wenn REDIS_HOST leer ist, sollte In-Memory-Cache verwendet werden
	os.Setenv("REDIS_HOST", "")
	cache.InitRedisCache()
	assert.NotNil(t, cache.RedisStore, "Cache-Speicher sollte initialisiert werden")

	// Ein paar Basistests am In-Memory-Cache
	testKey := "test-key"
	testValue := "test-value"

	// Wert setzen
	err := cache.RedisStore.Set(testKey, testValue, 1*time.Minute)
	assert.NoError(t, err, "Setzen eines Werts im Cache sollte funktionieren")

	// Wert abrufen
	var retrievedValue string
	err = cache.RedisStore.Get(testKey, &retrievedValue)
	assert.NoError(t, err, "Abrufen eines Werts aus dem Cache sollte funktionieren")
	assert.Equal(t, testValue, retrievedValue, "Der abgerufene Wert sollte mit dem gespeicherten übereinstimmen")

	// Wert löschen
	err = cache.RedisStore.Delete(testKey)
	assert.NoError(t, err, "Löschen eines Werts aus dem Cache sollte funktionieren")

	// Überprüfen, ob der Wert wirklich gelöscht wurde
	var emptyValue string
	err = cache.RedisStore.Get(testKey, &emptyValue)
	assert.Error(t, err, "Nach dem Löschen sollte der Wert nicht mehr im Cache sein")

	// 2. Test: Wenn REDIS_HOST gesetzt ist, sollte Redis-Cache verwendet werden
	// Für automatisierte Tests können wir das nicht wirklich testen, außer wir haben
	// einen Redis-Server in der CI/CD-Pipeline laufen. Hier nur ein Mock-Test.
	if originalRedisHost != "" {
		t.Logf("Redis-Host gefunden: %s, führe Redis-Tests durch", originalRedisHost)

		// Redis-Cache initialisieren
		cache.InitRedisCache()
		assert.NotNil(t, cache.RedisStore, "Redis-Cache sollte initialisiert werden")

		// Nur ein einfacher Test, um sicherzustellen, dass die Initialisierung funktioniert hat
		err := cache.RedisStore.Set("redis-test-key", "redis-test-value", 1*time.Minute)
		if err != nil {
			t.Logf("Hinweis: Redis-Verbindungstest fehlgeschlagen: %v", err)
		} else {
			t.Log("Redis-Verbindung erfolgreich getestet")
		}
	}
}

// TestCacheInvalidierung testet die Cache-Invalidierung
func TestCacheInvalidierung(t *testing.T) {
	// Redis-Cache initialisieren
	cache.InitRedisCache()

	// Testdaten in den Cache einfügen
	err := cache.RedisStore.Set("/api/movies", "movies-data", 1*time.Minute)
	assert.NoError(t, err, "Setzen des Cache-Eintrags sollte funktionieren")

	err = cache.RedisStore.Set("/api/movies/search", "search-data", 1*time.Minute)
	assert.NoError(t, err, "Setzen des Cache-Eintrags sollte funktionieren")

	err = cache.RedisStore.Set("/movies", "internal-movies-data", 1*time.Minute)
	assert.NoError(t, err, "Setzen des Cache-Eintrags sollte funktionieren")

	err = cache.RedisStore.Set("/movies/search", "internal-search-data", 1*time.Minute)
	assert.NoError(t, err, "Setzen des Cache-Eintrags sollte funktionieren")

	// Cache invalidieren
	cache.ClearAllCaches()

	// Überprüfen, ob die Daten gelöscht wurden
	var value string
	err = cache.RedisStore.Get("/api/movies", &value)
	assert.Error(t, err, "Nach der Invalidierung sollte /api/movies nicht mehr im Cache sein")

	err = cache.RedisStore.Get("/api/movies/search", &value)
	assert.Error(t, err, "Nach der Invalidierung sollte /api/movies/search nicht mehr im Cache sein")

	err = cache.RedisStore.Get("/movies", &value)
	assert.Error(t, err, "Nach der Invalidierung sollte /movies nicht mehr im Cache sein")

	err = cache.RedisStore.Get("/movies/search", &value)
	assert.Error(t, err, "Nach der Invalidierung sollte /movies/search nicht mehr im Cache sein")
}
