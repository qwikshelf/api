package router

import (
	"net/http"

	"github.com/gin-gonic/gin"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"

	"github.com/qwikshelf/api/internal/adapter/primary/http/handler"
	"github.com/qwikshelf/api/internal/adapter/primary/http/middleware"
)

// Config holds all handlers needed for routing
type Config struct {
	AppName            string
	AppEnv             string
	AuthMiddleware     *middleware.AuthMiddleware
	AuthHandler        *handler.AuthHandler
	UserHandler        *handler.UserHandler
	RoleHandler        *handler.RoleHandler
	WarehouseHandler   *handler.WarehouseHandler
	SupplierHandler    *handler.SupplierHandler
	CategoryHandler    *handler.CategoryHandler
	FamilyHandler      *handler.ProductFamilyHandler
	VariantHandler     *handler.ProductVariantHandler
	InventoryHandler   *handler.InventoryHandler
	ProcurementHandler *handler.ProcurementHandler
	SaleHandler        *handler.SaleHandler
	CollectionHandler  *handler.CollectionHandler
}

// SetupRoutes configures all API routes
func SetupRoutes(r *gin.Engine, cfg *Config) {
	// Apply global middleware
	r.Use(middleware.RequestLogger())
	r.Use(middleware.RecoveryLogger())
	r.Use(middleware.CORS())
	r.Use(middleware.RequestID())

	// Health check endpoint
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":  "healthy",
			"service": cfg.AppName,
			"env":     cfg.AppEnv,
		})
	})

	// Swagger documentation
	r.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	// API v1 routes
	v1 := r.Group("/api/v1")
	{
		// Public routes
		auth := v1.Group("/auth")
		{
			auth.POST("/login", cfg.AuthHandler.Login)
			auth.POST("/logout", cfg.AuthHandler.Logout)
		}

		// Protected routes
		protected := v1.Group("")
		protected.Use(cfg.AuthMiddleware.Authenticate())
		{
			// Auth profile
			protected.GET("/auth/me", cfg.AuthHandler.Me)

			// User routes
			users := protected.Group("/users")
			{
				users.GET("", cfg.UserHandler.List)
				users.POST("", cfg.UserHandler.Create)
				users.GET("/:id", cfg.UserHandler.Get)
				users.PUT("/:id", cfg.UserHandler.Update)
				users.DELETE("/:id", cfg.UserHandler.Delete)
			}

			// Role routes
			roles := protected.Group("/roles")
			{
				roles.GET("", cfg.RoleHandler.List)
				roles.POST("", cfg.RoleHandler.Create)
				roles.GET("/:id", cfg.RoleHandler.Get)
				roles.PUT("/:id", cfg.RoleHandler.Update)
				roles.DELETE("/:id", cfg.RoleHandler.Delete)
			}

			// Warehouse routes
			warehouses := protected.Group("/warehouses")
			{
				warehouses.GET("", cfg.WarehouseHandler.List)
				warehouses.POST("", cfg.WarehouseHandler.Create)
				warehouses.GET("/:id", cfg.WarehouseHandler.Get)
				warehouses.PUT("/:id", cfg.WarehouseHandler.Update)
				warehouses.DELETE("/:id", cfg.WarehouseHandler.Delete)
			}

			// Supplier routes
			suppliers := protected.Group("/suppliers")
			{
				suppliers.GET("", cfg.SupplierHandler.List)
				suppliers.POST("", cfg.SupplierHandler.Create)
				suppliers.GET("/:id", cfg.SupplierHandler.Get)
				suppliers.PUT("/:id", cfg.SupplierHandler.Update)
				suppliers.DELETE("/:id", cfg.SupplierHandler.Delete)
				suppliers.GET("/:id/variants", cfg.SupplierHandler.ListVariants)
				suppliers.POST("/:id/variants", cfg.SupplierHandler.AddVariant)
				suppliers.DELETE("/:id/variants/:variantId", cfg.SupplierHandler.RemoveVariant)
			}

			// Category routes
			categories := protected.Group("/categories")
			{
				categories.GET("", cfg.CategoryHandler.List)
				categories.POST("", cfg.CategoryHandler.Create)
				categories.GET("/:id", cfg.CategoryHandler.Get)
				categories.PUT("/:id", cfg.CategoryHandler.Update)
				categories.DELETE("/:id", cfg.CategoryHandler.Delete)
			}

			// Product family routes
			families := protected.Group("/product-families")
			{
				families.GET("", cfg.FamilyHandler.List)
				families.POST("", cfg.FamilyHandler.Create)
				families.GET("/:id", cfg.FamilyHandler.Get)
				families.PUT("/:id", cfg.FamilyHandler.Update)
				families.DELETE("/:id", cfg.FamilyHandler.Delete)
			}

			// Product variant routes
			products := protected.Group("/products")
			{
				products.GET("", cfg.VariantHandler.List)
				products.POST("", cfg.VariantHandler.Create)
				products.GET("/:id", cfg.VariantHandler.Get)
				products.PUT("/:id", cfg.VariantHandler.Update)
				products.DELETE("/:id", cfg.VariantHandler.Delete)
			}

			// Inventory routes
			inventory := protected.Group("/inventory")
			{
				inventory.GET("", cfg.InventoryHandler.List)
				inventory.GET("/warehouse/:warehouseId", cfg.InventoryHandler.ListByWarehouse)
				inventory.POST("/adjust", cfg.InventoryHandler.Adjust)
				inventory.POST("/transfer", cfg.InventoryHandler.Transfer)
			}

			// Procurement routes
			procurements := protected.Group("/procurements")
			{
				procurements.GET("", cfg.ProcurementHandler.List)
				procurements.POST("", cfg.ProcurementHandler.Create)
				procurements.GET("/:id", cfg.ProcurementHandler.Get)
				procurements.GET("/supplier/:supplierId", cfg.ProcurementHandler.ListBySupplier)
				procurements.PATCH("/:id/status", cfg.ProcurementHandler.UpdateStatus)
				procurements.PATCH("/:id/receive", cfg.ProcurementHandler.ReceiveItems)
			}

			// Sale routes
			sales := protected.Group("/sales")
			{
				sales.GET("", cfg.SaleHandler.List)
				sales.POST("", cfg.SaleHandler.Create)
				sales.GET("/:id", cfg.SaleHandler.Get)
			}

			// Collection routes
			collections := protected.Group("/collections")
			{
				collections.GET("", cfg.CollectionHandler.List)
				collections.POST("", cfg.CollectionHandler.Record)
			}
		}
	}

	// 404 handler
	r.NoRoute(middleware.NotFoundHandler())
}
