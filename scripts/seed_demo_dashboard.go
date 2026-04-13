package main

import (
	"context"
	"fmt"
	"log"
	"math/rand"
	"time"

	"github.com/joho/godotenv"
	"github.com/qwikshelf/api/internal/adapter/secondary/postgres"
	"github.com/qwikshelf/api/internal/config"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	db, err := postgres.NewConnection(cfg.Database)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	ctx := context.Background()

	// 1. Ensure a Warehouse exists
	var warehouseID int
	err = db.Pool.QueryRow(ctx, "INSERT INTO warehouses (name, type) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING id", "Main Depot", "distribution_center").Scan(&warehouseID)
	if err != nil {
		// If exists, fetch it
		_ = db.Pool.QueryRow(ctx, "SELECT id FROM warehouses LIMIT 1").Scan(&warehouseID)
	}

	// 2. Ensure an Admin user exists for processing sales
	var userID int
	_ = db.Pool.QueryRow(ctx, "SELECT id FROM users LIMIT 1").Scan(&userID)

	// 3. Clear existing demo data to prevent duplicates (OPTIONAL/USE WITH CAUTION)
	// _, _ = db.Pool.Exec(ctx, "DELETE FROM sale_items")
	// _, _ = db.Pool.Exec(ctx, "DELETE FROM sales")

	// 4. Products Setup (5 items)
	products := []struct {
		name     string
		sku      string
		cost     float64
		price    float64
		qty      float64
	}{
		{"Full Cream Milk (500ml)", "MLK-FC-500", 25.0, 32.0, 50},
		{"Lite Milk (500ml)", "MLK-LT-500", 22.0, 28.0, 5}, // Low stock
		{"Desi Ghee (1L)", "GHEE-1L", 450.0, 580.0, 0},    // Out of stock
		{"Salted Butter (100g)", "BTR-S-100", 40.0, 55.0, 20},
		{"Paneer (200g)", "PNR-200", 60.0, 85.0, 15},
	}

	fmt.Println("Seeding Products and Inventory...")
	for _, p := range products {
		var variantID int
		err := db.Pool.QueryRow(ctx, `
			INSERT INTO product_variants (family_id, name, sku, unit, cost_price, selling_price, is_manufactured)
			VALUES (1, $1, $2, 'packet', $3, $4, false)
			ON CONFLICT (sku) DO UPDATE SET cost_price = EXCLUDED.cost_price, selling_price = EXCLUDED.selling_price
			RETURNING id
		`, p.name, p.sku, p.cost, p.price).Scan(&variantID)
		if err != nil {
			_ = db.Pool.QueryRow(ctx, "SELECT id FROM product_variants WHERE sku = $1", p.sku).Scan(&variantID)
		}

		// Set Inventory
		_, _ = db.Pool.Exec(ctx, `
			INSERT INTO inventory_levels (warehouse_id, variant_id, quantity)
			VALUES ($1, $2, $3)
			ON CONFLICT (warehouse_id, variant_id) DO UPDATE SET quantity = EXCLUDED.quantity
		`, warehouseID, variantID, p.qty)

		// 5. Seed 14 days of sales for this product
		fmt.Printf("Generating 14 days of Sales for %s...\n", p.name)
		for i := 0; i < 14; i++ {
			date := time.Now().AddDate(0, 0, -i)
			
			// Random number of sales per day (0 to 10)
			numSales := rand.Intn(10)
			for s := 0; s < numSales; s++ {
				amt := p.price * (1 + rand.Float64()*5) // Random qty 1-6
				qty := amt / p.price
				
				method := "cash"
				if rand.Float64() < 0.2 {
					method = "credit"
				}

				var saleID int
				_ = db.Pool.QueryRow(ctx, `
					INSERT INTO sales (warehouse_id, customer_name, total_amount, payment_method, processed_by_user_id, created_at)
					VALUES ($1, $2, $3, $4, $5, $6)
					RETURNING id
				`, warehouseID, "Demo Customer", amt, method, userID, date).Scan(&saleID)

				_, _ = db.Pool.Exec(ctx, `
					INSERT INTO sale_items (sale_id, variant_id, quantity, unit_price, line_total)
					VALUES ($1, $2, $3, $4, $5)
				`, saleID, variantID, qty, p.price, amt)
			}
		}

		// 6. Seed Collections (Only for Milk)
		if p.sku[:3] == "MLK" {
			fmt.Printf("Generating 14 days of Collections for %s...\n", p.name)
			for i := 0; i < 14; i++ {
				date := time.Now().AddDate(0, 0, -i)
				weight := 100.0 + rand.Float64()*50.0 // 100-150kg
				
				_, _ = db.Pool.Exec(ctx, `
					INSERT INTO collections (variant_id, supplier_id, agent_id, warehouse_id, weight, collected_at, created_at)
					VALUES ($1, 1, $2, $3, $4, $5, $5)
				`, variantID, userID, warehouseID, weight, date)
			}
		}
	}

	fmt.Println("\n✅ Dashboard Demo Seeding Complete!")
	fmt.Println("Stats overview generated for 5 products over 14 days.")
}
