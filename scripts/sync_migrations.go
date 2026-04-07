package main

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/joho/godotenv"
	"github.com/qwikshelf/api/internal/config"
	"github.com/qwikshelf/api/internal/adapter/secondary/postgres"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Fatal("Error loading .env file")
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

	// 1. Create gorp_migrations table if not exists
	_, err = db.Pool.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS gorp_migrations (
			id TEXT PRIMARY KEY,
			applied_at TIMESTAMP WITH TIME ZONE
		)
	`)
	if err != nil {
		log.Fatalf("Failed to create gorp_migrations table: %v", err)
	}

	// 2. Insert migrations 1-21
	migrations := []string{
		"001_initial_schema.sql",
		"002_add_unit_to_variants.sql",
		"003_pos_schema.sql",
		"004_collection_schema.sql",
		"005_session_management.sql",
		"006_user_permissions.sql",
		"007_update_default_roles.sql",
		"008_add_conversion_factor.sql",
		"009_customer_role.sql",
		"010_add_customer_id_to_sales.sql",
		"011_create_serviceable_pincodes_table.sql",
		"012_zone_based_serviceability.sql",
		"013_fix_collection_sequence_sync.sql",
		"014_sync_all_sequences.sql",
		"015_add_geo_to_suppliers.sql",
		"016_customers_crm.sql",
		"017_customer_subscriptions.sql",
		"018_subscription_deliveries.sql",
		"019_audit_logs.sql",
		"020_expense_system.sql",
		"021_warehouse_soft_delete.sql",
	}

	for _, m := range migrations {
		_, err := db.Pool.Exec(ctx, "INSERT INTO gorp_migrations (id, applied_at) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING", m, time.Now())
		if err != nil {
			log.Printf("Warning: failed to insert migration %s: %v", m, err)
		} else {
			fmt.Printf("✔ Marked %s as applied\n", m)
		}
	}

	fmt.Println("\nSync complete. You can now run 'make migrate-status' to verify.")
}
