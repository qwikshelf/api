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
    salesTrend: { date: string; value: number }[];
    collectionTrend: { date: string; value: number }[];
    topProducts: { name: string; value: number }[];
}

export const dashboardApi = {
    getStats: (days: number = 7) => api.get<ApiResponse<DashboardStatsResponse>>(`/dashboard/stats?days=${days}`),
};
