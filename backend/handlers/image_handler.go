package handlers

import (
	"net/http"
	"os"
	"path/filepath"
	"strconv"

	"github.com/MichaelKlank/movie-collector/backend/services"
	"github.com/gin-gonic/gin"
)

type ImageHandler struct {
	service *services.MovieService
}

func NewImageHandler(service *services.MovieService) *ImageHandler {
	return &ImageHandler{service: service}
}

func (h *ImageHandler) UploadImage(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid movie ID"})
		return
	}

	movie, err := h.service.GetMovieByID(uint(id))
	if err != nil {
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
	if err := h.service.UpdateMovie(&movie); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update movie with image path"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Image uploaded successfully", "path": filename})
}

func (h *ImageHandler) GetImage(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid movie ID"})
		return
	}

	movie, err := h.service.GetMovieByID(uint(id))
	if err != nil {
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

func (h *ImageHandler) DeleteImage(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid movie ID"})
		return
	}

	movie, err := h.service.GetMovieByID(uint(id))
	if err != nil {
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
	if err := h.service.UpdateMovie(&movie); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update movie"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Image deleted successfully"})
}
