package postgres

import (
	"context"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/qwikshelf/api/internal/domain/entity"
	domainErrors "github.com/qwikshelf/api/internal/domain/errors"
)

type CustomerRepository struct {
	pool *pgxpool.Pool
}

func NewCustomerRepository(db *DB) *CustomerRepository {
	return &CustomerRepository{pool: db.Pool}
}

func (r *CustomerRepository) Create(ctx context.Context, customer *entity.Customer) error {
	query := `
		INSERT INTO customers (
			name, phone, email, address, gst_number, credit_limit, 
			payment_terms, customer_category, delivery_route, internal_notes, 
			zone_id, latitude, longitude
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
		RETURNING id, created_at, updated_at
	`
	err := r.pool.QueryRow(ctx, query,
		customer.Name, customer.Phone, customer.Email, customer.Address,
		customer.GSTNumber, customer.CreditLimit, customer.PaymentTerms,
		customer.CustomerCategory, customer.DeliveryRoute, customer.InternalNotes,
		customer.ZoneID, customer.Latitude, customer.Longitude,
	).Scan(&customer.ID, &customer.CreatedAt, &customer.UpdatedAt)

	if err != nil {
		if strings.Contains(err.Error(), "customers_phone_key") {
			return fmt.Errorf("phone number already exists: %w", domainErrors.ErrInvalidInput)
		}
		return fmt.Errorf("failed to create customer: %w", err)
	}

	// Fetch zone name if zone_id was provided
	if customer.ZoneID != nil {
		var zName string
		err := r.pool.QueryRow(ctx, "SELECT name FROM delivery_zones WHERE id = $1", *customer.ZoneID).Scan(&zName)
		if err == nil {
			customer.ZoneName = zName
		}
	}

	return nil
}

func (r *CustomerRepository) Update(ctx context.Context, customer *entity.Customer) error {
	query := `
		UPDATE customers 
		SET name = $1, phone = $2, email = $3, address = $4, gst_number = $5,
		    credit_limit = $6, payment_terms = $7, customer_category = $8,
			delivery_route = $9, internal_notes = $10, zone_id = $11, 
			latitude = $12, longitude = $13, updated_at = CURRENT_TIMESTAMP
		WHERE id = $14
		RETURNING updated_at
	`
	err := r.pool.QueryRow(ctx, query,
		customer.Name, customer.Phone, customer.Email, customer.Address,
		customer.GSTNumber, customer.CreditLimit, customer.PaymentTerms,
		customer.CustomerCategory, customer.DeliveryRoute, customer.InternalNotes,
		customer.ZoneID, customer.Latitude, customer.Longitude, customer.ID,
	).Scan(&customer.UpdatedAt)

	if err != nil {
		if err == pgx.ErrNoRows {
			return domainErrors.ErrCustomerNotFound
		}
		if strings.Contains(err.Error(), "customers_phone_key") {
			return fmt.Errorf("phone number already exists: %w", domainErrors.ErrInvalidInput)
		}
		return fmt.Errorf("failed to update customer: %w", err)
	}

	if customer.ZoneID != nil {
		var zName string
		_ = r.pool.QueryRow(ctx, "SELECT name FROM delivery_zones WHERE id = $1", *customer.ZoneID).Scan(&zName)
		customer.ZoneName = zName
	}

	return nil
}

func (r *CustomerRepository) GetByID(ctx context.Context, id int64) (*entity.Customer, error) {
	query := `
		SELECT c.id, c.name, c.phone, c.email, c.address, c.gst_number, c.credit_limit,
		       c.payment_terms, c.customer_category, c.delivery_route, c.internal_notes,
			   c.zone_id, c.latitude, c.longitude, c.created_at, c.updated_at,
			   COALESCE(dz.name, '') as zone_name
		FROM customers c
		LEFT JOIN delivery_zones dz ON c.zone_id = dz.id
		WHERE c.id = $1
	`
	row := r.pool.QueryRow(ctx, query, id)
	return mapCustomerRow(row)
}

func (r *CustomerRepository) Delete(ctx context.Context, id int64) error {
	tag, err := r.pool.Exec(ctx, "DELETE FROM customers WHERE id = $1", id)
	if err != nil {
		return fmt.Errorf("failed to delete customer: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return domainErrors.ErrCustomerNotFound
	}
	return nil
}

func (r *CustomerRepository) List(ctx context.Context, offset, limit int) ([]*entity.Customer, int64, error) {
	var total int64
	err := r.pool.QueryRow(ctx, "SELECT COUNT(*) FROM customers").Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count customers: %w", err)
	}

	query := `
		SELECT c.id, c.name, c.phone, c.email, c.address, c.gst_number, c.credit_limit,
		       c.payment_terms, c.customer_category, c.delivery_route, c.internal_notes,
			   c.zone_id, c.latitude, c.longitude, c.created_at, c.updated_at,
			   COALESCE(dz.name, '') as zone_name
		FROM customers c
		LEFT JOIN delivery_zones dz ON c.zone_id = dz.id
		ORDER BY c.name ASC
		LIMIT $1 OFFSET $2
	`
	rows, err := r.pool.Query(ctx, query, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list customers: %w", err)
	}
	defer rows.Close()

	var customers []*entity.Customer
	for rows.Next() {
		c, err := mapCustomerRow(rows)
		if err != nil {
			return nil, 0, err
		}
		customers = append(customers, c)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("rows error: %w", err)
	}

	return customers, total, nil
}

type customerRow interface {
	Scan(dest ...any) error
}

func mapCustomerRow(row customerRow) (*entity.Customer, error) {
	var c entity.Customer
	err := row.Scan(
		&c.ID, &c.Name, &c.Phone, &c.Email, &c.Address, &c.GSTNumber, &c.CreditLimit,
		&c.PaymentTerms, &c.CustomerCategory, &c.DeliveryRoute, &c.InternalNotes,
		&c.ZoneID, &c.Latitude, &c.Longitude, &c.CreatedAt, &c.UpdatedAt, &c.ZoneName,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, domainErrors.ErrCustomerNotFound
		}
		return nil, fmt.Errorf("failed to scan customer: %w", err)
	}
	return &c, nil
}
