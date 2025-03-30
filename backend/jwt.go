package main

import (
	"fmt"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type JWTConfig struct {
    Secret            []byte
    Expiration        time.Duration
    RefreshExpiration time.Duration
    CookieSecure      bool
    CookieHttpOnly    bool
    CookieSameSite    string
}

func NewJWTConfig() (*JWTConfig, error) {
    secret := os.Getenv("JWT_SECRET")
    if secret == "" {
        return nil, fmt.Errorf("JWT_SECRET environment variable is not set")
    }

    expiration, err := time.ParseDuration(os.Getenv("JWT_EXPIRATION"))
    if err != nil {
        return nil, fmt.Errorf("invalid JWT_EXPIRATION: %v", err)
    }

    refreshExpiration, err := time.ParseDuration(os.Getenv("JWT_REFRESH_EXPIRATION"))
    if err != nil {
        return nil, fmt.Errorf("invalid JWT_REFRESH_EXPIRATION: %v", err)
    }

    return &JWTConfig{
        Secret:            []byte(secret),
        Expiration:        expiration,
        RefreshExpiration: refreshExpiration,
        CookieSecure:      os.Getenv("JWT_COOKIE_SECURE") == "true",
        CookieHttpOnly:    os.Getenv("JWT_COOKIE_HTTPONLY") == "true",
        CookieSameSite:    os.Getenv("JWT_COOKIE_SAMESITE"),
    }, nil
}

func (c *JWTConfig) GenerateToken(userID uint) (string, error) {
    token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
        "user_id": userID,
        "exp":     time.Now().Add(c.Expiration).Unix(),
        "iat":     time.Now().Unix(),
    })

    return token.SignedString(c.Secret)
}

func (c *JWTConfig) GenerateRefreshToken(userID uint) (string, error) {
    token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
        "user_id": userID,
        "exp":     time.Now().Add(c.RefreshExpiration).Unix(),
        "iat":     time.Now().Unix(),
        "type":    "refresh",
    })

    return token.SignedString(c.Secret)
}

func (c *JWTConfig) ValidateToken(tokenString string) (*jwt.Token, error) {
    return jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
        if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
            return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
        }
        return c.Secret, nil
    })
} 