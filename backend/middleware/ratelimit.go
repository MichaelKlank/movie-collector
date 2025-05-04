package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// RateLimiter implementiert eine einfache Rate-Limiting-Middleware für Gin
type RateLimiter struct {
	// Maximale Anzahl von Anfragen pro Zeitfenster
	maxRequests int
	// Dauer des Zeitfensters
	window time.Duration
	// Map um Client-IPs und ihre Anfragezähler zu verfolgen
	clients map[string][]time.Time
	// Mutex für Thread-Sicherheit
	mu sync.Mutex
}

// NewRateLimiter erstellt einen neuen RateLimiter
// maxRequests: Maximale Anzahl von Anfragen pro Zeitfenster
// window: Dauer des Zeitfensters (z.B. time.Minute)
func NewRateLimiter(maxRequests int, window time.Duration) *RateLimiter {
	return &RateLimiter{
		maxRequests: maxRequests,
		window:      window,
		clients:     make(map[string][]time.Time),
	}
}

// Middleware gibt eine Gin-Middleware zurück, die Rate-Limiting implementiert
func (rl *RateLimiter) Middleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		clientIP := c.ClientIP()

		rl.mu.Lock()
		defer rl.mu.Unlock()

		now := time.Now()

		// Lösche veraltete Anfragezeitstempel
		newRequests := []time.Time{}
		for _, timestamp := range rl.clients[clientIP] {
			if now.Sub(timestamp) <= rl.window {
				newRequests = append(newRequests, timestamp)
			}
		}

		rl.clients[clientIP] = newRequests

		// Überprüfe Limit
		if len(rl.clients[clientIP]) >= rl.maxRequests {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error": "Rate limit exceeded. Try again later.",
			})
			c.Abort()
			return
		}

		// Füge aktuelle Anfrage hinzu
		rl.clients[clientIP] = append(rl.clients[clientIP], now)

		c.Next()
	}
}

// CleanupTask startet eine periodische Bereinigung des Maps, um Speicherlecks zu vermeiden
func (rl *RateLimiter) CleanupTask(interval time.Duration) {
	ticker := time.NewTicker(interval)
	go func() {
		for range ticker.C {
			rl.mu.Lock()
			now := time.Now()
			for ip, requests := range rl.clients {
				// Behalte nur Anfragen innerhalb des Zeitfensters
				var validRequests []time.Time
				for _, timestamp := range requests {
					if now.Sub(timestamp) <= rl.window {
						validRequests = append(validRequests, timestamp)
					}
				}

				if len(validRequests) > 0 {
					rl.clients[ip] = validRequests
				} else {
					delete(rl.clients, ip)
				}
			}
			rl.mu.Unlock()
		}
	}()
}
