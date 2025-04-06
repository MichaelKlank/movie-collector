package tests

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/MichaelKlank/movie-collector/backend/models"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupTestDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	assert.NoError(t, err)

	// Migrate the schema
	err = db.AutoMigrate(&models.Movie{})
	assert.NoError(t, err)

	return db
}

func TestGetMovies(t *testing.T) {
	db := setupTestDB(t)

	// Create test movies
	movies := []models.Movie{
		{Title: "Movie 1", Year: 2024},
		{Title: "Movie 2", Year: 2023},
	}
	for _, movie := range movies {
		db.Create(&movie)
	}

	// Setup test context
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)

	// Call handler
	handler := models.GetMovies(db)
	handler(c)

	// Check response
	assert.Equal(t, http.StatusOK, w.Code)

	var response []models.Movie
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Len(t, response, 2)
}

func TestGetMoviesEmpty(t *testing.T) {
	db := setupTestDB(t)

	// Setup test context
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)

	// Call handler
	handler := models.GetMovies(db)
	handler(c)

	// Check response
	assert.Equal(t, http.StatusOK, w.Code)

	var response []models.Movie
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Empty(t, response)
}

func TestGetMovie(t *testing.T) {
	db := setupTestDB(t)

	// Create test movie
	movie := models.Movie{Title: "Test Movie", Year: 2024}
	db.Create(&movie)

	// Setup test context
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Params = gin.Params{{Key: "id", Value: "1"}}

	// Call handler
	handler := models.GetMovie(db)
	handler(c)

	// Check response
	assert.Equal(t, http.StatusOK, w.Code)

	var response models.Movie
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, "Test Movie", response.Title)
	assert.Equal(t, 2024, response.Year)
}

func TestGetMovieNotFound(t *testing.T) {
	db := setupTestDB(t)

	// Setup test context
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Params = gin.Params{{Key: "id", Value: "999"}}

	// Call handler
	handler := models.GetMovie(db)
	handler(c)

	// Check response
	assert.Equal(t, http.StatusNotFound, w.Code)
}

func TestGetMovieInvalidID(t *testing.T) {
	db := setupTestDB(t)

	// Setup test context
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Params = gin.Params{{Key: "id", Value: "invalid"}}

	// Call handler
	handler := models.GetMovie(db)
	handler(c)

	// Check response
	assert.Equal(t, http.StatusNotFound, w.Code)
}

func TestCreateMovie(t *testing.T) {
	db := setupTestDB(t)

	// Setup test context
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)

	// Create test movie data
	movieData := models.Movie{
		Title:       "New Movie",
		Year:        2024,
		Description: "Test Description",
	}
	jsonData, _ := json.Marshal(movieData)
	c.Request = httptest.NewRequest("POST", "/movies", bytes.NewBuffer(jsonData))
	c.Request.Header.Set("Content-Type", "application/json")

	// Call handler
	handler := models.CreateMovie(db)
	handler(c)

	// Check response
	assert.Equal(t, http.StatusCreated, w.Code)

	var response models.Movie
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, "New Movie", response.Title)
	assert.Equal(t, 2024, response.Year)

	// Verify movie was created in database
	var count int64
	db.Model(&models.Movie{}).Count(&count)
	assert.Equal(t, int64(1), count)
}

func TestCreateMovieInvalidData(t *testing.T) {
	db := setupTestDB(t)

	// Setup test context
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)

	// Create invalid movie data
	movieData := models.Movie{
		Title: "", // Missing required field
		Year:  2024,
	}
	jsonData, _ := json.Marshal(movieData)
	c.Request = httptest.NewRequest("POST", "/movies", bytes.NewBuffer(jsonData))
	c.Request.Header.Set("Content-Type", "application/json")

	// Call handler
	handler := models.CreateMovie(db)
	handler(c)

	// Check response
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestCreateMovieInvalidJSON(t *testing.T) {
	db := setupTestDB(t)

	// Setup test context
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)

	// Create invalid JSON
	invalidJSON := []byte(`{"title": "Test Movie", "year": "not a number"}`)
	c.Request = httptest.NewRequest("POST", "/movies", bytes.NewBuffer(invalidJSON))
	c.Request.Header.Set("Content-Type", "application/json")

	// Call handler
	handler := models.CreateMovie(db)
	handler(c)

	// Check response
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestUpdateMovie(t *testing.T) {
	db := setupTestDB(t)

	// Create test movie
	movie := models.Movie{Title: "Old Title", Year: 2023}
	db.Create(&movie)

	// Setup test context
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Params = gin.Params{{Key: "id", Value: "1"}}

	// Create update data
	updateData := models.Movie{
		Title: "New Title",
		Year:  2024,
	}
	jsonData, _ := json.Marshal(updateData)
	c.Request = httptest.NewRequest("PUT", "/movies/1", bytes.NewBuffer(jsonData))
	c.Request.Header.Set("Content-Type", "application/json")

	// Call handler
	handler := models.UpdateMovie(db)
	handler(c)

	// Check response
	assert.Equal(t, http.StatusOK, w.Code)

	var response models.Movie
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, "New Title", response.Title)
	assert.Equal(t, 2024, response.Year)
}

func TestUpdateMovieNotFound(t *testing.T) {
	db := setupTestDB(t)

	// Setup test context
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Params = gin.Params{{Key: "id", Value: "999"}}

	// Create update data
	updateData := models.Movie{
		Title: "New Title",
		Year:  2024,
	}
	jsonData, _ := json.Marshal(updateData)
	c.Request = httptest.NewRequest("PUT", "/movies/999", bytes.NewBuffer(jsonData))
	c.Request.Header.Set("Content-Type", "application/json")

	// Call handler
	handler := models.UpdateMovie(db)
	handler(c)

	// Check response
	assert.Equal(t, http.StatusNotFound, w.Code)
}

func TestUpdateMovieInvalidID(t *testing.T) {
	db := setupTestDB(t)

	// Setup test context
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Params = gin.Params{{Key: "id", Value: "invalid"}}

	// Create update data
	updateData := models.Movie{
		Title: "New Title",
		Year:  2024,
	}
	jsonData, _ := json.Marshal(updateData)
	c.Request = httptest.NewRequest("PUT", "/movies/invalid", bytes.NewBuffer(jsonData))
	c.Request.Header.Set("Content-Type", "application/json")

	// Call handler
	handler := models.UpdateMovie(db)
	handler(c)

	// Check response
	assert.Equal(t, http.StatusNotFound, w.Code)
}

func TestUpdateMovieInvalidJSON(t *testing.T) {
	db := setupTestDB(t)

	// Create test movie
	movie := models.Movie{Title: "Old Title", Year: 2023}
	db.Create(&movie)

	// Setup test context
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Params = gin.Params{{Key: "id", Value: "1"}}

	// Create invalid JSON
	invalidJSON := []byte(`{"title": "New Title", "year": "not a number"}`)
	c.Request = httptest.NewRequest("PUT", "/movies/1", bytes.NewBuffer(invalidJSON))
	c.Request.Header.Set("Content-Type", "application/json")

	// Call handler
	handler := models.UpdateMovie(db)
	handler(c)

	// Check response
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestDeleteMovie(t *testing.T) {
	db := setupTestDB(t)

	// Create test movie
	movie := models.Movie{Title: "To Delete", Year: 2024}
	db.Create(&movie)

	// Setup test context
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Params = gin.Params{{Key: "id", Value: "1"}}

	// Call handler
	handler := models.DeleteMovie(db)
	handler(c)

	// Check response
	assert.Equal(t, http.StatusOK, w.Code)

	// Verify movie was deleted from database
	var count int64
	db.Model(&models.Movie{}).Count(&count)
	assert.Equal(t, int64(0), count)
}

func TestDeleteMovieNotFound(t *testing.T) {
	db := setupTestDB(t)

	// Setup test context
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Params = gin.Params{{Key: "id", Value: "999"}}

	// Call handler
	handler := models.DeleteMovie(db)
	handler(c)

	// Check response
	assert.Equal(t, http.StatusNotFound, w.Code)
}

func TestDeleteMovieInvalidID(t *testing.T) {
	db := setupTestDB(t)

	// Setup test context
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Params = gin.Params{{Key: "id", Value: "invalid"}}

	// Call handler
	handler := models.DeleteMovie(db)
	handler(c)

	// Check response
	assert.Equal(t, http.StatusNotFound, w.Code)
}
