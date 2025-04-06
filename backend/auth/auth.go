package auth

import (
	"errors"
	"net/http"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// Claims represents the JWT claims structure
type Claims struct {
	UserID   uint   `json:"user_id"`
	Username string `json:"username"`
	jwt.RegisteredClaims
}

// GenerateToken generates a new JWT token
func GenerateToken(secret string, userID uint, username string, expiration time.Duration) (string, error) {
	claims := &Claims{
		UserID:   userID,
		Username: username,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(expiration)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

// ValidateToken validates a JWT token and returns its claims
func ValidateToken(secret string, tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		return []byte(secret), nil
	})
	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		return claims, nil
	}

	return nil, errors.New("invalid token")
}

// AuthMiddleware creates a middleware function that validates JWT tokens
func AuthMiddleware(secret string) func(*http.Request) (*Claims, error) {
	return func(r *http.Request) (*Claims, error) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			return nil, errors.New("authorization header is required")
		}

		if len(authHeader) <= len("Bearer ") || authHeader[:len("Bearer ")] != "Bearer " {
			return nil, errors.New("invalid authorization header format")
		}

		tokenString := authHeader[len("Bearer "):]
		return ValidateToken(secret, tokenString)
	}
}
