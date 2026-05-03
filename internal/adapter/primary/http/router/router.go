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
	CustomerHandler    *handler.CustomerHandler
	CollectionHandler  *handler.CollectionHandler
	DashboardHandler      *handler.DashboardHandler
	ServiceabilityHandler *handler.ServiceabilityHandler
	PublicHandler         *handler.PublicHandler
	SubscriptionHandler   *handler.SubscriptionHandler
	AuditMiddleware       *middleware.AuditMiddleware
	ExpenseHandler        *handler.ExpenseHandler
}

// SetupRoutes configures all API routes
func SetupRoutes(r *gin.Engine, cfg *Config) {
	// Apply global middleware
	r.Use(cfg.AuditMiddleware.Audit())
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
		public := v1.Group("/public")
		{
			public.GET("/products", cfg.PublicHandler.ListProducts)
			public.GET("/products/:id", cfg.PublicHandler.GetProduct)
			public.GET("/categories", cfg.PublicHandler.ListCategories)
			public.POST("/orders", cfg.PublicHandler.CreateOrder)
			public.POST("/register", cfg.PublicHandler.Register)
			public.POST("/login", cfg.PublicHandler.Login)
			public.GET("/serviceability", cfg.PublicHandler.CheckServiceability)

			// Authenticated customer endpoints
			me := public.Group("/my", cfg.AuthMiddleware.Authenticate())
			{
				me.GET("/orders", cfg.PublicHandler.GetMyOrders)
				me.GET("/orders/:id", cfg.PublicHandler.GetOrderTracking)
			}
		}

		auth := v1.Group("/auth")
		{
			auth.POST("/login", cfg.AuthHandler.Login)
			auth.POST("/refresh", cfg.AuthHandler.Refresh)
		}

		// Protected routes
		protected := v1.Group("")
		protected.Use(cfg.AuthMiddleware.Authenticate())
		{
			// Auth profile and logout
			protected.GET("/auth/me", cfg.AuthHandler.Me)
			protected.POST("/auth/logout", cfg.AuthHandler.Logout)

			// User routes
			users := protected.Group("/users")
			{
				users.GET("", cfg.AuthMiddleware.RequirePermission("users.view"), cfg.UserHandler.List)
				users.POST("", cfg.AuthMiddleware.RequirePermission("users.manage"), cfg.UserHandler.Create)
				users.GET("/:id", cfg.AuthMiddleware.RequirePermission("users.view"), cfg.UserHandler.Get)
				users.PUT("/:id", cfg.AuthMiddleware.RequirePermission("users.manage"), cfg.UserHandler.Update)
				users.DELETE("/:id", cfg.AuthMiddleware.RequirePermission("users.manage"), cfg.UserHandler.Delete)
			}

			// Customer routes
			customers := protected.Group("/customers")
			{
				customers.GET("", cfg.AuthMiddleware.RequirePermission("customers.view"), cfg.CustomerHandler.List)
				customers.POST("", cfg.AuthMiddleware.RequirePermission("customers.manage"), cfg.CustomerHandler.Create)
				customers.POST("/bulk", cfg.AuthMiddleware.RequirePermission("customers.manage"), cfg.CustomerHandler.CreateBulk)
				customers.GET("/:id", cfg.AuthMiddleware.RequirePermission("customers.view"), cfg.CustomerHandler.Get)
				customers.PUT("/:id", cfg.AuthMiddleware.RequirePermission("customers.manage"), cfg.CustomerHandler.Update)
				customers.DELETE("/:id", cfg.AuthMiddleware.RequirePermission("customers.manage"), cfg.CustomerHandler.Delete)
			}

			// Role routes
			roles := protected.Group("/roles")
			{
				roles.GET("", cfg.AuthMiddleware.RequirePermission("roles.view"), cfg.RoleHandler.List)
				roles.POST("", cfg.AuthMiddleware.RequirePermission("roles.manage"), cfg.RoleHandler.Create)
				roles.GET("/:id", cfg.AuthMiddleware.RequirePermission("roles.view"), cfg.RoleHandler.Get)
				roles.PUT("/:id", cfg.AuthMiddleware.RequirePermission("roles.manage"), cfg.RoleHandler.Update)
				roles.DELETE("/:id", cfg.AuthMiddleware.RequirePermission("roles.manage"), cfg.RoleHandler.Delete)
			}

			// Permissions routes
			permissions := protected.Group("/permissions")
			{
				permissions.GET("", cfg.AuthMiddleware.RequirePermission("roles.view"), cfg.RoleHandler.ListPermissions)
			}

			// Expense routes
			expenses := protected.Group("/expenses")
			{
				expenses.GET("", cfg.AuthMiddleware.RequirePermission("expenses.view"), cfg.ExpenseHandler.ListExpenses)
				expenses.POST("", cfg.AuthMiddleware.RequirePermission("expenses.create"), cfg.ExpenseHandler.CreateExpense)
				expenses.DELETE("/:id", cfg.AuthMiddleware.RequirePermission("expenses.delete"), cfg.ExpenseHandler.DeleteExpense)

				categories := expenses.Group("/categories")
				{
					categories.GET("", cfg.AuthMiddleware.RequirePermission("expenses.view"), cfg.ExpenseHandler.ListCategories)
					categories.POST("", cfg.AuthMiddleware.RequirePermission("expense_categories.manage"), cfg.ExpenseHandler.CreateCategory)
				}
			}

			// Warehouse routes
			warehouses := protected.Group("/warehouses")
			{
				warehouses.GET("", cfg.AuthMiddleware.RequirePermission("warehouses.view"), cfg.WarehouseHandler.List)
				warehouses.POST("", cfg.AuthMiddleware.RequirePermission("warehouses.manage"), cfg.WarehouseHandler.Create)
				warehouses.GET("/:id", cfg.AuthMiddleware.RequirePermission("warehouses.view"), cfg.WarehouseHandler.Get)
				warehouses.PUT("/:id", cfg.AuthMiddleware.RequirePermission("warehouses.manage"), cfg.WarehouseHandler.Update)
				warehouses.DELETE("/:id", cfg.AuthMiddleware.RequirePermission("warehouses.manage"), cfg.WarehouseHandler.Delete)
			}

			// Supplier routes
			suppliers := protected.Group("/suppliers")
			{
				suppliers.GET("", cfg.AuthMiddleware.RequirePermission("suppliers.view"), cfg.SupplierHandler.List)
				suppliers.POST("", cfg.AuthMiddleware.RequirePermission("suppliers.manage"), cfg.SupplierHandler.Create)
				suppliers.GET("/:id", cfg.AuthMiddleware.RequirePermission("suppliers.view"), cfg.SupplierHandler.Get)
				suppliers.PUT("/:id", cfg.AuthMiddleware.RequirePermission("suppliers.manage"), cfg.SupplierHandler.Update)
				suppliers.DELETE("/:id", cfg.AuthMiddleware.RequirePermission("suppliers.manage"), cfg.SupplierHandler.Delete)
				suppliers.GET("/:id/variants", cfg.AuthMiddleware.RequirePermission("suppliers.view"), cfg.SupplierHandler.ListVariants)
				suppliers.POST("/:id/variants", cfg.AuthMiddleware.RequirePermission("suppliers.manage"), cfg.SupplierHandler.AddVariant)
				suppliers.DELETE("/:id/variants/:variantId", cfg.AuthMiddleware.RequirePermission("suppliers.manage"), cfg.SupplierHandler.RemoveVariant)
			}

			// Category routes
			categories := protected.Group("/categories")
			{
				categories.GET("", cfg.AuthMiddleware.RequirePermission("categories.view"), cfg.CategoryHandler.List)
				categories.POST("", cfg.AuthMiddleware.RequirePermission("categories.manage"), cfg.CategoryHandler.Create)
				categories.GET("/:id", cfg.AuthMiddleware.RequirePermission("categories.view"), cfg.CategoryHandler.Get)
				categories.PUT("/:id", cfg.AuthMiddleware.RequirePermission("categories.manage"), cfg.CategoryHandler.Update)
				categories.DELETE("/:id", cfg.AuthMiddleware.RequirePermission("categories.manage"), cfg.CategoryHandler.Delete)
			}

			// Product family routes
			families := protected.Group("/product-families")
			{
				families.GET("", cfg.AuthMiddleware.RequirePermission("families.view"), cfg.FamilyHandler.List)
				families.POST("", cfg.AuthMiddleware.RequirePermission("families.manage"), cfg.FamilyHandler.Create)
				families.GET("/:id", cfg.AuthMiddleware.RequirePermission("families.view"), cfg.FamilyHandler.Get)
				families.PUT("/:id", cfg.AuthMiddleware.RequirePermission("families.manage"), cfg.FamilyHandler.Update)
				families.DELETE("/:id", cfg.AuthMiddleware.RequirePermission("families.manage"), cfg.FamilyHandler.Delete)
			}

			// Product variant routes
			products := protected.Group("/products")
			{
				products.GET("", cfg.AuthMiddleware.RequirePermission("products.view"), cfg.VariantHandler.List)
				products.POST("", cfg.AuthMiddleware.RequirePermission("products.manage"), cfg.VariantHandler.Create)
				products.GET("/:id", cfg.AuthMiddleware.RequirePermission("products.view"), cfg.VariantHandler.Get)
				products.PUT("/:id", cfg.AuthMiddleware.RequirePermission("products.manage"), cfg.VariantHandler.Update)
				products.DELETE("/:id", cfg.AuthMiddleware.RequirePermission("products.manage"), cfg.VariantHandler.Delete)
			}

			// Inventory routes
			inventory := protected.Group("/inventory")
			{
				inventory.GET("", cfg.AuthMiddleware.RequirePermission("inventory.view"), cfg.InventoryHandler.List)
				inventory.GET("/warehouse/:warehouseId", cfg.AuthMiddleware.RequirePermission("inventory.view"), cfg.InventoryHandler.ListByWarehouse)
				inventory.POST("/adjust", cfg.AuthMiddleware.RequirePermission("inventory.manage"), cfg.InventoryHandler.Adjust)
				inventory.POST("/transfer", cfg.AuthMiddleware.RequirePermission("inventory.manage"), cfg.InventoryHandler.Transfer)
			}

			// Procurement routes
			procurements := protected.Group("/procurements")
			{
				procurements.GET("", cfg.AuthMiddleware.RequirePermission("procurement.view"), cfg.ProcurementHandler.List)
				procurements.POST("", cfg.AuthMiddleware.RequirePermission("procurement.manage"), cfg.ProcurementHandler.Create)
				procurements.GET("/:id", cfg.AuthMiddleware.RequirePermission("procurement.view"), cfg.ProcurementHandler.Get)
				procurements.GET("/supplier/:supplierId", cfg.AuthMiddleware.RequirePermission("procurement.view"), cfg.ProcurementHandler.ListBySupplier)
				procurements.PATCH("/:id/status", cfg.AuthMiddleware.RequirePermission("procurement.manage"), cfg.ProcurementHandler.UpdateStatus)
				procurements.PATCH("/:id/receive", cfg.AuthMiddleware.RequirePermission("procurement.manage"), cfg.ProcurementHandler.ReceiveItems)
			}

			// Sale routes
			sales := protected.Group("/sales")
			{
				sales.GET("", cfg.AuthMiddleware.RequirePermission("sales.view"), cfg.SaleHandler.List)
				sales.POST("", cfg.AuthMiddleware.RequirePermission("sales.manage"), cfg.SaleHandler.Create)
				sales.GET("/:id", cfg.AuthMiddleware.RequirePermission("sales.view"), cfg.SaleHandler.Get)
			}

			// Collection routes
			collections := protected.Group("/collections")
			{
				collections.GET("", cfg.AuthMiddleware.RequirePermission("collections.view"), cfg.CollectionHandler.List)
				collections.POST("", cfg.AuthMiddleware.RequirePermission("collections.manage"), cfg.CollectionHandler.Record)
			}

			// Dashboard routes
			dashboard := protected.Group("/dashboard")
			{
				dashboard.GET("/stats", cfg.AuthMiddleware.RequirePermission("dashboard.view"), cfg.DashboardHandler.GetStats)
			}

			subscriptions := protected.Group("/subscriptions")
			{
				// Static paths first to avoid parameter conflicts
				subscriptions.GET("/roster", cfg.AuthMiddleware.RequirePermission("subscriptions.view"), cfg.SubscriptionHandler.GetDailyRoster)
				subscriptions.GET("/invoices", cfg.AuthMiddleware.RequirePermission("subscriptions.view"), cfg.SubscriptionHandler.ListInvoices)
				subscriptions.GET("/invoices/:id", cfg.AuthMiddleware.RequirePermission("subscriptions.view"), cfg.SubscriptionHandler.GetInvoice)
				subscriptions.PATCH("/invoices/:id/finalize", cfg.AuthMiddleware.RequirePermission("subscriptions.manage"), cfg.SubscriptionHandler.FinalizeInvoice)
				subscriptions.POST("/invoices/:id/adjustments", cfg.AuthMiddleware.RequirePermission("subscriptions.manage"), cfg.SubscriptionHandler.AddAdjustment)

				// Base routes
				subscriptions.GET("", cfg.AuthMiddleware.RequirePermission("subscriptions.view"), cfg.SubscriptionHandler.List)
				subscriptions.POST("", cfg.AuthMiddleware.RequirePermission("subscriptions.manage"), cfg.SubscriptionHandler.Create)
				
				// Parameter routes last
				subscriptions.GET("/:id", cfg.AuthMiddleware.RequirePermission("subscriptions.view"), cfg.SubscriptionHandler.Get)
				subscriptions.PUT("/:id", cfg.AuthMiddleware.RequirePermission("subscriptions.manage"), cfg.SubscriptionHandler.Update)
				subscriptions.PATCH("/:id/status", cfg.AuthMiddleware.RequirePermission("subscriptions.manage"), cfg.SubscriptionHandler.UpdateStatus)
				subscriptions.DELETE("/:id", cfg.AuthMiddleware.RequirePermission("subscriptions.manage"), cfg.SubscriptionHandler.Delete)
				subscriptions.POST("/:id/deliveries", cfg.AuthMiddleware.RequirePermission("subscriptions.manage"), cfg.SubscriptionHandler.RecordDelivery)
				subscriptions.POST("/:id/invoices/generate", cfg.AuthMiddleware.RequirePermission("subscriptions.manage"), cfg.SubscriptionHandler.GenerateMonthlyInvoice)
			}

			// Serviceability routes
			serviceability := protected.Group("/serviceability")
			{
				serviceability.GET("/zones", cfg.AuthMiddleware.RequirePermission("serviceability.view"), cfg.ServiceabilityHandler.ListZones)
				serviceability.POST("/zones", cfg.AuthMiddleware.RequirePermission("serviceability.manage"), cfg.ServiceabilityHandler.CreateZone)
				serviceability.PUT("/zones/:id", cfg.AuthMiddleware.RequirePermission("serviceability.manage"), cfg.ServiceabilityHandler.UpdateZone)
				serviceability.POST("/map", cfg.AuthMiddleware.RequirePermission("serviceability.manage"), cfg.ServiceabilityHandler.MapPincode)
				serviceability.GET("/geodata", cfg.AuthMiddleware.RequirePermission("serviceability.manage"), cfg.ServiceabilityHandler.ListGeoData)
				serviceability.POST("/geodata", cfg.AuthMiddleware.RequirePermission("serviceability.manage"), cfg.ServiceabilityHandler.SaveGeoData)
				serviceability.POST("/import", cfg.AuthMiddleware.RequirePermission("serviceability.manage"), cfg.ServiceabilityHandler.ImportPincodes)
			}
		}
	}

	// 404 handler
	r.NoRoute(middleware.NotFoundHandler())
}
