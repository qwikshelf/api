package config

import (
	"fmt"
	"os"
	"strconv"
	"time"
)

// Config holds all configuration for the application
type Config struct {
	App      AppConfig
	Database DatabaseConfig
	JWT      JWTConfig
	Log      LogConfig
}

// AppConfig holds application-specific configuration
type AppConfig struct {
	Name  string
	Env   string
	Port  int
	Debug bool
}

// DatabaseConfig holds database configuration
type DatabaseConfig struct {
	Host               string
	Port               int
	Name               string
	User               string
	Password           string
	SSLMode            string
	MaxConnections     int
	MaxIdleConnections int
	MaxLifetime        time.Duration
}

// JWTConfig holds JWT configuration
type JWTConfig struct {
	Secret      string
	ExpiryHours int
}

// LogConfig holds logging configuration
type LogConfig struct {
	Level  string
	Format string
	File   string
}

// Load reads configuration from environment variables
func Load() (*Config, error) {
	print(getEnv("DB_HOST", "localhost"))
	cfg := &Config{
		App: AppConfig{
			Name:  getEnv("APP_NAME", "qwikshelf-api"),
			Env:   getEnv("APP_ENV", "development"),
			Port:  getEnvAsInt("APP_PORT", 8080),
			Debug: getEnvAsBool("APP_DEBUG", true),
		},
		Database: DatabaseConfig{
			Host:               getEnv("DB_HOST", "localhost"),
			Port:               getEnvAsInt("DB_PORT", 5432),
			Name:               getEnv("DB_NAME", "api"),
			User:               getEnv("DB_USER", "postgres"),
			Password:           getEnv("DB_PASSWORD", "postgres"),
			SSLMode:            getEnv("DB_SSL_MODE", "disable"),
			MaxConnections:     getEnvAsInt("DB_MAX_CONNECTIONS", 25),
			MaxIdleConnections: getEnvAsInt("DB_MAX_IDLE_CONNECTIONS", 5),
			MaxLifetime:        time.Duration(getEnvAsInt("DB_MAX_LIFETIME_MINUTES", 5)) * time.Minute,
		},
		JWT: JWTConfig{
			Secret:      getEnv("JWT_SECRET", "change-me-in-production"),
			ExpiryHours: getEnvAsInt("JWT_EXPIRY_HOURS", 24),
		},
		Log: LogConfig{
			Level:  getEnv("LOG_LEVEL", "debug"),
			Format: getEnv("LOG_FORMAT", "json"),
			File:   getEnv("LOG_FILE", "logs/app.log"),
		},
	}

	if err := cfg.Validate(); err != nil {
		return nil, err
	}

	return cfg, nil
}

// Validate checks if the configuration is valid
func (c *Config) Validate() error {
	if c.JWT.Secret == "change-me-in-production" && c.App.Env == "production" {
		return fmt.Errorf("JWT_SECRET must be set in production")
	}
	return nil
}

// DatabaseDSN returns the PostgreSQL connection string
func (c *DatabaseConfig) DSN() string {
	return fmt.Sprintf(
		"host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		c.Host, c.Port, c.User, c.Password, c.Name, c.SSLMode,
	)
}

// DatabaseURL returns the PostgreSQL connection URL
func (c *DatabaseConfig) URL() string {
	return fmt.Sprintf(
		"postgres://%s:%s@%s:%d/%s?sslmode=%s",
		c.User, c.Password, c.Host, c.Port, c.Name, c.SSLMode,
	)
}

// Helper functions
func getEnv(key, defaultValue string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return defaultValue
}

func getEnvAsInt(key string, defaultValue int) int {
	valueStr := getEnv(key, "")
	if value, err := strconv.Atoi(valueStr); err == nil {
		return value
	}
	return defaultValue
}

func getEnvAsBool(key string, defaultValue bool) bool {
	valueStr := getEnv(key, "")
	if value, err := strconv.ParseBool(valueStr); err == nil {
		return value
	}
	return defaultValue
}
