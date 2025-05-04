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

// UploadImage godoc
// @Summary      Bild für einen Film hochladen
// @Description  Lädt ein Bild für einen spezifischen Film hoch
// @Tags         images
// @Accept       multipart/form-data
// @Produce      json
// @Param        id    path      int   true  "Movie ID"
// @Param        image formData  file  true  "Image file"
// @Success      200   {object}  models.SwaggerResponse
// @Failure      400   {object}  models.ErrorResponse
// @Failure      404   {object}  models.ErrorResponse
// @Failure      500   {object}  models.ErrorResponse
// @Router       /movies/{id}/image [post]
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

// GetImage godoc
// @Summary      Bild eines Films abrufen
// @Description  Gibt das Bild eines spezifischen Films zurück
// @Tags         images
// @Produce      image/jpeg,image/png,image/gif
// @Param        id   path      int  true  "Movie ID"
// @Success      200  {file}    binary
// @Failure      400  {object}  models.ErrorResponse
// @Failure      404  {object}  models.ErrorResponse
// @Router       /movies/{id}/image [get]
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

// DeleteImage godoc
// @Summary      Bild eines Films löschen
// @Description  Löscht das Bild eines spezifischen Films
// @Tags         images
// @Produce      json
// @Param        id   path      int  true  "Movie ID"
// @Success      200  {object}  models.SwaggerResponse
// @Failure      400  {object}  models.ErrorResponse
// @Failure      404  {object}  models.ErrorResponse
// @Failure      500  {object}  models.ErrorResponse
// @Router       /movies/{id}/image [delete]
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
