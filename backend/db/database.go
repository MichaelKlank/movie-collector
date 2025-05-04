package db

import (
	"log"
	"os"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

func InitDB() error {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("DATABASE_URL environment variable is not set")
	}

	var err error
	DB, err = gorm.Open(postgres.Open(dbURL), &gorm.Config{})
	if err != nil {
		return err
	}

	// Konfiguriere Connection Pooling
	sqlDB, err := DB.DB()
	if err != nil {
		return err
	}

	// Maximale Anzahl offener Verbindungen
	maxOpenConns := 100
	sqlDB.SetMaxOpenConns(maxOpenConns)

	// Maximale Anzahl inaktiver Verbindungen
	maxIdleConns := 10
	sqlDB.SetMaxIdleConns(maxIdleConns)

	// Maximale Lebensdauer einer Verbindung
	sqlDB.SetConnMaxLifetime(time.Hour)

	log.Printf("Datenbankverbindung konfiguriert mit: Max. offene Verbindungen: %d, Max. inaktive Verbindungen: %d",
		maxOpenConns, maxIdleConns)

	return nil
}

func GetDB() *gorm.DB {
	return DB
}
