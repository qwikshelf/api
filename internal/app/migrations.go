package app

import (
	"context"
	"fmt"
	"os"
	"sort"
	"strconv"
	"strings"

	"github.com/qwikshelf/api/pkg/logger"
)

// MigrationStatus Represents the status of a single migration file
type MigrationStatus struct {
	Version  int
	Name     string
	Applied  bool
	IsLatest bool
}

// CheckMigrations compares the database migration version with local files
func (a *App) CheckMigrations(ctx context.Context) ([]MigrationStatus, int, bool, error) {
	// 1. Get applied migrations from DB (sql-migrate uses gorp_migrations)
	appliedMap := make(map[string]bool)
	rows, err := a.db.Pool.Query(ctx, "SELECT id FROM gorp_migrations")
	if err != nil {
		// Table might not exist yet
		logger.Warn().Err(err).Msg("Could not read gorp_migrations table, assuming none applied")
	} else {
		defer rows.Close()
		for rows.Next() {
			var id string
			if err := rows.Scan(&id); err == nil {
				appliedMap[id] = true
			}
		}
	}

	// 2. Read migrations directory
	files, err := os.ReadDir("migrations")
	if err != nil {
		return nil, 0, false, fmt.Errorf("failed to read migrations directory: %w", err)
	}

	var stats []MigrationStatus
	var currentVersion int
	for _, f := range files {
		if f.IsDir() || !strings.HasSuffix(f.Name(), ".sql") {
			continue
		}

		// Try to parse version from filename for display (e.g. 001_initial.sql)
		parts := strings.Split(f.Name(), "_")
		ver := 0
		if len(parts) >= 1 {
			if v, err := strconv.Atoi(parts[0]); err == nil {
				ver = v
			}
		}

		isApplied := appliedMap[f.Name()]
		if isApplied && ver > currentVersion {
			currentVersion = ver
		}

		stats = append(stats, MigrationStatus{
			Version:  ver,
			Name:     f.Name(),
			Applied:  isApplied,
			IsLatest: false,
		})
	}

	// Sort by Name (filenames should be sortable as they start with sequence numbers)
	sort.Slice(stats, func(i, j int) bool {
		return stats[i].Name < stats[j].Name
	})

	if len(stats) > 0 {
		stats[len(stats)-1].IsLatest = true
	}

	return stats, currentVersion, false, nil
}

// PrintMigrationStatus prints a formatted table of migrations
func (a *App) PrintMigrationStatus(ctx context.Context) error {
	stats, current, _, err := a.CheckMigrations(ctx)
	if err != nil {
		return err
	}

	fmt.Println("\n--- Database Migration Status ---")
	fmt.Printf("Current DB Version: %d\n", current)
	fmt.Println("---------------------------------")
	fmt.Printf("%-5s | %-10s | %-30s\n", "Ver", "Status", "Migration File")
	fmt.Println("---------------------------------")

	for _, s := range stats {
		status := "[Pending]"
		if s.Applied {
			status = "[Applied]"
		}
		
		indicator := "  "
		if s.Version == current {
			indicator = "->"
		}

		fmt.Printf("%s %-3d | %-10s | %-30s\n", indicator, s.Version, status, s.Name)
	}
	fmt.Println("---------------------------------")

	if len(stats) > 0 && current < stats[len(stats)-1].Version {
		fmt.Printf("💡 There are %d pending migrations. Run 'make migrate-up' to apply them.\n\n", stats[len(stats)-1].Version-current)
	}

	return nil
}
