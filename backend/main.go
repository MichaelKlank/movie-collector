package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/MichaelKlank/movie-collector/backend/cache"
	"github.com/MichaelKlank/movie-collector/backend/db"
	"github.com/MichaelKlank/movie-collector/backend/handlers"
	"github.com/MichaelKlank/movie-collector/backend/middleware"
	"github.com/MichaelKlank/movie-collector/backend/models"
	"github.com/MichaelKlank/movie-collector/backend/repositories"
	"github.com/MichaelKlank/movie-collector/backend/services"
	"github.com/MichaelKlank/movie-collector/backend/tmdb"
	"github.com/MichaelKlank/movie-collector/backend/version"
	gincache "github.com/gin-contrib/cache"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
)

// @title           Movie Collector API
// @version         1.0
// @description     Eine API zur Verwaltung Ihrer Filmsammlung
// @termsOfService  http://swagger.io/terms/

// @contact.name   API Support
// @contact.url    http://www.swagger.io/support
// @contact.email  support@swagger.io

// @license.name  Apache 2.0
// @license.url   http://www.apache.org/licenses/LICENSE-2.0.html

// @host      localhost
// @BasePath  /api

// @securityDefinitions.basic  BasicAuth

func waitForDB() error {
	maxRetries := 10
	for i := 0; i < maxRetries; i++ {
		err := db.InitDB()
		if err == nil {
			return nil
		}
		log.Printf("Warte auf Datenbank... (Versuch %d/%d): %v", i+1, maxRetries, err)
		time.Sleep(5 * time.Second)
	}
	return fmt.Errorf("Datenbank nicht erreichbar nach %d Versuchen", maxRetries)
}

func main() {
	// Setze GIN in den Release-Modus
	gin.SetMode(gin.ReleaseMode)

	// Warte auf Datenbank
	if err := waitForDB(); err != nil {
		log.Fatal("Fehler beim Verbinden mit der Datenbank:", err)
	}

	// Migrate the schema
	if err := db.GetDB().AutoMigrate(&models.Movie{}); err != nil {
		log.Fatal("Failed to migrate database:", err)
	}

	// Initialisiere den Redis-Cache
	cache.InitRedisCache()

	// Initialize dependencies
	movieRepo := repositories.NewMovieRepository(db.GetDB())
	movieService := services.NewMovieService(movieRepo)
	movieHandler := handlers.NewMovieHandler(movieService)
	imageHandler := handlers.NewImageHandler(movieService)
	versionHandler := handlers.NewVersionHandler()

	// Initialize router
	r := gin.Default()

	// CORS configuration
	config := cors.Config{
		AllowOrigins:     []string{"http://localhost", "http://localhost:3000", "http://localhost:5173", "http://localhost:8080", "http://localhost:8082", "http://example.com"},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization", "Access-Control-Request-Method", "Access-Control-Request-Headers"},
		ExposeHeaders:    []string{"Access-Control-Allow-Origin", "Access-Control-Allow-Methods"},
		AllowCredentials: true,
		MaxAge:           12 * 3600,
		AllowOriginFunc: func(origin string) bool {
			return origin == "http://localhost" ||
				origin == "http://localhost:3000" ||
				origin == "http://localhost:5173" ||
				origin == "http://localhost:8080" ||
				origin == "http://localhost:8082" ||
				origin == "http://example.com"
		},
	}
	r.Use(cors.New(config))

	// Rate Limiter konfigurieren (100 Anfragen pro Minute pro IP)
	rateLimiter := middleware.NewRateLimiter(100, time.Minute)
	r.Use(rateLimiter.Middleware())
	// Starte Cleanup-Task für Rate Limiter (alle 5 Minuten)
	rateLimiter.CleanupTask(5 * time.Minute)

	// Middleware für Cache-Control Header
	r.Use(func(c *gin.Context) {
		// Setze Cache-Control Header für alle Antworten
		c.Writer.Header().Set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0")
		c.Writer.Header().Set("Pragma", "no-cache")
		c.Writer.Header().Set("Expires", "0")
		c.Next()
	})

	// Version route
	r.GET("/version", versionHandler.GetVersion)

	// Movie routes mit Cache für GET-Anfragen
	r.GET("/movies", gincache.CachePage(cache.RedisStore, 2*time.Minute, movieHandler.GetMovies))
	r.GET("/movies/search", gincache.CachePage(cache.RedisStore, 1*time.Minute, movieHandler.SearchMovies))
	r.GET("/movies/:id", gincache.CachePage(cache.RedisStore, 5*time.Minute, movieHandler.GetMovie))
	r.POST("/movies", func(c *gin.Context) {
		movieHandler.CreateMovie(c)
		// Cache nach Erstellung eines Films invalidieren
		log.Printf("Cache wird nach Film-Erstellung invalidiert")
		cache.ClearAllCaches()
	})
	r.PUT("/movies/:id", func(c *gin.Context) {
		movieHandler.UpdateMovie(c)
		// Cache nach Update eines Films invalidieren
		id := c.Param("id")
		log.Printf("Cache wird nach Film-Update invalidiert: id=%s", id)
		cache.ClearAllCaches()
	})
	r.DELETE("/movies/:id", func(c *gin.Context) {
		movieHandler.DeleteMovie(c)
		// Cache nach Löschen eines Films invalidieren
		id := c.Param("id")
		log.Printf("Cache wird nach Film-Löschung invalidiert: id=%s", id)
		cache.ClearAllCaches()
	})

	// Image routes
	r.POST("/movies/:id/image", imageHandler.UploadImage)
	r.GET("/movies/:id/image", imageHandler.GetImage)
	r.DELETE("/movies/:id/image", imageHandler.DeleteImage)

	// TMDB routes
	r.GET("/tmdb/test", func(c *gin.Context) {
		client := tmdb.NewClient()
		if err := client.TestConnection(); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	// Cache für TMDB-Suche (kürzere Ablaufzeit von 1 Minute)
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

	// Cache für TMDB-Filmdetails (längere Ablaufzeit von 1 Stunde)
	r.GET("/tmdb/movie/:id", gincache.CachePage(cache.RedisStore, time.Hour, func(c *gin.Context) {
		idStr := c.Param("id")
		if idStr == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "movie ID is required"})
			return
		}

		id, err := strconv.Atoi(idStr)
		if err != nil {
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

	// SBOM route
	r.GET("/sbom", func(c *gin.Context) {
		sbomData, err := os.ReadFile("sbom.json")
		if err != nil {
			log.Printf("Error reading SBOM file: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Failed to read SBOM file",
				"details": err.Error(),
			})
			return
		}
		c.Data(http.StatusOK, "application/json", sbomData)
	})

	// Swagger documentation route
	// Use an environment variable for the host, defaulting to the direct port access
	host := os.Getenv("API_HOST")
	if host == "" {
		host = "localhost:8082"
	}
	url := ginSwagger.URL(fmt.Sprintf("http://%s/docs/swagger.json", host))
	r.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler, url))

	// Serve the entire docs directory statically
	r.Static("/docs", "./docs")

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Printf("Server läuft auf Port %s (Version %s)", port, version.Version())
	if err := r.Run(":" + port); err != nil {
		log.Fatal("Fehler beim Starten des Servers:", err)
	}
}
