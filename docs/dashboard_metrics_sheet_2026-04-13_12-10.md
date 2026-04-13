# Dashboard Intelligence: Metrics Plan Sheet

This document outlines the source of truth, calculation logic, and expected behavior for every statistic featured on the QwikShelf Dashboard. This plan is designed to be verifiable with a sample set of **3-5 products**.

---

## 📊 Core KPI Breakdown

### 💰 Finance & Sales
| Metric | Source Table | Calculation Logic |
| :--- | :--- | :--- |
| **Total Sales** | `sales` | `SUM(total_amount)` (All time or selected period) |
| **Accounts Receivable** | `sales` | `SUM(total_amount)` WHERE `payment_method` IN ('credit', 'other') |
| **Income Performance** | `sales` | Time-series: Daily `SUM(total_amount)` for the last 7 days |

### 📦 Inventory & Stock
| Metric | Source Table | Calculation Logic |
| :--- | :--- | :--- |
| **Total Products** | `product_variants` | `COUNT(*)` |
| **Total SKUs** | `inventory_levels` | `COUNT(*)` (Reflects products across all warehouses) |
| **Low Stock Items** | `inventory_levels` | `COUNT(*)` WHERE `quantity > 0` AND `quantity < 10` |
| **Out of Stock** | `inventory_levels` | `COUNT(*)` WHERE `quantity <= 0` |
| **Inventory Value** | `inventory_levels`, `product_variants` | `SUM(il.quantity * pv.cost_price)` |

### 🥛 Procurement & Supply
| Metric | Source Table | Calculation Logic |
| :--- | :--- | :--- |
| **Total Milk Bought** | `collections` | `SUM(weight)` (Captured via agent mobile app) |
| **Active POs** | `procurements` | `COUNT(*)` WHERE `status` NOT IN ('received', 'cancelled') |
| **Overdue POs** | `procurements` | `COUNT(*)` WHERE `expected_delivery < NOW()` AND `status` != 'received' |

---

## 🏆 Intelligence Widgets

### 1. Top Revenue Products (3-5 items)
*   **Logic:** Join `sale_items` with `product_variants`.
*   **Ranking:** Order by `SUM(line_total)` descending.
*   **Goal:** Identify which 3-5 specific products are generating the most cash flow.

### 2. Supply Dynamics (Sparklines)
*   **Logic:** Tracks the 7-day volume of `collections`.
*   **Visual:** Shows the "Pulse" of milk collection.

---

## 🧪 Verification Plan (Sample: 3-5 Products)

To verify the accuracy of these stats, we will use a controlled set of 5 test products:

1.  **Direct Sales Check:** Process 1 sale for Product A and verify `Total Sales` increases by exactly that amount.
2.  **Credit Check:** Process 1 sale for Product B with "Credit" payment and verify `Accounts Receivable` updates.
3.  **Low Stock Trigger:** Manually adjust Product C stock to `5` and verify the `Low Stock` badge count increments.
4.  **Value Check:** Set Product D `cost_price` to ₹100 and `quantity` to 10. Verify `Inventory Value` includes ₹1,000 for this item.

---

> [!NOTE]
> This sheet serves as the source of truth for the `DashboardService.go` implementation.

> [!TIP]
> **Scaling Tip:** As discussed, when moving from 5 products to 50,000 products, we will switch from "Live SUM" to a "Materialized Daily Summary" table.

---
*Last Updated: 2026-04-13 12:10*
