package services

import (
	"errors"

	"github.com/MichaelKlank/movie-collector/backend/models"
	"github.com/MichaelKlank/movie-collector/backend/repositories"
)

type MovieService struct {
	repo *repositories.MovieRepository
}

func NewMovieService(repo *repositories.MovieRepository) *MovieService {
	return &MovieService{repo: repo}
}

func (s *MovieService) GetAllMovies() ([]models.Movie, error) {
	return s.repo.GetAll()
}

func (s *MovieService) GetMovieByID(id uint) (models.Movie, error) {
	return s.repo.GetByID(id)
}

func (s *MovieService) GetMovieByTMDBID(tmdbID string) (models.Movie, error) {
	return s.repo.GetByTMDBID(tmdbID)
}

func (s *MovieService) CreateMovie(movie *models.Movie) error {
	if movie.TMDBId != "" {
		_, err := s.repo.GetByTMDBID(movie.TMDBId)
		if err == nil {
			return errors.New("Ein Film mit dieser TMDB-ID existiert bereits")
		}
	}
	return s.repo.Create(movie)
}

func (s *MovieService) UpdateMovie(movie *models.Movie) error {
	_, err := s.repo.GetByID(movie.ID)
	if err != nil {
		return errors.New("Movie not found")
	}
	return s.repo.Update(movie)
}

func (s *MovieService) DeleteMovie(id uint) error {
	_, err := s.repo.GetByID(id)
	if err != nil {
		return errors.New("Movie not found")
	}
	return s.repo.Delete(id)
}
