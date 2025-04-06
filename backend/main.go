package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/MichaelKlank/movie-collector/backend/db"
	"github.com/MichaelKlank/movie-collector/backend/handlers"
	"github.com/MichaelKlank/movie-collector/backend/models"
	"github.com/MichaelKlank/movie-collector/backend/repositories"
	"github.com/MichaelKlank/movie-collector/backend/services"
	"github.com/MichaelKlank/movie-collector/backend/tmdb"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	// Initialize database
	if err := db.InitDB(); err != nil {
		log.Fatal(err)
	}

	// Migrate the schema
	if err := db.GetDB().AutoMigrate(&models.Movie{}); err != nil {
		log.Fatal("Failed to migrate database:", err)
	}

	// Initialize dependencies
	movieRepo := repositories.NewMovieRepository(db.GetDB())
	movieService := services.NewMovieService(movieRepo)
	movieHandler := handlers.NewMovieHandler(movieService)
	imageHandler := handlers.NewImageHandler(movieService)

	// Initialize router
	r := gin.Default()

	// CORS configuration
	config := cors.Config{
		AllowOrigins:     []string{"http://localhost", "http://localhost:3000", "http://localhost:5173", "http://example.com"},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization", "Access-Control-Request-Method", "Access-Control-Request-Headers"},
		ExposeHeaders:    []string{"Access-Control-Allow-Origin", "Access-Control-Allow-Methods"},
		AllowCredentials: true,
		MaxAge:           12 * 3600,
		AllowOriginFunc: func(origin string) bool {
			return origin == "http://localhost" ||
				origin == "http://localhost:3000" ||
				origin == "http://localhost:5173" ||
				origin == "http://example.com"
		},
	}
	r.Use(cors.New(config))

	// Movie routes
	r.POST("/movies", movieHandler.CreateMovie)
	r.GET("/movies", movieHandler.GetMovies)
	r.GET("/movies/:id", movieHandler.GetMovie)
	r.PUT("/movies/:id", movieHandler.UpdateMovie)
	r.DELETE("/movies/:id", movieHandler.DeleteMovie)

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

	r.GET("/tmdb/search", func(c *gin.Context) {
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
	})

	r.GET("/tmdb/movie/:id", func(c *gin.Context) {
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
	})

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

	// Test für Pre-Commit-Hook

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	if err := r.Run(":" + port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
