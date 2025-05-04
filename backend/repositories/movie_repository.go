package repositories

import (
	"strings"

	"github.com/MichaelKlank/movie-collector/backend/models"
	"gorm.io/gorm"
)

type MovieRepository struct {
	db *gorm.DB
}

func NewMovieRepository(db *gorm.DB) *MovieRepository {
	return &MovieRepository{db: db}
}

func (r *MovieRepository) GetAll() ([]models.Movie, error) {
	var movies []models.Movie
	result := r.db.Find(&movies)
	return movies, result.Error
}

// GetPaginated ruft eine paginierte Liste von Filmen ab
// offset: Anzahl der zu überspringenden Einträge
// limit: Maximale Anzahl der zurückzugebenden Einträge
// Gibt die Filmliste, die Gesamtanzahl der Filme und einen etwaigen Fehler zurück
func (r *MovieRepository) GetPaginated(offset, limit int) ([]models.Movie, int64, error) {
	var movies []models.Movie
	var total int64

	// Zähle die Gesamtanzahl der Filme
	if err := r.db.Model(&models.Movie{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Hole die paginierten Daten
	result := r.db.Offset(offset).Limit(limit).Find(&movies)
	if result.Error != nil {
		return nil, 0, result.Error
	}

	return movies, total, nil
}

// SearchMovies sucht Filme basierend auf dem übergebenen Suchbegriff
// Die Suche wird über mehrere Felder durchgeführt: Titel, Beschreibung, Jahr
// query: Der Suchbegriff
// offset: Anzahl der zu überspringenden Einträge
// limit: Maximale Anzahl der zurückzugebenden Einträge
// Gibt die gefundenen Filme, die Gesamtanzahl der Treffer und einen etwaigen Fehler zurück
func (r *MovieRepository) SearchMovies(query string, offset, limit int) ([]models.Movie, int64, error) {
	var movies []models.Movie
	var total int64

	// Bereite den Suchbegriff für das LIKE-Statement vor
	searchTerm := "%" + strings.ToLower(query) + "%"

	// Suche in mehreren Feldern
	searchQuery := r.db.Model(&models.Movie{}).Where(
		"LOWER(title) LIKE ? OR LOWER(description) LIKE ? OR LOWER(overview) LIKE ? OR CAST(year as TEXT) LIKE ?",
		searchTerm, searchTerm, searchTerm, searchTerm,
	)

	// Zähle die Gesamtanzahl der Treffer
	if err := searchQuery.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Führe die Suche mit Paginierung durch
	result := searchQuery.Offset(offset).Limit(limit).Find(&movies)
	if result.Error != nil {
		return nil, 0, result.Error
	}

	return movies, total, nil
}

func (r *MovieRepository) GetByID(id uint) (models.Movie, error) {
	var movie models.Movie
	result := r.db.First(&movie, id)
	return movie, result.Error
}

func (r *MovieRepository) Create(movie *models.Movie) error {
	return r.db.Create(movie).Error
}

func (r *MovieRepository) Update(movie *models.Movie) error {
	return r.db.Save(movie).Error
}

func (r *MovieRepository) Delete(id uint) error {
	result := r.db.Delete(&models.Movie{}, id)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

func (r *MovieRepository) GetByTMDBID(tmdbID string) (models.Movie, error) {
	var movie models.Movie
	result := r.db.Where("tmdb_id = ?", tmdbID).First(&movie)
	return movie, result.Error
}
