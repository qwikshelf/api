# Serviceability Design: Pincode-Based Delivery

## Goal
To ensure that QwikShelf only accepts orders from geographical areas (pincodes) where it can guarantee freshness and fulfillment within the promised timelines.

## Chosen Strategy: Pincode-to-Warehouse Mapping
We will use an explicit mapping of pincodes to fulfillment centers (warehouses). This provides the highest level of control for hyper-local dairy delivery.

---

## 1. Data Architecture

### Database Schema
A new table will manage the list of serviceable pincodes and their specific business rules.

```sql
CREATE TABLE serviceable_pincodes (
    id SERIAL PRIMARY KEY,
    pincode VARCHAR(10) UNIQUE NOT NULL,
    warehouse_id INTEGER REFERENCES warehouses(id), -- The source for fulfillment
    is_active BOOLEAN DEFAULT true,
    min_order_amount DECIMAL(12, 2) DEFAULT 0,
    delivery_charge DECIMAL(12, 2) DEFAULT 0,
    estimated_delivery_text VARCHAR(100),           -- e.g., "3 Hour Delivery", "Next Day"
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast lookup
CREATE INDEX idx_serviceable_pincodes_lookup ON serviceable_pincodes(pincode) WHERE is_active = true;
```

### Domain Entity (Go)
```go
type ServiceableArea struct {
    Pincode           string  `json:"pincode"`
    WarehouseID       int64   `json:"warehouse_id"`
    IsActive          bool    `json:"is_active"`
    MinOrderAmount    float64 `json:"min_order_amount"`
    DeliveryCharge    float64 `json:"delivery_charge"`
    EstimatedDelivery string  `json:"estimated_delivery"`
}
```

---

## 2. API Design

### Check Serviceability (Public)
Used by the storefront "Check Delivery" widget.
- **Endpoint**: `GET /public/serviceability?pincode=XXXXXX`
- **Response**:
  ```json
  {
      "serviceable": true,
      "delivery_charge": 20.00,
      "estimated_delivery": "Within 3 Hours",
      "min_order": 299.00
  }
  ```

### Order Validation (Internal)
Enforce serviceability during checkout.
- **Hook**: Before `SaleService.ProcessSale`, the system must verify the shipping pincode against the `serviceable_pincodes` table.

---

## 3. Trade-off Analysis

| Approach | Performance | Maintenance | Precision |
| :--- | :--- | :--- | :--- |
| **Pincode Mapping (Selected)** | ✅ **Ultra Fast** (O(1) index lookup) | ⚠️ **Manual** (Must update CSV/DB) | ⚠️ **Medium** (Pincodes are large) |
| **GPS Radius** | ⚠️ **Slower** (Math in query) | ✅ **Automated** (Coord based) | ✅ **High** (Down to the meter) |
| **3PL Integration** | ❌ **Slow** (Network call) | ✅ **Zero** (Provider managed) | ✅ **High** (Dynamic availability) |

---

## 4. Implementation Phasing

### Phase 1: Barebones (Current Focus)
- Create table and seed with local pincodes.
- Simple "Check" API.
- Hardcoded warehouse assignment.

### Phase 2: Dynamic Management
- Admin UI to upload/edit pincode lists via CSV.
- Zone-based pricing (Group pincodes into "Premium Delivery" or "Standard Delivery" zones).

### Phase 3: Spatial Expansion (Future)
- Transition to PostGIS for radius-based checks if the fleet expands beyond specific pincode boundaries.

---
**Document Version**: 1.0
**Status**: Draft for Implementation
