package models

import (
	"bytes"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
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
				"error":         "Validierungsfehler",
				"details":       err.Error(),
				"received_data": string(body),
				"required_fields": []string{
					"title (string)",
					"year (int)",
				},
			})
			return
		}

		// Prüfe, ob ein Film mit der gleichen TMDB-ID bereits existiert
		if movie.TMDBId != "" {
			var existingMovie Movie
			result := db.Where("tmdb_id = ?", movie.TMDBId).First(&existingMovie)
			if result.Error == nil {
				c.JSON(http.StatusConflict, gin.H{
					"error": "Ein Film mit dieser TMDB-ID existiert bereits",
					"movie": existingMovie,
				})
				return
			}
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
			if result.Error == gorm.ErrRecordNotFound || strings.Contains(result.Error.Error(), "no such column") {
				c.JSON(http.StatusNotFound, gin.H{"error": "Movie not found"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
			return
		}

		var updatedMovie Movie
		if err := c.ShouldBindJSON(&updatedMovie); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// Validiere die erforderlichen Felder
		if updatedMovie.Title == "" || updatedMovie.Year == 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Title and year are required"})
			return
		}

		// Aktualisiere nur die angegebenen Felder
		movie.Title = updatedMovie.Title
		movie.Year = updatedMovie.Year
		movie.Description = updatedMovie.Description
		if updatedMovie.PosterPath != "" {
			movie.PosterPath = updatedMovie.PosterPath
		}
		if updatedMovie.TMDBId != "" {
			movie.TMDBId = updatedMovie.TMDBId
		}
		if updatedMovie.Overview != "" {
			movie.Overview = updatedMovie.Overview
		}
		if updatedMovie.ReleaseDate != "" {
			movie.ReleaseDate = updatedMovie.ReleaseDate
		}
		if updatedMovie.Rating != 0 {
			movie.Rating = updatedMovie.Rating
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
			if result.Error == gorm.ErrRecordNotFound || strings.Contains(result.Error.Error(), "no such column") {
				c.JSON(http.StatusNotFound, gin.H{"error": "Movie not found"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
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
			if result.Error == gorm.ErrRecordNotFound {
				c.JSON(http.StatusNotFound, gin.H{"error": "Movie not found"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
			return
		}

		file, err := c.FormFile("image")
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "No image file provided"})
			return
		}

		// Validiere Dateityp
		ext := filepath.Ext(file.Filename)
		validExts := map[string]bool{
			".jpg":  true,
			".jpeg": true,
			".png":  true,
			".gif":  true,
		}
		if !validExts[strings.ToLower(ext)] {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid file type. Only jpg, jpeg, png, and gif are allowed"})
			return
		}

		// Validiere Dateigröße
		if file.Size == 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Empty file"})
			return
		}

		// Maximale Dateigröße: 5MB
		const maxSize = 5 * 1024 * 1024
		if file.Size > maxSize {
			c.JSON(http.StatusBadRequest, gin.H{"error": "File size exceeds maximum limit of 5MB"})
			return
		}

		uploadPath := os.Getenv("UPLOAD_PATH")
		if uploadPath == "" {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Upload path not configured"})
			return
		}

		// Create upload directory if it doesn't exist
		if err := os.MkdirAll(uploadPath, 0755); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create upload directory"})
			return
		}

		// Generate unique filename
		filename := filepath.Join(uploadPath, filepath.Base(file.Filename))

		// Save the file
		if err := c.SaveUploadedFile(file, filename); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save image"})
			return
		}

		// Update movie with image path
		movie.ImagePath = filename
		if err := db.Save(&movie).Error; err != nil {
			// Lösche die hochgeladene Datei bei einem Datenbankfehler
			os.Remove(filename)
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
