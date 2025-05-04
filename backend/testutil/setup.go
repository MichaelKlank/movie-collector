package testutil

import (
	"fmt"
	"net/http"
	"testing"
	"time"

	"github.com/MichaelKlank/movie-collector/backend/cache"
	"github.com/MichaelKlank/movie-collector/backend/handlers"
	"github.com/MichaelKlank/movie-collector/backend/models"
	"github.com/MichaelKlank/movie-collector/backend/repositories"
	"github.com/MichaelKlank/movie-collector/backend/services"
	"github.com/MichaelKlank/movie-collector/backend/tmdb"
	gincache "github.com/gin-contrib/cache"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func SetupTestDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("Failed to connect to test database: %v", err)
	}

	// Migrate the schema
	err = db.AutoMigrate(&models.Movie{})
	if err != nil {
		t.Fatalf("Failed to migrate test database: %v", err)
	}

	return db
}

// InitTestCache initialisiert den Test-Cache
func InitTestCache() {
	// Für Tests verwenden wir immer den In-Memory-Cache
	cache.InitRedisCache()
}

func SetupRouter(db *gorm.DB) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.Default()

	// Initialisiere den Cache für Tests
	InitTestCache()

	// Initialize dependencies
	movieRepo := repositories.NewMovieRepository(db)
	movieService := services.NewMovieService(movieRepo)
	movieHandler := handlers.NewMovieHandler(movieService)
	imageHandler := handlers.NewImageHandler(movieService)
	versionHandler := handlers.NewVersionHandler()

	// CORS configuration
	config := cors.Config{
		AllowOrigins:     []string{"http://localhost:3000", "http://example.com"},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization", "Access-Control-Request-Method", "Access-Control-Request-Headers"},
		ExposeHeaders:    []string{"Access-Control-Allow-Origin", "Access-Control-Allow-Methods"},
		AllowCredentials: false,
		MaxAge:           12 * 3600,
		AllowWildcard:    false,
		AllowOriginFunc: func(origin string) bool {
			return origin == "http://localhost:3000" || origin == "http://example.com"
		},
	}
	r.Use(cors.New(config))

	// Middleware für Cache-Control Header
	r.Use(func(c *gin.Context) {
		// Setze Cache-Control Header für alle Antworten
		c.Writer.Header().Set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0")
		c.Writer.Header().Set("Pragma", "no-cache")
		c.Writer.Header().Set("Expires", "0")
		c.Next()
	})

	// Add a custom middleware to handle CORS preflight requests
	r.Use(func(c *gin.Context) {
		if c.Request.Method == "OPTIONS" {
			origin := c.Request.Header.Get("Origin")
			if origin == "http://localhost:3000" || origin == "http://example.com" {
				c.Header("Access-Control-Allow-Origin", origin)
				c.Header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS")
				c.Header("Access-Control-Allow-Headers", "Origin,Content-Type,Authorization,Access-Control-Request-Method,Access-Control-Request-Headers")
				c.Status(http.StatusNoContent)
				c.Abort()
				return
			}
		}
		c.Next()
	})

	// Version route
	r.GET("/version", versionHandler.GetVersion)

	// Movie routes mit Cache für GET-Anfragen
	r.GET("/movies", gincache.CachePage(cache.RedisStore, 2*time.Minute, movieHandler.GetMovies))
	r.GET("/movies/:id", gincache.CachePage(cache.RedisStore, 5*time.Minute, movieHandler.GetMovie))
	r.POST("/movies", func(c *gin.Context) {
		movieHandler.CreateMovie(c)
		// Cache nach Erstellung eines Films invalidieren
		cache.ClearAllCaches()
	})
	r.PUT("/movies/:id", func(c *gin.Context) {
		movieHandler.UpdateMovie(c)
		// Cache nach Update eines Films invalidieren
		cache.ClearAllCaches()
	})
	r.DELETE("/movies/:id", func(c *gin.Context) {
		movieHandler.DeleteMovie(c)
		// Cache nach Löschen eines Films invalidieren
		cache.ClearAllCaches()
	})

	// Image routes
	r.POST("/movies/:id/image", imageHandler.UploadImage)
	r.GET("/movies/:id/image", imageHandler.GetImage)
	r.DELETE("/movies/:id/image", imageHandler.DeleteImage)

	// TMDB routes mit Cache
	r.GET("/tmdb/test", func(c *gin.Context) {
		client := tmdb.NewClient()
		if err := client.TestConnection(); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	r.GET("/tmdb/search", gincache.CachePage(cache.RedisStore, time.Minute, func(c *gin.Context) {
		query := c.Query("query")
		if query == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "query parameter is required"})
			return
		}

		client := tmdb.NewClient()
		movies, err := client.SearchMovies(query)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, movies)
	}))

	r.GET("/tmdb/movie/:id", gincache.CachePage(cache.RedisStore, time.Hour, func(c *gin.Context) {
		idStr := c.Param("id")
		if idStr == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "movie ID is required"})
			return
		}

		var id int
		if _, err := fmt.Sscanf(idStr, "%d", &id); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid movie ID"})
			return
		}

		client := tmdb.NewClient()
		movie, err := client.GetMovieDetails(id)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, movie)
	}))

	return r
}
