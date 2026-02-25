package postgres

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"

	"github.com/qwikshelf/api/internal/domain/entity"
	domainErrors "github.com/qwikshelf/api/internal/domain/errors"
)

// CategoryRepository implements repository.CategoryRepository
type CategoryRepository struct {
	db *DB
}

// NewCategoryRepository creates a new category repository
func NewCategoryRepository(db *DB) *CategoryRepository {
	return &CategoryRepository{db: db}
}

// Create creates a new category
func (r *CategoryRepository) Create(ctx context.Context, category *entity.Category) error {
	query := `INSERT INTO categories (name) VALUES ($1) RETURNING id`
	return r.db.Pool.QueryRow(ctx, query, category.Name).Scan(&category.ID)
}

// GetByID retrieves a category by ID
func (r *CategoryRepository) GetByID(ctx context.Context, id int64) (*entity.Category, error) {
	query := `SELECT id, name FROM categories WHERE id = $1`
	c := &entity.Category{}
	err := r.db.Pool.QueryRow(ctx, query, id).Scan(&c.ID, &c.Name)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domainErrors.ErrCategoryNotFound
	}
	if err != nil {
		return nil, err
	}
	return c, nil
}

// List retrieves all categories
func (r *CategoryRepository) List(ctx context.Context) ([]entity.Category, error) {
	query := `SELECT id, name FROM categories ORDER BY id`
	rows, err := r.db.Pool.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var categories []entity.Category
	for rows.Next() {
		var c entity.Category
		if err := rows.Scan(&c.ID, &c.Name); err != nil {
			return nil, err
		}
		categories = append(categories, c)
	}
	return categories, rows.Err()
}

// Update updates a category
func (r *CategoryRepository) Update(ctx context.Context, category *entity.Category) error {
	query := `UPDATE categories SET name = $1 WHERE id = $2`
	result, err := r.db.Pool.Exec(ctx, query, category.Name, category.ID)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return domainErrors.ErrCategoryNotFound
	}
	return nil
}

// Delete deletes a category
func (r *CategoryRepository) Delete(ctx context.Context, id int64) error {
	query := `DELETE FROM categories WHERE id = $1`
	result, err := r.db.Pool.Exec(ctx, query, id)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return domainErrors.ErrCategoryNotFound
	}
	return nil
}

// ProductFamilyRepository implements repository.ProductFamilyRepository
type ProductFamilyRepository struct {
	db *DB
}

// NewProductFamilyRepository creates a new product family repository
func NewProductFamilyRepository(db *DB) *ProductFamilyRepository {
	return &ProductFamilyRepository{db: db}
}

// Create creates a new product family
func (r *ProductFamilyRepository) Create(ctx context.Context, family *entity.ProductFamily) error {
	query := `
		INSERT INTO product_families (category_id, name, description)
		VALUES ($1, $2, $3)
		RETURNING id
	`
	return r.db.Pool.QueryRow(ctx, query, family.CategoryID, family.Name, family.Description).Scan(&family.ID)
}

// GetByID retrieves a product family by ID
func (r *ProductFamilyRepository) GetByID(ctx context.Context, id int64) (*entity.ProductFamily, error) {
	query := `
		SELECT pf.id, pf.category_id, pf.name, pf.description, c.id, c.name
		FROM product_families pf
		LEFT JOIN categories c ON pf.category_id = c.id
		WHERE pf.id = $1
	`
	f := &entity.ProductFamily{Category: &entity.Category{}}
	err := r.db.Pool.QueryRow(ctx, query, id).Scan(
		&f.ID, &f.CategoryID, &f.Name, &f.Description,
		&f.Category.ID, &f.Category.Name,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domainErrors.ErrProductFamilyNotFound
	}
	if err != nil {
		return nil, err
	}
	return f, nil
}

// List retrieves all product families with pagination
func (r *ProductFamilyRepository) List(ctx context.Context, offset, limit int) ([]entity.ProductFamily, int64, error) {
	var total int64
	if err := r.db.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM product_families`).Scan(&total); err != nil {
		return nil, 0, err
	}

	query := `
		SELECT pf.id, pf.category_id, pf.name, pf.description, c.id, c.name
		FROM product_families pf
		LEFT JOIN categories c ON pf.category_id = c.id
		ORDER BY pf.id
		LIMIT $1 OFFSET $2
	`
	rows, err := r.db.Pool.Query(ctx, query, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var families []entity.ProductFamily
	for rows.Next() {
		f := entity.ProductFamily{Category: &entity.Category{}}
		if err := rows.Scan(
			&f.ID, &f.CategoryID, &f.Name, &f.Description,
			&f.Category.ID, &f.Category.Name,
		); err != nil {
			return nil, 0, err
		}
		families = append(families, f)
	}
	return families, total, rows.Err()
}

// ListByCategory retrieves product families by category
func (r *ProductFamilyRepository) ListByCategory(ctx context.Context, categoryID int64) ([]entity.ProductFamily, error) {
	query := `SELECT id, category_id, name, description FROM product_families WHERE category_id = $1 ORDER BY id`
	rows, err := r.db.Pool.Query(ctx, query, categoryID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var families []entity.ProductFamily
	for rows.Next() {
		var f entity.ProductFamily
		if err := rows.Scan(&f.ID, &f.CategoryID, &f.Name, &f.Description); err != nil {
			return nil, err
		}
		families = append(families, f)
	}
	return families, rows.Err()
}

// Update updates a product family
func (r *ProductFamilyRepository) Update(ctx context.Context, family *entity.ProductFamily) error {
	query := `UPDATE product_families SET category_id = $1, name = $2, description = $3 WHERE id = $4`
	result, err := r.db.Pool.Exec(ctx, query, family.CategoryID, family.Name, family.Description, family.ID)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return domainErrors.ErrProductFamilyNotFound
	}
	return nil
}

// Delete deletes a product family
func (r *ProductFamilyRepository) Delete(ctx context.Context, id int64) error {
	query := `DELETE FROM product_families WHERE id = $1`
	result, err := r.db.Pool.Exec(ctx, query, id)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return domainErrors.ErrProductFamilyNotFound
	}
	return nil
}

// ProductVariantRepository implements repository.ProductVariantRepository
type ProductVariantRepository struct {
	db *DB
}

// NewProductVariantRepository creates a new product variant repository
func NewProductVariantRepository(db *DB) *ProductVariantRepository {
	return &ProductVariantRepository{db: db}
}

// Create creates a new product variant
func (r *ProductVariantRepository) Create(ctx context.Context, variant *entity.ProductVariant) error {
	if variant.Unit == "" {
		variant.Unit = "piece"
	}

	var barcode interface{} = variant.Barcode
	if variant.Barcode == "" {
		barcode = nil
	}

	query := `
		INSERT INTO product_variants (family_id, name, sku, barcode, unit, cost_price, selling_price, is_manufactured, conversion_factor)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id
	`
	return r.db.Pool.QueryRow(ctx, query,
		variant.FamilyID, variant.Name, variant.SKU, barcode, variant.Unit,
		variant.CostPrice, variant.SellingPrice, variant.IsManufactured, variant.ConversionFactor,
	).Scan(&variant.ID)
}

// GetByID retrieves a product variant by ID
func (r *ProductVariantRepository) GetByID(ctx context.Context, id int64) (*entity.ProductVariant, error) {
	query := `
		SELECT id, family_id, name, sku, barcode, unit, cost_price, selling_price, is_manufactured, conversion_factor
		FROM product_variants WHERE id = $1
	`
	v := &entity.ProductVariant{}
	var barcode *string
	err := r.db.Pool.QueryRow(ctx, query, id).Scan(
		&v.ID, &v.FamilyID, &v.Name, &v.SKU, &barcode, &v.Unit,
		&v.CostPrice, &v.SellingPrice, &v.IsManufactured, &v.ConversionFactor,
	)
	if barcode != nil {
		v.Barcode = *barcode
	}
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domainErrors.ErrProductVariantNotFound
	}
	if err != nil {
		return nil, err
	}
	return v, nil
}

// GetBySKU retrieves a product variant by SKU
func (r *ProductVariantRepository) GetBySKU(ctx context.Context, sku string) (*entity.ProductVariant, error) {
	query := `
		SELECT id, family_id, name, sku, barcode, unit, cost_price, selling_price, is_manufactured, conversion_factor
		FROM product_variants WHERE sku = $1
	`
	v := &entity.ProductVariant{}
	var barcode *string
	err := r.db.Pool.QueryRow(ctx, query, sku).Scan(
		&v.ID, &v.FamilyID, &v.Name, &v.SKU, &barcode, &v.Unit,
		&v.CostPrice, &v.SellingPrice, &v.IsManufactured, &v.ConversionFactor,
	)
	if barcode != nil {
		v.Barcode = *barcode
	}
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domainErrors.ErrProductVariantNotFound
	}
	if err != nil {
		return nil, err
	}
	return v, nil
}

// GetByBarcode retrieves a product variant by barcode
func (r *ProductVariantRepository) GetByBarcode(ctx context.Context, barcode string) (*entity.ProductVariant, error) {
	query := `
		SELECT id, family_id, name, sku, barcode, unit, cost_price, selling_price, is_manufactured, conversion_factor
		FROM product_variants WHERE barcode = $1
	`
	v := &entity.ProductVariant{}
	var barcodeVal *string
	err := r.db.Pool.QueryRow(ctx, query, barcode).Scan(
		&v.ID, &v.FamilyID, &v.Name, &v.SKU, &barcodeVal, &v.Unit,
		&v.CostPrice, &v.SellingPrice, &v.IsManufactured, &v.ConversionFactor,
	)
	if barcodeVal != nil {
		v.Barcode = *barcodeVal
	}
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domainErrors.ErrProductVariantNotFound
	}
	if err != nil {
		return nil, err
	}
	return v, nil
}

// List retrieves all product variants with pagination
func (r *ProductVariantRepository) List(ctx context.Context, offset, limit int) ([]entity.ProductVariant, int64, error) {
	var total int64
	if err := r.db.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM product_variants`).Scan(&total); err != nil {
		return nil, 0, err
	}

	query := `
		SELECT id, family_id, name, sku, barcode, unit, cost_price, selling_price, is_manufactured, conversion_factor
		FROM product_variants
		ORDER BY id
		LIMIT $1 OFFSET $2
	`
	rows, err := r.db.Pool.Query(ctx, query, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var variants []entity.ProductVariant
	for rows.Next() {
		var v entity.ProductVariant
		var barcode *string
		if err := rows.Scan(
			&v.ID, &v.FamilyID, &v.Name, &v.SKU, &barcode, &v.Unit,
			&v.CostPrice, &v.SellingPrice, &v.IsManufactured, &v.ConversionFactor,
		); err != nil {
			return nil, 0, err
		}
		if barcode != nil {
			v.Barcode = *barcode
		}
		variants = append(variants, v)
	}
	return variants, total, rows.Err()
}

// ListByFamily retrieves product variants by family
func (r *ProductVariantRepository) ListByFamily(ctx context.Context, familyID int64) ([]entity.ProductVariant, error) {
	query := `
		SELECT id, family_id, name, sku, barcode, unit, cost_price, selling_price, is_manufactured, conversion_factor
		FROM product_variants WHERE family_id = $1 ORDER BY id
	`
	rows, err := r.db.Pool.Query(ctx, query, familyID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var variants []entity.ProductVariant
	for rows.Next() {
		var v entity.ProductVariant
		var barcode *string
		if err := rows.Scan(
			&v.ID, &v.FamilyID, &v.Name, &v.SKU, &barcode, &v.Unit,
			&v.CostPrice, &v.SellingPrice, &v.IsManufactured, &v.ConversionFactor,
		); err != nil {
			return nil, err
		}
		if barcode != nil {
			v.Barcode = *barcode
		}
		variants = append(variants, v)
	}
	return variants, rows.Err()
}

// Update updates a product variant
func (r *ProductVariantRepository) Update(ctx context.Context, variant *entity.ProductVariant) error {
	var barcode interface{} = variant.Barcode
	if variant.Barcode == "" {
		barcode = nil
	}

	query := `
		UPDATE product_variants 
		SET family_id = $1, name = $2, sku = $3, barcode = $4, unit = $5, cost_price = $6, selling_price = $7, is_manufactured = $8, conversion_factor = $9 
		WHERE id = $10
	`
	result, err := r.db.Pool.Exec(ctx, query,
		variant.FamilyID, variant.Name, variant.SKU, barcode, variant.Unit,
		variant.CostPrice, variant.SellingPrice, variant.IsManufactured, variant.ConversionFactor, variant.ID,
	)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return domainErrors.ErrProductVariantNotFound
	}
	return nil
}

// Delete deletes a product variant
func (r *ProductVariantRepository) Delete(ctx context.Context, id int64) error {
	query := `DELETE FROM product_variants WHERE id = $1`
	result, err := r.db.Pool.Exec(ctx, query, id)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return domainErrors.ErrProductVariantNotFound
	}
	return nil
}

// ExistsBySKU checks if a SKU exists
func (r *ProductVariantRepository) ExistsBySKU(ctx context.Context, sku string) (bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM product_variants WHERE sku = $1)`
	var exists bool
	err := r.db.Pool.QueryRow(ctx, query, sku).Scan(&exists)
	return exists, err
}

// ExistsByBarcode checks if a barcode exists
func (r *ProductVariantRepository) ExistsByBarcode(ctx context.Context, barcode string) (bool, error) {
	if barcode == "" {
		return false, nil
	}
	query := `SELECT EXISTS(SELECT 1 FROM product_variants WHERE barcode = $1)`
	var exists bool
	err := r.db.Pool.QueryRow(ctx, query, barcode).Scan(&exists)
	return exists, err
}
