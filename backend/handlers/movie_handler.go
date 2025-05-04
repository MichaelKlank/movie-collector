package handlers

import (
	"net/http"
	"strconv"

	"github.com/MichaelKlank/movie-collector/backend/models"
	"github.com/MichaelKlank/movie-collector/backend/services"
	"github.com/gin-gonic/gin"
)

type MovieHandler struct {
	service *services.MovieService
}

func NewMovieHandler(service *services.MovieService) *MovieHandler {
	return &MovieHandler{service: service}
}

// GetMovies godoc
// @Summary      Liste aller Filme abrufen
// @Description  Gibt eine paginierte Liste aller gespeicherten Filme zurück
// @Tags         movies
// @Accept       json
// @Produce      json
// @Param        page    query   int  false  "Seitennummer (Standard: 1)"
// @Param        limit   query   int  false  "Einträge pro Seite (Standard: 20, Max: 100)"
// @Success      200  {object}  models.PaginatedResponse
// @Failure      500  {object}  models.ErrorResponse
// @Router       /movies [get]
func (h *MovieHandler) GetMovies(c *gin.Context) {
	// Parameter für Paginierung
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	if page < 1 {
		page = 1
	}

	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if limit < 1 {
		limit = 20
	} else if limit > 100 {
		limit = 100 // Maximale Anzahl begrenzen
	}

	offset := (page - 1) * limit

	movies, total, err := h.service.GetMoviesPaginated(offset, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Berechne Gesamtanzahl der Seiten
	totalPages := (total + int64(limit) - 1) / int64(limit)

	c.JSON(http.StatusOK, gin.H{
		"data": movies,
		"meta": gin.H{
			"page":        page,
			"limit":       limit,
			"total":       total,
			"total_pages": totalPages,
		},
	})
}

// SearchMovies godoc
// @Summary      Filme suchen
// @Description  Durchsucht die Filmdatenbank nach einem Suchbegriff
// @Tags         movies
// @Accept       json
// @Produce      json
// @Param        q       query   string  true   "Suchbegriff"
// @Param        page    query   int     false  "Seitennummer (Standard: 1)"
// @Param        limit   query   int     false  "Einträge pro Seite (Standard: 20, Max: 100)"
// @Success      200  {object}  models.PaginatedResponse
// @Failure      500  {object}  models.ErrorResponse
// @Router       /movies/search [get]
func (h *MovieHandler) SearchMovies(c *gin.Context) {
	// Hole den Suchbegriff
	query := c.Query("q")

	// Parameter für Paginierung
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	if page < 1 {
		page = 1
	}

	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if limit < 1 {
		limit = 20
	} else if limit > 100 {
		limit = 100 // Maximale Anzahl begrenzen
	}

	offset := (page - 1) * limit

	// Führe die Suche durch
	movies, total, err := h.service.SearchMovies(query, offset, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Berechne Gesamtanzahl der Seiten
	totalPages := (total + int64(limit) - 1) / int64(limit)

	c.JSON(http.StatusOK, gin.H{
		"data": movies,
		"meta": gin.H{
			"page":        page,
			"limit":       limit,
			"total":       total,
			"total_pages": totalPages,
			"query":       query,
		},
	})
}

// GetMovie godoc
// @Summary      Einzelnen Film abrufen
// @Description  Gibt einen spezifischen Film anhand seiner ID zurück
// @Tags         movies
// @Accept       json
// @Produce      json
// @Param        id   path      int  true  "Movie ID"
// @Success      200  {object}  models.Movie
// @Failure      400  {object}  models.ErrorResponse
// @Failure      404  {object}  models.ErrorResponse
// @Router       /movies/{id} [get]
func (h *MovieHandler) GetMovie(c *gin.Context) {
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
	c.JSON(http.StatusOK, movie)
}

// CreateMovie godoc
// @Summary      Neuen Film erstellen
// @Description  Erstellt einen neuen Film in der Datenbank
// @Tags         movies
// @Accept       json
// @Produce      json
// @Param        movie  body      models.Movie  true  "Movie Information"
// @Success      201   {object}  models.Movie
// @Failure      400   {object}  models.ErrorResponse
// @Failure      500   {object}  models.ErrorResponse
// @Router       /movies [post]
func (h *MovieHandler) CreateMovie(c *gin.Context) {
	var movie models.Movie
	if err := c.ShouldBindJSON(&movie); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.service.CreateMovie(&movie); err != nil {
		if err.Error() == "Ein Film mit dieser TMDB-ID existiert bereits" {
			existingMovie, _ := h.service.GetMovieByTMDBID(movie.TMDBId)
			c.JSON(http.StatusConflict, gin.H{
				"error": err.Error(),
				"movie": existingMovie,
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, movie)
}

// UpdateMovie godoc
// @Summary      Film aktualisieren
// @Description  Aktualisiert einen bestehenden Film
// @Tags         movies
// @Accept       json
// @Produce      json
// @Param        id     path      int          true  "Movie ID"
// @Param        movie  body      models.Movie  true  "Movie Information"
// @Success      200   {object}  models.Movie
// @Failure      400   {object}  models.ErrorResponse
// @Failure      404   {object}  models.ErrorResponse
// @Failure      500   {object}  models.ErrorResponse
// @Router       /movies/{id} [put]
func (h *MovieHandler) UpdateMovie(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid movie ID"})
		return
	}

	var movie models.Movie
	if err := c.ShouldBindJSON(&movie); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	movie.ID = uint(id)
	if err := h.service.UpdateMovie(&movie); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, movie)
}

// DeleteMovie godoc
// @Summary      Film löschen
// @Description  Löscht einen Film aus der Datenbank
// @Tags         movies
// @Accept       json
// @Produce      json
// @Param        id   path      int  true  "Movie ID"
// @Success      200  {object}  models.SwaggerResponse
// @Failure      400  {object}  models.ErrorResponse
// @Failure      404  {object}  models.ErrorResponse
// @Failure      500  {object}  models.ErrorResponse
// @Router       /movies/{id} [delete]
func (h *MovieHandler) DeleteMovie(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid movie ID"})
		return
	}

	err = h.service.DeleteMovie(uint(id))
	if err != nil {
		if err.Error() == "Movie not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": "Film nicht gefunden"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Movie deleted successfully"})
}
