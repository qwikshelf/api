package app

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/qwikshelf/api/docs"
	"github.com/qwikshelf/api/internal/adapter/primary/http/handler"
	"github.com/qwikshelf/api/internal/adapter/primary/http/middleware"
	"github.com/qwikshelf/api/internal/adapter/primary/http/router"
	"github.com/qwikshelf/api/internal/adapter/secondary/bcrypt"
	"github.com/qwikshelf/api/internal/adapter/secondary/postgres"
	"github.com/qwikshelf/api/internal/application/service"
	"github.com/qwikshelf/api/internal/config"
	"github.com/qwikshelf/api/pkg/logger"
)

// App is the application container
type App struct {
	cfg    *config.Config
	db     *postgres.DB
	router *gin.Engine
}

// NewApp creates a new application instance
func NewApp(cfg *config.Config) (*App, error) {
	// Configure Swagger documentation dynamically
	if cfg.App.Env == "production" {
		// Use the production domain
		docs.SwaggerInfo.Host = "api.qwikshelf.store"
		docs.SwaggerInfo.Schemes = []string{"https"}
	} else {
		// Use localhost for development
		docs.SwaggerInfo.Host = fmt.Sprintf("localhost:%d", cfg.App.Port)
		docs.SwaggerInfo.Schemes = []string{"http"}
	}

	// Initialize database connection
	db, err := postgres.NewConnection(cfg.Database)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	// Run pending migrations
	if err := db.RunMigrations("migrations"); err != nil {
		return nil, fmt.Errorf("failed to run migrations: %w", err)
	}

	// Initialize repositories
	userRepo := postgres.NewUserRepository(db)
	roleRepo := postgres.NewRoleRepository(db)
	permissionRepo := postgres.NewPermissionRepository(db)
	warehouseRepo := postgres.NewWarehouseRepository(db)
	categoryRepo := postgres.NewCategoryRepository(db)
	productFamilyRepo := postgres.NewProductFamilyRepository(db)
	productVariantRepo := postgres.NewProductVariantRepository(db)
	supplierRepo := postgres.NewSupplierRepository(db)
	inventoryRepo := postgres.NewInventoryRepository(db)
	procurementRepo := postgres.NewProcurementRepository(db)

	// Initialize services
	hasher := bcrypt.NewHasher()
	authService := service.NewAuthService(userRepo, hasher, cfg.JWT)
	userService := service.NewUserService(userRepo, roleRepo, hasher)
	roleService := service.NewRoleService(roleRepo, permissionRepo)
	warehouseService := service.NewWarehouseService(warehouseRepo)
	categoryService := service.NewCategoryService(categoryRepo)
	productFamilyService := service.NewProductFamilyService(productFamilyRepo, categoryRepo)
	productVariantService := service.NewProductVariantService(productVariantRepo, productFamilyRepo)
	supplierService := service.NewSupplierService(supplierRepo)
	inventoryService := service.NewInventoryService(inventoryRepo, warehouseRepo, productVariantRepo)
	procurementService := service.NewProcurementService(procurementRepo, supplierRepo, inventoryRepo, warehouseRepo, productVariantRepo)

	// Initialize handlers
	authHandler := handler.NewAuthHandler(authService)
	userHandler := handler.NewUserHandler(userService)
	roleHandler := handler.NewRoleHandler(roleService)
	warehouseHandler := handler.NewWarehouseHandler(warehouseService)
	categoryHandler := handler.NewCategoryHandler(categoryService)
	productFamilyHandler := handler.NewProductFamilyHandler(productFamilyService)
	productVariantHandler := handler.NewProductVariantHandler(productVariantService)
	supplierHandler := handler.NewSupplierHandler(supplierService)
	inventoryHandler := handler.NewInventoryHandler(inventoryService)
	procurementHandler := handler.NewProcurementHandler(procurementService)

	// Initialize middleware
	authMiddleware := middleware.NewAuthMiddleware(cfg.JWT.Secret)

	// Setup router
	engine := gin.New()
	router.SetupRoutes(engine, &router.Config{
		AppName:            cfg.App.Name,
		AppEnv:             cfg.App.Env,
		AuthMiddleware:     authMiddleware,
		AuthHandler:        authHandler,
		UserHandler:        userHandler,
		RoleHandler:        roleHandler,
		WarehouseHandler:   warehouseHandler,
		SupplierHandler:    supplierHandler,
		CategoryHandler:    categoryHandler,
		FamilyHandler:      productFamilyHandler,
		VariantHandler:     productVariantHandler,
		InventoryHandler:   inventoryHandler,
		ProcurementHandler: procurementHandler,
	})

	return &App{
		cfg:    cfg,
		db:     db,
		router: engine,
	}, nil
}

// Run starts the application
func (a *App) Run() error {
	// Create HTTP server
	srv := &http.Server{
		Addr:         fmt.Sprintf(":%d", a.cfg.App.Port),
		Handler:      a.router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start server
	go func() {
		logger.Info().Int("port", a.cfg.App.Port).Str("name", a.cfg.App.Name).Msg("Starting server")
		logger.Info().Str("url", fmt.Sprintf("http://localhost:%d/swagger/index.html", a.cfg.App.Port)).Msg("Swagger UI")
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			logger.Fatal().Err(err).Msg("Failed to start server")
		}
	}()

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	logger.Info().Msg("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		return fmt.Errorf("server forced to shutdown: %w", err)
	}

	a.db.Close()
	logger.Info().Msg("Server exited gracefully")
	return nil
}
