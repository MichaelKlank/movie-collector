package tests

import (
	"net/http"
	"testing"
	"time"

	"github.com/MichaelKlank/movie-collector/backend/auth"
	"github.com/stretchr/testify/assert"
)

func TestGenerateAndValidateToken(t *testing.T) {
	// Setup
	secret := "test-secret"
	userID := uint(1)
	username := "testuser"
	expiration := 24 * time.Hour

	// Generate token
	token, err := auth.GenerateToken(secret, userID, username, expiration)
	assert.NoError(t, err)
	assert.NotEmpty(t, token)

	// Validate token
	claims, err := auth.ValidateToken(secret, token)
	assert.NoError(t, err)
	assert.NotNil(t, claims)
	assert.Equal(t, userID, claims.UserID)
	assert.Equal(t, username, claims.Username)
}

func TestAuthMiddleware(t *testing.T) {
	// Setup
	secret := "test-secret"
	userID := uint(1)
	username := "testuser"
	expiration := 24 * time.Hour

	// Generate valid token
	token, err := auth.GenerateToken(secret, userID, username, expiration)
	assert.NoError(t, err)

	// Test valid token
	req := &http.Request{
		Header: http.Header{
			"Authorization": []string{"Bearer " + token},
		},
	}
	claims, err := auth.AuthMiddleware(secret)(req)
	assert.NoError(t, err)
	assert.NotNil(t, claims)
	assert.Equal(t, userID, claims.UserID)
	assert.Equal(t, username, claims.Username)

	// Test missing header
	req = &http.Request{}
	claims, err = auth.AuthMiddleware(secret)(req)
	assert.Error(t, err)
	assert.Nil(t, claims)

	// Test invalid header format
	req = &http.Request{
		Header: http.Header{
			"Authorization": []string{"Invalid " + token},
		},
	}
	claims, err = auth.AuthMiddleware(secret)(req)
	assert.Error(t, err)
	assert.Nil(t, claims)

	// Test invalid token
	req = &http.Request{
		Header: http.Header{
			"Authorization": []string{"Bearer invalid-token"},
		},
	}
	claims, err = auth.AuthMiddleware(secret)(req)
	assert.Error(t, err)
	assert.Nil(t, claims)
}
