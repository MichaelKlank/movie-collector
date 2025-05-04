package handlers

import (
	"net/http"

	"github.com/MichaelKlank/movie-collector/backend/version"
	"github.com/gin-gonic/gin"
)

// VersionHandler behandelt Anfragen zur API-Version
type VersionHandler struct{}

// NewVersionHandler erstellt einen neuen VersionHandler
func NewVersionHandler() *VersionHandler {
	return &VersionHandler{}
}

// GetVersion gibt die aktuelle Version der API zurück
// @Summary Version der API abrufen
// @Description Gibt die aktuelle Version der API zurück
// @Tags version
// @Produce json
// @Success 200 {object} map[string]string
// @Router /version [get]
func (h *VersionHandler) GetVersion(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"version": version.Version(),
	})
}
