package main

import (
	"log"

	"github.com/joho/godotenv"

	"github.com/qwikshelf/api/internal/app"
	"github.com/qwikshelf/api/internal/config"
	"github.com/qwikshelf/api/pkg/logger"

	_ "github.com/qwikshelf/api/docs"

	"github.com/gin-gonic/gin"
)

// @title           QwikShelf API
// @version         1.0
// @description     Inventory management system API for QwikShelf
// @termsOfService  http://swagger.io/terms/

// @contact.name   QwikShelf Support
// @contact.email  support@qwikshelf.local

// @license.name  MIT
// @license.url   https://opensource.org/licenses/MIT

// @host      localhost:8080
// @BasePath  /api/v1

// @securityDefinitions.apikey  BearerAuth
// @in                          header
// @name                        Authorization
// @description                 Enter your JWT token with the `Bearer ` prefix, e.g. `Bearer eyJhbGci...`

func main() {
	// Load .env file in development
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	// Initialize structured logger
	pretty := cfg.App.Env != "production"
	logger.Init(cfg.Log.Level, cfg.Log.File, pretty)
	logger.Info().Str("env", cfg.App.Env).Str("log_file", cfg.Log.File).Msg("Logger initialized")

	// Set Gin mode based on environment
	if cfg.App.Env == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	// Initialize and run the application
	application, err := app.NewApp(cfg)
	if err != nil {
		log.Fatalf("Failed to initialize application: %v", err)
	}

	if err := application.Run(); err != nil {
		log.Fatalf("Application failed: %v", err)
	}
}
