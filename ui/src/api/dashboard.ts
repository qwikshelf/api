import api from "./axios";
import type { ApiResponse } from "@/types";

export interface DashboardStatsResponse {
    totalProducts: number;
    totalWarehouses: number;
    totalSuppliers: number;
    totalCategories: number;
    totalUsers: number;
    totalFamilies: number;
    activePOs: number;
    totalSKUs: number;
    lowStockItems: number;
    outOfStockItems: number;
    totalPOSpend: number;
    pendingDeliveries: number;
    overduePOs: number;
    inventoryValue: number;
    totalSalesValue: number;
    accountsReceivable: number;
    totalMilkBought: number;
    closingInventoryValue: number;
}

export const dashboardApi = {
    getStats: () => api.get<ApiResponse<DashboardStatsResponse>>("/dashboard/stats"),
};
