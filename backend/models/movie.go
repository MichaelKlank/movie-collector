package models

import (
	"bytes"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type Movie struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	Title       string    `json:"title" binding:"required"`
	Description string    `json:"description"`
	Year        int       `json:"year" binding:"required"`
	ImagePath   string    `json:"image_path"`
	PosterPath  string    `json:"poster_path"`
	TMDBId      string    `json:"tmdb_id"`
	Overview    string    `json:"overview"`
	ReleaseDate string    `json:"release_date"`
	Rating      float32   `json:"rating"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

func GetMovies(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var movies []Movie
		result := db.Find(&movies)
		if result.Error != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
			return
		}
		c.JSON(http.StatusOK, movies)
	}
}

func GetMovie(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var movie Movie
		result := db.First(&movie, c.Param("id"))
		if result.Error != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Movie not found"})
			return
		}
		c.JSON(http.StatusOK, movie)
	}
}

func CreateMovie(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var movie Movie
		body, _ := io.ReadAll(c.Request.Body)
		c.Request.Body = io.NopCloser(bytes.NewBuffer(body))
		
		if err := c.ShouldBindJSON(&movie); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Validierungsfehler",
				"details": err.Error(),
				"received_data": string(body),
				"required_fields": []string{
					"title (string)",
					"year (int)",
				},
			})
			return
		}

		result := db.Create(&movie)
		if result.Error != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
			return
		}

		c.JSON(http.StatusCreated, movie)
	}
}

func UpdateMovie(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var movie Movie
		result := db.First(&movie, c.Param("id"))
		if result.Error != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Movie not found"})
			return
		}

		if err := c.ShouldBindJSON(&movie); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		result = db.Save(&movie)
		if result.Error != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
			return
		}

		c.JSON(http.StatusOK, movie)
	}
}

func DeleteMovie(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var movie Movie
		result := db.First(&movie, c.Param("id"))
		if result.Error != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Movie not found"})
			return
		}

		result = db.Delete(&movie)
		if result.Error != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Movie deleted successfully"})
	}
}

func UploadImage(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var movie Movie
		result := db.First(&movie, c.Param("id"))
		if result.Error != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Movie not found"})
			return
		}

		file, err := c.FormFile("image")
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "No image file provided"})
			return
		}

		// Create images directory if it doesn't exist
		if err := os.MkdirAll("images", 0755); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create images directory"})
			return
		}

		// Generate unique filename
		filename := filepath.Join("images", filepath.Base(file.Filename))

		// Save the file
		if err := c.SaveUploadedFile(file, filename); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save image"})
			return
		}

		// Update movie with image path
		movie.ImagePath = filename
		if err := db.Save(&movie).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update movie with image path"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Image uploaded successfully", "path": filename})
	}
}

func GetImage(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var movie Movie
		result := db.First(&movie, c.Param("id"))
		if result.Error != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Movie not found"})
			return
		}

		if movie.ImagePath == "" {
			c.JSON(http.StatusNotFound, gin.H{"error": "No image found for this movie"})
			return
		}

		// Check if file exists
		if _, err := os.Stat(movie.ImagePath); os.IsNotExist(err) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Image file not found"})
			return
		}

		c.File(movie.ImagePath)
	}
}

func DeleteImage(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var movie Movie
		result := db.First(&movie, c.Param("id"))
		if result.Error != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Movie not found"})
			return
		}

		if movie.ImagePath == "" {
			c.JSON(http.StatusNotFound, gin.H{"error": "No image found for this movie"})
			return
		}

		// Delete the file
		if err := os.Remove(movie.ImagePath); err != nil && !os.IsNotExist(err) {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete image file"})
			return
		}

		// Update movie to remove image path
		movie.ImagePath = ""
		if err := db.Save(&movie).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update movie"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Image deleted successfully"})
	}
} 