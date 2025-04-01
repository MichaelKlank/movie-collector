package tests

import (
	"os"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/klank-cnv/go-test/backend/auth"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestJWTConfig(t *testing.T) {
	// Setup test environment variables
	os.Setenv("JWT_SECRET", "test-secret-key")
	os.Setenv("JWT_EXPIRATION", "1h")
	os.Setenv("JWT_REFRESH_EXPIRATION", "24h")
	os.Setenv("JWT_COOKIE_SECURE", "true")
	os.Setenv("JWT_COOKIE_HTTPONLY", "true")
	os.Setenv("JWT_COOKIE_SAMESITE", "Lax")

	t.Run("NewJWTConfig", func(t *testing.T) {
		config, err := auth.NewJWTConfig()
		require.NoError(t, err)
		assert.NotNil(t, config)
		assert.Equal(t, []byte("test-secret-key"), config.Secret)
		assert.Equal(t, 1*time.Hour, config.Expiration)
		assert.Equal(t, 24*time.Hour, config.RefreshExpiration)
		assert.True(t, config.CookieSecure)
		assert.True(t, config.CookieHttpOnly)
		assert.Equal(t, "Lax", config.CookieSameSite)
	})

	t.Run("NewJWTConfig with missing secret", func(t *testing.T) {
		os.Unsetenv("JWT_SECRET")
		config, err := auth.NewJWTConfig()
		assert.Error(t, err)
		assert.Nil(t, config)
		assert.Contains(t, err.Error(), "JWT_SECRET environment variable is not set")
		// Restore for other tests
		os.Setenv("JWT_SECRET", "test-secret-key")
	})

	t.Run("NewJWTConfig with invalid expiration", func(t *testing.T) {
		originalExp := os.Getenv("JWT_EXPIRATION")
		os.Setenv("JWT_EXPIRATION", "invalid")
		config, err := auth.NewJWTConfig()
		assert.Error(t, err)
		assert.Nil(t, config)
		assert.Contains(t, err.Error(), "invalid JWT_EXPIRATION")
		// Restore for other tests
		os.Setenv("JWT_EXPIRATION", originalExp)
	})

	t.Run("Token Generation and Validation", func(t *testing.T) {
		config, err := auth.NewJWTConfig()
		require.NoError(t, err)

		// Test token generation
		token, err := config.GenerateToken(123)
		require.NoError(t, err)
		assert.NotEmpty(t, token)

		// Test token validation
		parsedToken, err := config.ValidateToken(token)
		require.NoError(t, err)
		assert.True(t, parsedToken.Valid)

		// Verify claims
		claims, ok := parsedToken.Claims.(jwt.MapClaims)
		require.True(t, ok)
		assert.Equal(t, float64(123), claims["user_id"])
		
		// Verify expiration
		exp, ok := claims["exp"].(float64)
		require.True(t, ok)
		assert.Greater(t, exp, float64(time.Now().Unix()))
		assert.LessOrEqual(t, exp, float64(time.Now().Add(config.Expiration).Unix()))
	})

	t.Run("Refresh Token Generation and Validation", func(t *testing.T) {
		config, err := auth.NewJWTConfig()
		require.NoError(t, err)

		// Test refresh token generation
		token, err := config.GenerateRefreshToken(123)
		require.NoError(t, err)
		assert.NotEmpty(t, token)

		// Test token validation
		parsedToken, err := config.ValidateToken(token)
		require.NoError(t, err)
		assert.True(t, parsedToken.Valid)

		// Verify claims
		claims, ok := parsedToken.Claims.(jwt.MapClaims)
		require.True(t, ok)
		assert.Equal(t, float64(123), claims["user_id"])
		assert.Equal(t, "refresh", claims["type"])
		
		// Verify expiration
		exp, ok := claims["exp"].(float64)
		require.True(t, ok)
		assert.Greater(t, exp, float64(time.Now().Unix()))
		assert.LessOrEqual(t, exp, float64(time.Now().Add(config.RefreshExpiration).Unix()))
	})

	t.Run("Invalid Token Validation", func(t *testing.T) {
		config, err := auth.NewJWTConfig()
		require.NoError(t, err)

		// Test invalid token
		_, err = config.ValidateToken("invalid-token")
		assert.Error(t, err)

		// Test token with wrong signing method
		// Erstelle einen Token-String mit falscher Signaturmethode
		tokenString := "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxMjMsImV4cCI6MTcxMTYzNjk2MX0.invalid"
		_, err = config.ValidateToken(tokenString)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "unexpected signing method")
	})
} 