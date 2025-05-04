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

// GetMoviesPaginated ruft eine paginierte Liste von Filmen ab
// offset: Anzahl der zu überspringenden Einträge
// limit: Maximale Anzahl der zurückzugebenden Einträge
// Gibt die Filmliste, die Gesamtanzahl der Filme und einen etwaigen Fehler zurück
func (s *MovieService) GetMoviesPaginated(offset, limit int) ([]models.Movie, int64, error) {
	return s.repo.GetPaginated(offset, limit)
}

// SearchMovies sucht Filme basierend auf dem übergebenen Suchbegriff
// query: Der Suchbegriff
// offset: Anzahl der zu überspringenden Einträge
// limit: Maximale Anzahl der zurückzugebenden Einträge
// Gibt die gefundenen Filme, die Gesamtanzahl der Treffer und einen etwaigen Fehler zurück
func (s *MovieService) SearchMovies(query string, offset, limit int) ([]models.Movie, int64, error) {
	if query == "" {
		return s.GetMoviesPaginated(offset, limit)
	}
	return s.repo.SearchMovies(query, offset, limit)
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
	movie, err := s.repo.GetByID(id)
	if err != nil {
		return errors.New("Movie not found")
	}
	return s.repo.Delete(movie.ID)
}
