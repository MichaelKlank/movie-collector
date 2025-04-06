package repositories

import (
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
	return r.db.Delete(&models.Movie{}, id).Error
}

func (r *MovieRepository) GetByTMDBID(tmdbID string) (models.Movie, error) {
	var movie models.Movie
	result := r.db.Where("tmdb_id = ?", tmdbID).First(&movie)
	return movie, result.Error
}
