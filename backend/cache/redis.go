package cache

import (
	"log"
	"os"
	"time"

	"github.com/gin-contrib/cache/persistence"
)

// CacheStore ist die Schnittstelle für alle Cache-Operationen
type CacheStore interface {
	// Get ruft einen Wert aus dem Cache ab
	Get(key string, value interface{}) error
	// Set speichert einen Wert im Cache
	Set(key string, value interface{}, expire time.Duration) error
	// Delete entfernt einen Eintrag aus dem Cache
	Delete(key string) error
	// Flush leert den gesamten Cache
	Flush() error
}

// Variablen für den Cache
var (
	// RedisStore ist der zentrale Cache-Speicher
	RedisStore persistence.CacheStore
	// DefaultExpiration ist die Standardablaufzeit für Cache-Einträge
	DefaultExpiration = 5 * time.Minute
)

// InitRedisCache initialisiert den Cache-Speicher
func InitRedisCache() {
	redisHost := os.Getenv("REDIS_HOST")
	redisPassword := os.Getenv("REDIS_PASSWORD")

	// Wenn REDIS_HOST definiert ist, verwende Redis, ansonsten In-Memory-Cache
	if redisHost != "" {
		log.Printf("Verwende Redis-Cache auf %s", redisHost)
		// Verwende RedisCache aus dem persistence-Paket
		RedisStore = persistence.NewRedisCache(redisHost, redisPassword, DefaultExpiration)
	} else {
		log.Printf("Verwende In-Memory-Cache (nur für Entwicklung/Tests)")
		RedisStore = persistence.NewInMemoryStore(DefaultExpiration)
	}
}

// ClearAllCaches löscht alle Caches
func ClearAllCaches() {
	// Liste der wichtigen API-Pfade, die gecacht werden
	cachePaths := []string{
		"/api/movies",
		"/api/movies/search",
		"/movies",
		"/movies/search",
	}

	// Lösche jeden Cache-Pfad einzeln
	for _, path := range cachePaths {
		if err := RedisStore.Delete(path); err != nil {
			log.Printf("Fehler beim Löschen des Caches %s: %v", path, err)
		}
	}

	// Lösche alle Cache-Einträge
	if err := RedisStore.Flush(); err != nil {
		log.Printf("Fehler beim Leeren des gesamten Caches: %v", err)
	}

	log.Printf("Alle Caches wurden gelöscht")
}
