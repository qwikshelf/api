# Frontend UI/UX Specification: QwikShelf Dashboard

This document details the design system, component architecture, and user experience strategy for the QwikShelf Dashboard. The goal is to provide a premium, data-driven interface that remains performant at scale.

---

## 🎨 Design System & Palette

The dashboard uses a **Modern Glassmorphism** aesthetic with a curated HSL-based color palette to ensure accessibility and visual harmony.

### Core Palette
| Color | Value | Usage |
| :--- | :--- | :--- |
| **Indigo (Primary)** | `#6366f1` | Brand identity, primary buttons, high-light charts. |
| **Teal** | `hsl(174, 60%, 41%)` | Positive trends, healthy inventory status. |
| **Amber** | `hsl(38, 92%, 50%)` | Warnings, low stock alerts, waiting status. |
| **Emerald** | `#10b981` | Success states, confirmed supply deliveries. |
| **Rose** | `#f43f5e` | Critical alerts, out-of-stock items, overdue POs. |

### Visual Tokens
*   **Border Radius:** `24px` for main cards (Large), `12px` for inner widgets (Medium).
*   **Shadows:** Multi-layered soft shadows (`0 4px 14px rgba(0,0,0,.08)`) for a floating effect.
*   **Typography:** Multi-weight Sans-serif hierarchy with **Black (900)** for numbers and **Bold (700)** for labels.

---

## 🧱 Component Architecture

### 1. ModernStatCard
A high-level KPI card featuring:
*   **Dynamic Trend:** Inline 7-day sparkline generated from backend data.
*   **Micro-Animations:** Scale-up hover effects (105% scale) on the icon container.
*   **Status Badging:** Percentage comparison (e.g., "+21% vs last month") with color-coded directional arrow.

### 2. Command Center (QuickAction)
A grid of actionable tiles that support **Keyboard Shortcut Navigation**:
*   `[A]` Adjust Stock
*   `[N]` New PO
*   `[M]` Serviceability Map
*   `[P]` Add Product
*   `[S]` Record Sale

### 3. Intelligence Widgets
*   **Income Performance (AreaChart):** High-fidelity time-series chart with linear gradients and active-dot tooltips.
*   **Inventory Health (Pie/Donut):** Segmented donut chart with a centered "Healthy %" readout.
*   **Supply Dynamics:** Responsive data tables with monospace font for identifiers and tabular numbers for financial accuracy.

---

## 📊 Data Visualization Strategy

| Chart Type | Usage Scenario | Rationale |
| :--- | :--- | :--- |
| **AreaChart** | Revenue Trends | Smooth curves emphasize continuous growth and "Income Pulse." |
| **BarChart** | Warehouse Volume | Discrete bars make it easy to compare quantities across different physical locations. |
| **DonutChart** | Health Ratio | Provides an immediate "Good vs Bad" visual ratio for rapid decision making. |

---

## 🌐 UX & Responsiveness

### Layout Grid
*   **Desktop (lg):** 3-column main grid for charts, 5-column grid for actions.
*   **Tablet (md):** 2-column stacked grid.
*   **Mobile:** Single column fluid layout with horizontally scrolling transaction tables.

### Tooltip Logic
Tooltips are engineered to remain within parent containers, featuring a custom blurred background and high-contrast text for visibility over complex chart paths.

---
*Created: 2026-04-13 12:20*
