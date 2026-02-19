package postgres

import (
	"context"

	"github.com/jackc/pgx/v5"
	"github.com/qwikshelf/api/internal/domain/entity"
)

type CollectionRepository struct {
	db *DB
}

func NewCollectionRepository(db *DB) *CollectionRepository {
	return &CollectionRepository{db: db}
}

func (r *CollectionRepository) Create(ctx context.Context, collection *entity.Collection) error {
	query := `
		INSERT INTO collections (variant_id, supplier_id, agent_id, warehouse_id, weight, collected_at, notes)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, collected_at
	`
	return r.db.Pool.QueryRow(ctx, query,
		collection.VariantID, collection.SupplierID, collection.AgentID,
		collection.WarehouseID, collection.Weight, collection.CollectedAt, collection.Notes,
	).Scan(&collection.ID, &collection.CollectedAt)
}

func (r *CollectionRepository) GetByID(ctx context.Context, id int64) (*entity.Collection, error) {
	query := `
		SELECT c.id, c.variant_id, c.supplier_id, c.agent_id, c.warehouse_id, c.weight, c.collected_at, c.notes,
		       v.name, s.name, u.username
		FROM collections c
		JOIN product_variants v ON c.variant_id = v.id
		JOIN suppliers s ON c.supplier_id = s.id
		JOIN users u ON c.agent_id = u.id
		WHERE c.id = $1
	`
	c := &entity.Collection{
		Variant:  &entity.ProductVariant{},
		Supplier: &entity.Supplier{},
		Agent:    &entity.User{},
	}
	err := r.db.Pool.QueryRow(ctx, query, id).Scan(
		&c.ID, &c.VariantID, &c.SupplierID, &c.AgentID, &c.WarehouseID, &c.Weight, &c.CollectedAt, &c.Notes,
		&c.Variant.Name, &c.Supplier.Name, &c.Agent.Username,
	)
	if err == pgx.ErrNoRows {
		return nil, nil // Or return a domain error
	}
	return c, err
}

func (r *CollectionRepository) List(ctx context.Context, offset, limit int) ([]entity.Collection, int64, error) {
	countQuery := `SELECT COUNT(*) FROM collections`
	var total int64
	err := r.db.Pool.QueryRow(ctx, countQuery).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	query := `
		SELECT c.id, c.variant_id, c.supplier_id, c.agent_id, c.warehouse_id, c.weight, c.collected_at, c.notes,
		       v.name, s.name, u.username
		FROM collections c
		JOIN product_variants v ON c.variant_id = v.id
		JOIN suppliers s ON c.supplier_id = s.id
		JOIN users u ON c.agent_id = u.id
		ORDER BY c.collected_at DESC
		LIMIT $1 OFFSET $2
	`
	rows, err := r.db.Pool.Query(ctx, query, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var collections []entity.Collection
	for rows.Next() {
		c := entity.Collection{
			Variant:  &entity.ProductVariant{},
			Supplier: &entity.Supplier{},
			Agent:    &entity.User{},
		}
		err := rows.Scan(
			&c.ID, &c.VariantID, &c.SupplierID, &c.AgentID, &c.WarehouseID, &c.Weight, &c.CollectedAt, &c.Notes,
			&c.Variant.Name, &c.Supplier.Name, &c.Agent.Username,
		)
		if err != nil {
			return nil, 0, err
		}
		collections = append(collections, c)
	}

	return collections, total, nil
}
