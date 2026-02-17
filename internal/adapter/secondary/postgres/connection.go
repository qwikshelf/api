package postgres

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/qwikshelf/api/internal/config"
)

// DB wraps the pgx connection pool
type DB struct {
	Pool *pgxpool.Pool
}

// NewConnection creates a new PostgreSQL connection pool
func NewConnection(cfg config.DatabaseConfig) (*DB, error) {
	poolConfig, err := pgxpool.ParseConfig(cfg.URL())
	if err != nil {
		return nil, fmt.Errorf("failed to parse database config: %w", err)
	}

	poolConfig.MaxConns = int32(cfg.MaxConnections)
	poolConfig.MinConns = int32(cfg.MaxIdleConnections)
	poolConfig.MaxConnLifetime = cfg.MaxLifetime

	pool, err := pgxpool.NewWithConfig(context.Background(), poolConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to create connection pool: %w", err)
	}

	// Test connection
	if err := pool.Ping(context.Background()); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	return &DB{Pool: pool}, nil
}

// Close closes the connection pool
func (db *DB) Close() {
	db.Pool.Close()
}

// Ping tests the database connection
func (db *DB) Ping(ctx context.Context) error {
	return db.Pool.Ping(ctx)
}
