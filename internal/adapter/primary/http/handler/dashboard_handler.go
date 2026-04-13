package handler

import (
	"github.com/gin-gonic/gin"

	"strconv"

	"github.com/qwikshelf/api/internal/adapter/primary/http/dto"
	"github.com/qwikshelf/api/internal/adapter/primary/http/middleware"
	"github.com/qwikshelf/api/internal/application/service"
	"github.com/qwikshelf/api/pkg/response"
)

type DashboardHandler struct {
	dashboardService *service.DashboardService
	authService      *service.AuthService
}

func NewDashboardHandler(dashboardService *service.DashboardService, authService *service.AuthService) *DashboardHandler {
	return &DashboardHandler{
		dashboardService: dashboardService,
		authService:      authService,
	}
}

// GetStats returns aggregated dashboard metrics
func (h *DashboardHandler) GetStats(c *gin.Context) {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		response.Unauthorized(c, "Unauthorized")
		return
	}

	// Fetch the full user object to pass into the service for permission checks
	user, _, err := h.authService.GetUserByID(c.Request.Context(), userID)
	if err != nil {
		response.InternalErrorDebug(c, "Failed to load user profile", err)
		return
	}

	// Dynamic interval logic
	daysStr := c.DefaultQuery("days", "7")
	var days int
	if d, err := strconv.Atoi(daysStr); err == nil && d > 0 {
		days = d
	} else {
		days = 7
	}

	stats, err := h.dashboardService.GetStats(c.Request.Context(), user, days)
	if err != nil {
		response.InternalErrorDebug(c, "Failed to fetch dashboard metrics", err)
		return
	}

	resp := dto.DashboardStatsResponse{
		TotalProducts:         stats.TotalProducts,
		TotalWarehouses:       stats.TotalWarehouses,
		TotalSuppliers:        stats.TotalSuppliers,
		TotalCategories:       stats.TotalCategories,
		TotalUsers:            stats.TotalUsers,
		TotalFamilies:         stats.TotalFamilies,
		ActivePOs:             stats.ActivePOs,
		TotalSKUs:             stats.TotalSKUs,
		LowStockItems:         stats.LowStockItems,
		OutOfStockItems:       stats.OutOfStockItems,
		TotalPOSpend:          stats.TotalPOSpend,
		PendingDeliveries:     stats.PendingDeliveries,
		OverduePOs:            stats.OverduePOs,
		InventoryValue:        stats.InventoryValue,
		TotalSalesValue:       stats.TotalSalesValue,
		AccountsReceivable:    stats.AccountsReceivable,
		TotalMilkBought:       stats.TotalMilkBought,
		ClosingInventoryValue: stats.ClosingInventoryValue,
	}

	// Map Trends
	for _, p := range stats.SalesTrend {
		resp.SalesTrend = append(resp.SalesTrend, dto.TrendPointDTO{Date: p.Date, Value: p.Value})
	}
	for _, p := range stats.CollectionTrend {
		resp.CollectionTrend = append(resp.CollectionTrend, dto.TrendPointDTO{Date: p.Date, Value: p.Value})
	}
	for _, p := range stats.TopProducts {
		resp.TopProducts = append(resp.TopProducts, dto.TopProductDTO{Name: p.Name, Value: p.Value})
	}

	response.OK(c, "Dashboard metrics retrieved successfully", resp)
}
