package dto

// DashboardStatsResponse represents the aggregated metrics for the dashboard
type DashboardStatsResponse struct {
	TotalProducts         int64   `json:"totalProducts"`
	TotalWarehouses       int64   `json:"totalWarehouses"`
	TotalSuppliers        int64   `json:"totalSuppliers"`
	TotalCategories       int64   `json:"totalCategories"`
	TotalUsers            int64   `json:"totalUsers"`
	TotalFamilies         int64   `json:"totalFamilies"`
	ActivePOs             int64   `json:"activePOs"`
	TotalSKUs             int64   `json:"totalSKUs"`
	LowStockItems         int64   `json:"lowStockItems"`
	OutOfStockItems       int64   `json:"outOfStockItems"`
	TotalPOSpend          float64 `json:"totalPOSpend"`
	PendingDeliveries     int64   `json:"pendingDeliveries"`
	OverduePOs            int64   `json:"overduePOs"`
	InventoryValue        float64 `json:"inventoryValue"`
	TotalSalesValue       float64 `json:"totalSalesValue"`
	AccountsReceivable    float64 `json:"accountsReceivable"`
	TotalMilkBought       float64 `json:"totalMilkBought"`
	ClosingInventoryValue float64 `json:"closingInventoryValue"`
}
