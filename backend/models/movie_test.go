package models

import (
	"bytes"
	"crypto/rand"
	"encoding/json"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupTestDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("Fehler beim Öffnen der Test-Datenbank: %v", err)
	}

	// Migriere das Schema
	err = db.AutoMigrate(&Movie{})
	if err != nil {
		t.Fatalf("Fehler bei der Datenbankmigrierung: %v", err)
	}

	return db
}

func setupRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	return gin.Default()
}

func TestGetMovies(t *testing.T) {
	db := setupTestDB(t)
	router := setupRouter()

	// Füge Test-Daten hinzu
	testMovie := Movie{
		Title:       "Test Movie",
		Description: "A test movie",
		Year:        2024,
	}
	db.Create(&testMovie)

	router.GET("/movies", GetMovies(db))

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/movies", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestGetMovie(t *testing.T) {
	db := setupTestDB(t)
	router := setupRouter()

	// Füge Test-Daten hinzu
	testMovie := Movie{
		Title:       "Test Movie",
		Description: "A test movie",
		Year:        2024,
	}
	db.Create(&testMovie)

	router.GET("/movies/:id", GetMovie(db))

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/movies/1", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestGetMovieNotFound(t *testing.T) {
	db := setupTestDB(t)
	router := setupRouter()

	router.GET("/movies/:id", GetMovie(db))

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/movies/999", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

func TestCreateMovie(t *testing.T) {
	db := setupTestDB(t)
	router := setupRouter()

	router.POST("/movies", CreateMovie(db))

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/movies", bytes.NewBufferString(`{
		"title": "New Movie",
		"year": 2024,
		"description": "A new movie"
	}`))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusCreated, w.Code)

	// Überprüfe, ob der Film in der Datenbank existiert
	var movie Movie
	result := db.First(&movie, 1)
	assert.Nil(t, result.Error)
	assert.Equal(t, "New Movie", movie.Title)
}

func TestCreateMovieInvalid(t *testing.T) {
	db := setupTestDB(t)
	router := setupRouter()

	router.POST("/movies", CreateMovie(db))

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/movies", bytes.NewBufferString(`{
		"title": "",
		"year": 2024
	}`))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestUpdateMovie(t *testing.T) {
	db := setupTestDB(t)
	router := setupRouter()

	// Füge Test-Daten hinzu
	testMovie := Movie{
		Title:       "Test Movie",
		Description: "A test movie",
		Year:        2024,
	}
	db.Create(&testMovie)

	router.PUT("/movies/:id", UpdateMovie(db))

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("PUT", "/movies/1", bytes.NewBufferString(`{
		"title": "Updated Movie",
		"year": 2024,
		"description": "An updated movie"
	}`))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	// Überprüfe, ob der Film aktualisiert wurde
	var movie Movie
	result := db.First(&movie, 1)
	assert.Nil(t, result.Error)
	assert.Equal(t, "Updated Movie", movie.Title)
}

func TestDeleteMovie(t *testing.T) {
	db := setupTestDB(t)
	router := setupRouter()

	// Füge Test-Daten hinzu
	testMovie := Movie{
		Title:       "Test Movie",
		Description: "A test movie",
		Year:        2024,
	}
	db.Create(&testMovie)

	router.DELETE("/movies/:id", DeleteMovie(db))

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("DELETE", "/movies/1", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	// Überprüfe, ob der Film gelöscht wurde
	var movie Movie
	result := db.First(&movie, 1)
	assert.Error(t, result.Error)
}

func TestUploadImage(t *testing.T) {
	db := setupTestDB(t)

	// Erstelle einen temporären Testordner
	tempDir, err := os.MkdirTemp("", "test-images")
	if err != nil {
		t.Fatal(err)
	}
	defer os.RemoveAll(tempDir)

	// Setze den Upload-Pfad
	os.Setenv("UPLOAD_PATH", tempDir)

	router := setupRouter()

	// Füge Test-Daten hinzu
	testMovie := Movie{
		Title:       "Test Movie",
		Description: "A test movie",
		Year:        2024,
	}
	db.Create(&testMovie)

	router.POST("/movies/:id/image", UploadImage(db))

	// Erstelle einen Test-Multipart-Request
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, err := writer.CreateFormFile("image", "test.jpg")
	if err != nil {
		t.Fatalf("Failed to create form file: %v", err)
	}
	_, err = part.Write([]byte("test image content"))
	if err != nil {
		t.Fatalf("Failed to write image content: %v", err)
	}
	err = writer.Close()
	assert.NoError(t, err)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/movies/1/image", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	// Überprüfe, ob der Bildpfad in der Datenbank aktualisiert wurde
	var movie Movie
	result := db.First(&movie, 1)
	assert.Nil(t, result.Error)
	assert.NotEmpty(t, movie.ImagePath)
}

func TestUpdateMovieNotFound(t *testing.T) {
	db := setupTestDB(t)
	router := setupRouter()

	router.PUT("/movies/:id", UpdateMovie(db))

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("PUT", "/movies/999", bytes.NewBufferString(`{
		"title": "Updated Movie",
		"year": 2024,
		"description": "An updated movie"
	}`))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

func TestUpdateMovieInvalidJSON(t *testing.T) {
	db := setupTestDB(t)
	router := setupRouter()

	// Füge Test-Daten hinzu
	testMovie := Movie{
		Title:       "Test Movie",
		Description: "A test movie",
		Year:        2024,
	}
	db.Create(&testMovie)

	router.PUT("/movies/:id", UpdateMovie(db))

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("PUT", "/movies/1", bytes.NewBufferString(`{
		invalid json
	}`))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestDeleteMovieNotFound(t *testing.T) {
	db := setupTestDB(t)
	router := setupRouter()

	router.DELETE("/movies/:id", DeleteMovie(db))

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("DELETE", "/movies/999", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

func TestUploadImageNotFound(t *testing.T) {
	db := setupTestDB(t)
	tempDir, err := os.MkdirTemp("", "test-images")
	if err != nil {
		t.Fatal(err)
	}
	defer os.RemoveAll(tempDir)
	os.Setenv("UPLOAD_PATH", tempDir)

	router := setupRouter()
	router.POST("/movies/:id/image", UploadImage(db))

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, err := writer.CreateFormFile("image", "test.jpg")
	if err != nil {
		t.Fatalf("Failed to create form file: %v", err)
	}
	_, err = part.Write([]byte("test image content"))
	if err != nil {
		t.Fatalf("Failed to write image content: %v", err)
	}
	writer.Close()

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/movies/999/image", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

func TestUploadImageNoFile(t *testing.T) {
	db := setupTestDB(t)
	tempDir, err := os.MkdirTemp("", "test-images")
	if err != nil {
		t.Fatal(err)
	}
	defer os.RemoveAll(tempDir)
	os.Setenv("UPLOAD_PATH", tempDir)

	router := setupRouter()
	testMovie := Movie{
		Title:       "Test Movie",
		Description: "A test movie",
		Year:        2024,
	}
	db.Create(&testMovie)

	router.POST("/movies/:id/image", UploadImage(db))

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/movies/1/image", nil)
	req.Header.Set("Content-Type", "multipart/form-data")
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestUploadImageInvalidUploadPath(t *testing.T) {
	db := setupTestDB(t)
	os.Setenv("UPLOAD_PATH", "/nicht/existierender/pfad")

	router := setupRouter()
	testMovie := Movie{
		Title:       "Test Movie",
		Description: "A test movie",
		Year:        2024,
	}
	db.Create(&testMovie)

	router.POST("/movies/:id/image", UploadImage(db))

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, err := writer.CreateFormFile("image", "test.jpg")
	if err != nil {
		t.Fatalf("Failed to create form file: %v", err)
	}
	_, err = part.Write([]byte("test image content"))
	if err != nil {
		t.Fatalf("Failed to write image content: %v", err)
	}
	writer.Close()

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/movies/1/image", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
}

func TestCreateMovieInvalidJSON(t *testing.T) {
	db := setupTestDB(t)
	router := setupRouter()

	router.POST("/movies", CreateMovie(db))

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/movies", bytes.NewBufferString(`{
		invalid json
	}`))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestCreateMovieMissingRequiredFields(t *testing.T) {
	db := setupTestDB(t)
	router := setupRouter()

	router.POST("/movies", CreateMovie(db))

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/movies", bytes.NewBufferString(`{
		"description": "A movie without title and year"
	}`))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestGetMoviesEmpty(t *testing.T) {
	db := setupTestDB(t)
	router := setupRouter()

	router.GET("/movies", GetMovies(db))

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/movies", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Equal(t, "[]", w.Body.String())
}

func TestUpdateMovieMissingRequiredFields(t *testing.T) {
	db := setupTestDB(t)
	router := setupRouter()

	testMovie := Movie{
		Title:       "Test Movie",
		Description: "A test movie",
		Year:        2024,
	}
	db.Create(&testMovie)

	router.PUT("/movies/:id", UpdateMovie(db))

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("PUT", "/movies/1", bytes.NewBufferString(`{
		"description": "Updated description without title and year"
	}`))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestGetImage(t *testing.T) {
	db := setupTestDB(t)
	tempDir, err := os.MkdirTemp("", "test-images")
	if err != nil {
		t.Fatal(err)
	}
	defer os.RemoveAll(tempDir)

	// Erstelle eine Testdatei
	testImagePath := filepath.Join(tempDir, "test.jpg")
	err = os.WriteFile(testImagePath, []byte("test image content"), 0644)
	if err != nil {
		t.Fatal(err)
	}

	router := setupRouter()
	testMovie := Movie{
		Title:       "Test Movie",
		Description: "A test movie",
		Year:        2024,
		ImagePath:   testImagePath,
	}
	db.Create(&testMovie)

	router.GET("/movies/:id/image", GetImage(db))

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/movies/1/image", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Equal(t, "test image content", w.Body.String())
}

func TestGetImageNotFound(t *testing.T) {
	db := setupTestDB(t)
	router := setupRouter()

	testMovie := Movie{
		Title:       "Test Movie",
		Description: "A test movie",
		Year:        2024,
	}
	db.Create(&testMovie)

	router.GET("/movies/:id/image", GetImage(db))

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/movies/1/image", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

func TestGetImageMovieNotFound(t *testing.T) {
	db := setupTestDB(t)
	router := setupRouter()

	router.GET("/movies/:id/image", GetImage(db))

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/movies/999/image", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

func TestGetImageFileNotFound(t *testing.T) {
	db := setupTestDB(t)
	router := setupRouter()

	testMovie := Movie{
		Title:       "Test Movie",
		Description: "A test movie",
		Year:        2024,
		ImagePath:   "/nicht/existierende/datei.jpg",
	}
	db.Create(&testMovie)

	router.GET("/movies/:id/image", GetImage(db))

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/movies/1/image", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

func TestDeleteImage(t *testing.T) {
	db := setupTestDB(t)
	tempDir, err := os.MkdirTemp("", "test-images")
	if err != nil {
		t.Fatal(err)
	}
	defer os.RemoveAll(tempDir)

	// Erstelle eine Testdatei
	testImagePath := filepath.Join(tempDir, "test.jpg")
	err = os.WriteFile(testImagePath, []byte("test image content"), 0644)
	if err != nil {
		t.Fatal(err)
	}

	router := setupRouter()
	testMovie := Movie{
		Title:       "Test Movie",
		Description: "A test movie",
		Year:        2024,
		ImagePath:   testImagePath,
	}
	db.Create(&testMovie)

	router.DELETE("/movies/:id/image", DeleteImage(db))

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("DELETE", "/movies/1/image", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	// Überprüfe, ob die Datei gelöscht wurde
	_, err = os.Stat(testImagePath)
	assert.True(t, os.IsNotExist(err))

	// Überprüfe, ob der ImagePath im Movie-Objekt zurückgesetzt wurde
	var updatedMovie Movie
	db.First(&updatedMovie, 1)
	assert.Empty(t, updatedMovie.ImagePath)
}

func TestDeleteImageNotFound(t *testing.T) {
	db := setupTestDB(t)
	router := setupRouter()

	testMovie := Movie{
		Title:       "Test Movie",
		Description: "A test movie",
		Year:        2024,
	}
	db.Create(&testMovie)

	router.DELETE("/movies/:id/image", DeleteImage(db))

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("DELETE", "/movies/1/image", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

func TestDeleteImageMovieNotFound(t *testing.T) {
	db := setupTestDB(t)
	router := setupRouter()

	router.DELETE("/movies/:id/image", DeleteImage(db))

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("DELETE", "/movies/999/image", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

func TestDeleteImageFileNotFound(t *testing.T) {
	db := setupTestDB(t)
	router := setupRouter()

	testMovie := Movie{
		Title:       "Test Movie",
		Description: "A test movie",
		Year:        2024,
		ImagePath:   "/nicht/existierende/datei.jpg",
	}
	db.Create(&testMovie)

	router.DELETE("/movies/:id/image", DeleteImage(db))

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("DELETE", "/movies/1/image", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestUploadImageValidFormats(t *testing.T) {
	db := setupTestDB(t)

	// Create a temporary directory for test images
	tmpDir, err := os.MkdirTemp("", "movie-images-*")
	if err != nil {
		t.Fatalf("Failed to create temporary directory: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	// Set the upload path to the temporary directory
	os.Setenv("UPLOAD_PATH", tmpDir)

	router := setupRouter()

	// Test data
	movie := Movie{
		Title:       "Test Movie",
		Description: "A test movie",
		Year:        2024,
		TMDBId:      "123",
	}
	db.Create(&movie)

	router.POST("/movies/:id/image", UploadImage(db))

	validFormats := []string{".jpg", ".jpeg", ".png", ".gif"}

	for _, ext := range validFormats {
		// Create a new multipart request
		body := &bytes.Buffer{}
		writer := multipart.NewWriter(body)
		part, err := writer.CreateFormFile("image", "test-image"+ext)
		if err != nil {
			t.Fatalf("Failed to create form file: %v", err)
		}

		// Write test image content
		_, err = part.Write([]byte("test image content"))
		if err != nil {
			t.Fatalf("Failed to write image content: %v", err)
		}

		err = writer.Close()
		if err != nil {
			t.Fatalf("Failed to close multipart writer: %v", err)
		}

		// Create request
		req := httptest.NewRequest("POST", "/movies/1/image", body)
		req.Header.Set("Content-Type", writer.FormDataContentType())

		// Create response recorder
		w := httptest.NewRecorder()

		// Call the handler
		router.ServeHTTP(w, req)

		// Check response
		if w.Code != http.StatusOK {
			t.Errorf("Expected status OK for %s, got %v", ext, w.Code)
		}
	}
}

func TestUploadImageInvalidFormat(t *testing.T) {
	db := setupTestDB(t)

	// Create a temporary directory for test images
	tmpDir, err := os.MkdirTemp("", "movie-images-*")
	if err != nil {
		t.Fatalf("Failed to create temporary directory: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	// Set the upload path to the temporary directory
	os.Setenv("UPLOAD_PATH", tmpDir)

	router := setupRouter()

	// Test data
	movie := Movie{
		Title:       "Test Movie",
		Description: "A test movie",
		Year:        2024,
		TMDBId:      "123",
	}
	db.Create(&movie)

	router.POST("/movies/:id/image", UploadImage(db))

	// Create a new multipart request
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, err := writer.CreateFormFile("image", "test.txt")
	if err != nil {
		t.Fatalf("Failed to create form file: %v", err)
	}

	// Write test content
	_, err = part.Write([]byte("test content"))
	if err != nil {
		t.Fatalf("Failed to write content: %v", err)
	}

	err = writer.Close()
	if err != nil {
		t.Fatalf("Failed to close multipart writer: %v", err)
	}

	// Create request
	req := httptest.NewRequest("POST", "/movies/1/image", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())

	// Create response recorder
	w := httptest.NewRecorder()

	// Call the handler
	router.ServeHTTP(w, req)

	// Check response
	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status BadRequest, got %v", w.Code)
	}
}

func TestUploadImageLargeFile(t *testing.T) {
	db := setupTestDB(t)

	// Create a temporary directory for test images
	tmpDir, err := os.MkdirTemp("", "movie-images-*")
	if err != nil {
		t.Fatalf("Failed to create temporary directory: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	// Set the upload path to the temporary directory
	os.Setenv("UPLOAD_PATH", tmpDir)

	router := setupRouter()

	// Test data
	movie := Movie{
		Title:       "Test Movie",
		Description: "A test movie",
		Year:        2024,
		TMDBId:      "123",
	}
	db.Create(&movie)

	router.POST("/movies/:id/image", UploadImage(db))

	// Create large content (6MB)
	largeContent := make([]byte, 6*1024*1024)
	_, err = rand.Read(largeContent)
	if err != nil {
		t.Fatalf("Failed to generate random content: %v", err)
	}

	// Create a new multipart request
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, err := writer.CreateFormFile("image", "large.jpg")
	if err != nil {
		t.Fatalf("Failed to create form file: %v", err)
	}

	// Write large content
	if _, err := part.Write(largeContent); err != nil {
		t.Fatalf("Failed to write large content: %v", err)
	}

	err = writer.Close()
	if err != nil {
		t.Fatalf("Failed to close multipart writer: %v", err)
	}

	// Create request
	req := httptest.NewRequest("POST", "/movies/1/image", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())

	// Create response recorder
	w := httptest.NewRecorder()

	// Call the handler
	router.ServeHTTP(w, req)

	// Check response
	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status BadRequest for large file, got %v", w.Code)
	}
}

func TestUploadImageEmptyFile(t *testing.T) {
	db := setupTestDB(t)

	// Erstelle einen temporären Testordner
	tempDir, err := os.MkdirTemp("", "test-images")
	if err != nil {
		t.Fatal(err)
	}
	defer os.RemoveAll(tempDir)

	// Setze den Upload-Pfad
	os.Setenv("UPLOAD_PATH", tempDir)

	router := setupRouter()

	// Füge Test-Daten hinzu
	testMovie := Movie{
		Title:       "Test Movie",
		Description: "A test movie",
		Year:        2024,
	}
	db.Create(&testMovie)

	router.POST("/movies/:id/image", UploadImage(db))

	// Erstelle einen Test-Multipart-Request mit leerem File
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	_, err = writer.CreateFormFile("image", "empty.jpg")
	assert.NoError(t, err)
	err = writer.Close()
	assert.NoError(t, err)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/movies/1/image", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestCreateMovieDuplicateTMDBId(t *testing.T) {
	db := setupTestDB(t)
	router := setupRouter()

	// Erstelle ersten Film mit TMDB-ID
	testMovie := Movie{
		Title:       "Test Movie",
		Description: "A test movie",
		Year:        2024,
		TMDBId:      "12345",
	}
	db.Create(&testMovie)

	router.POST("/movies", CreateMovie(db))

	// Versuche, einen zweiten Film mit der gleichen TMDB-ID zu erstellen
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/movies", bytes.NewBufferString(`{
		"title": "Another Movie",
		"year": 2024,
		"description": "Another movie",
		"tmdb_id": "12345"
	}`))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusConflict, w.Code)
}

func TestUpdateMovieOptionalFields(t *testing.T) {
	db := setupTestDB(t)
	router := setupRouter()

	// Erstelle Test-Film
	testMovie := Movie{
		Title:       "Test Movie",
		Description: "A test movie",
		Year:        2024,
		PosterPath:  "original_poster.jpg",
		TMDBId:      "12345",
		Overview:    "Original overview",
		ReleaseDate: "2024-01-01",
		Rating:      4.5,
	}
	db.Create(&testMovie)

	router.PUT("/movies/:id", UpdateMovie(db))

	// Aktualisiere nur einige optionale Felder
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("PUT", "/movies/1", bytes.NewBufferString(`{
		"title": "Updated Movie",
		"year": 2025,
		"poster_path": "new_poster.jpg",
		"rating": 4.8
	}`))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	// Überprüfe, ob die Felder korrekt aktualisiert wurden
	var updatedMovie Movie
	db.First(&updatedMovie, 1)
	assert.Equal(t, "Updated Movie", updatedMovie.Title)
	assert.Equal(t, 2025, updatedMovie.Year)
	assert.Equal(t, "new_poster.jpg", updatedMovie.PosterPath)
	assert.Equal(t, float32(4.8), updatedMovie.Rating)
	// Überprüfe, ob die nicht aktualisierten Felder unverändert blieben
	assert.Equal(t, "12345", updatedMovie.TMDBId)
	assert.Equal(t, "Original overview", updatedMovie.Overview)
	assert.Equal(t, "2024-01-01", updatedMovie.ReleaseDate)
}

func TestGetMoviesInternalError(t *testing.T) {
	db := setupTestDB(t)
	router := setupRouter()

	// Schließe die Datenbankverbindung, um einen Fehler zu erzeugen
	sqlDB, err := db.DB()
	if err != nil {
		t.Fatal(err)
	}
	sqlDB.Close()

	router.GET("/movies", GetMovies(db))

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/movies", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
}

func TestUpdateMovieInternalError(t *testing.T) {
	db := setupTestDB(t)

	// Test data
	movie := Movie{
		Title:       "Test Movie",
		Description: "A test movie",
		Year:        2024,
		TMDBId:      "123",
	}
	db.Create(&movie)

	router := setupRouter()
	router.PUT("/movies/:id", UpdateMovie(db))

	// Schließe die Datenbankverbindung nach dem Erstellen des Films
	sqlDB, err := db.DB()
	if err != nil {
		t.Fatalf("Failed to get database instance: %v", err)
	}
	sqlDB.Close()

	// Create request
	updatedMovie := Movie{
		Title: "Updated Movie",
		Year:  2025,
	}
	body, _ := json.Marshal(updatedMovie)
	req := httptest.NewRequest("PUT", "/movies/1", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	// Create response recorder
	w := httptest.NewRecorder()

	// Call the handler
	router.ServeHTTP(w, req)

	// Check response
	if w.Code != http.StatusInternalServerError {
		t.Errorf("Expected status InternalServerError, got %v", w.Code)
	}
}

func TestDeleteMovieInternalError(t *testing.T) {
	db := setupTestDB(t)

	// Test data
	movie := Movie{
		Title:       "Test Movie",
		Description: "A test movie",
		Year:        2024,
		TMDBId:      "123",
	}
	db.Create(&movie)

	router := setupRouter()
	router.DELETE("/movies/:id", DeleteMovie(db))

	// Schließe die Datenbankverbindung nach dem Erstellen des Films
	sqlDB, err := db.DB()
	if err != nil {
		t.Fatalf("Failed to get database instance: %v", err)
	}
	sqlDB.Close()

	// Create request
	req := httptest.NewRequest("DELETE", "/movies/1", nil)

	// Create response recorder
	w := httptest.NewRecorder()

	// Call the handler
	router.ServeHTTP(w, req)

	// Check response
	if w.Code != http.StatusInternalServerError {
		t.Errorf("Expected status InternalServerError, got %v", w.Code)
	}
}

func TestUploadImageSaveError(t *testing.T) {
	db := setupTestDB(t)

	// Erstelle einen temporären Testordner
	tempDir, err := os.MkdirTemp("", "test-images")
	if err != nil {
		t.Fatal(err)
	}
	defer os.RemoveAll(tempDir)

	// Setze den Upload-Pfad
	os.Setenv("UPLOAD_PATH", tempDir)

	// Mache das Verzeichnis schreibgeschützt
	err = os.Chmod(tempDir, 0444)
	assert.NoError(t, err)
	defer func() {
		err = os.Chmod(tempDir, 0755)
		assert.NoError(t, err)
	}()

	router := setupRouter()

	// Füge Test-Daten hinzu
	testMovie := Movie{
		Title:       "Test Movie",
		Description: "A test movie",
		Year:        2024,
	}
	db.Create(&testMovie)

	router.POST("/movies/:id/image", UploadImage(db))

	// Erstelle einen Test-Multipart-Request
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, err := writer.CreateFormFile("image", "test.jpg")
	if err != nil {
		t.Fatalf("Failed to create form file: %v", err)
	}
	_, err = part.Write([]byte("test image content"))
	if err != nil {
		t.Fatalf("Failed to write image content: %v", err)
	}
	err = writer.Close()
	assert.NoError(t, err)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/movies/1/image", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
}

func TestUploadImageDBUpdateError(t *testing.T) {
	db := setupTestDB(t)
	tempDir, err := os.MkdirTemp("", "test-images")
	if err != nil {
		t.Fatal(err)
	}
	defer os.RemoveAll(tempDir)
	os.Setenv("UPLOAD_PATH", tempDir)

	router := setupRouter()
	testMovie := Movie{
		Title:       "Test Movie",
		Description: "A test movie",
		Year:        2024,
	}
	db.Create(&testMovie)

	// Hole die Datenbankverbindung
	sqlDB, err := db.DB()
	if err != nil {
		t.Fatal(err)
	}

	router.POST("/movies/:id/image", UploadImage(db))

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, err := writer.CreateFormFile("image", "test.jpg")
	if err != nil {
		t.Fatalf("Failed to create form file: %v", err)
	}
	_, err = part.Write([]byte("test image content"))
	if err != nil {
		t.Fatalf("Failed to write image content: %v", err)
	}
	writer.Close()

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/movies/1/image", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())

	// Schließe die Verbindung direkt vor dem Request
	sqlDB.Close()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
}
