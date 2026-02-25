package service

import (
	"context"

	"github.com/shopspring/decimal"

	"github.com/qwikshelf/api/internal/domain/entity"
	domainErrors "github.com/qwikshelf/api/internal/domain/errors"
	"github.com/qwikshelf/api/internal/domain/repository"
)

// CategoryService handles category management logic
type CategoryService struct {
	categoryRepo repository.CategoryRepository
}

// NewCategoryService creates a new category service
func NewCategoryService(categoryRepo repository.CategoryRepository) *CategoryService {
	return &CategoryService{categoryRepo: categoryRepo}
}

// Create creates a new category
func (s *CategoryService) Create(ctx context.Context, name string) (*entity.Category, error) {
	category := &entity.Category{Name: name}
	if err := s.categoryRepo.Create(ctx, category); err != nil {
		return nil, err
	}
	return category, nil
}

// GetByID retrieves a category by ID
func (s *CategoryService) GetByID(ctx context.Context, id int64) (*entity.Category, error) {
	category, err := s.categoryRepo.GetByID(ctx, id)
	if err != nil {
		return nil, domainErrors.ErrCategoryNotFound
	}
	return category, nil
}

// List retrieves all categories
func (s *CategoryService) List(ctx context.Context) ([]entity.Category, error) {
	return s.categoryRepo.List(ctx)
}

// Update updates a category
func (s *CategoryService) Update(ctx context.Context, id int64, name string) (*entity.Category, error) {
	category, err := s.categoryRepo.GetByID(ctx, id)
	if err != nil {
		return nil, domainErrors.ErrCategoryNotFound
	}
	category.Name = name
	if err := s.categoryRepo.Update(ctx, category); err != nil {
		return nil, err
	}
	return category, nil
}

// Delete deletes a category
func (s *CategoryService) Delete(ctx context.Context, id int64) error {
	if _, err := s.categoryRepo.GetByID(ctx, id); err != nil {
		return domainErrors.ErrCategoryNotFound
	}
	return s.categoryRepo.Delete(ctx, id)
}

// ProductFamilyService handles product family management logic
type ProductFamilyService struct {
	familyRepo   repository.ProductFamilyRepository
	categoryRepo repository.CategoryRepository
}

// NewProductFamilyService creates a new product family service
func NewProductFamilyService(familyRepo repository.ProductFamilyRepository, categoryRepo repository.CategoryRepository) *ProductFamilyService {
	return &ProductFamilyService{
		familyRepo:   familyRepo,
		categoryRepo: categoryRepo,
	}
}

// Create creates a new product family
func (s *ProductFamilyService) Create(ctx context.Context, categoryID int64, name, description string) (*entity.ProductFamily, error) {
	// Verify category exists
	if _, err := s.categoryRepo.GetByID(ctx, categoryID); err != nil {
		return nil, domainErrors.ErrCategoryNotFound
	}

	family := &entity.ProductFamily{
		CategoryID:  categoryID,
		Name:        name,
		Description: description,
	}
	if err := s.familyRepo.Create(ctx, family); err != nil {
		return nil, err
	}
	return family, nil
}

// GetByID retrieves a product family by ID
func (s *ProductFamilyService) GetByID(ctx context.Context, id int64) (*entity.ProductFamily, error) {
	family, err := s.familyRepo.GetByID(ctx, id)
	if err != nil {
		return nil, domainErrors.ErrProductFamilyNotFound
	}
	return family, nil
}

// List retrieves all product families with pagination
func (s *ProductFamilyService) List(ctx context.Context, offset, limit int) ([]entity.ProductFamily, int64, error) {
	return s.familyRepo.List(ctx, offset, limit)
}

// Update updates a product family
func (s *ProductFamilyService) Update(ctx context.Context, id int64, categoryID *int64, name, description *string) (*entity.ProductFamily, error) {
	family, err := s.familyRepo.GetByID(ctx, id)
	if err != nil {
		return nil, domainErrors.ErrProductFamilyNotFound
	}

	if categoryID != nil {
		if _, err := s.categoryRepo.GetByID(ctx, *categoryID); err != nil {
			return nil, domainErrors.ErrCategoryNotFound
		}
		family.CategoryID = *categoryID
	}
	if name != nil {
		family.Name = *name
	}
	if description != nil {
		family.Description = *description
	}

	if err := s.familyRepo.Update(ctx, family); err != nil {
		return nil, err
	}
	return family, nil
}

// Delete deletes a product family
func (s *ProductFamilyService) Delete(ctx context.Context, id int64) error {
	if _, err := s.familyRepo.GetByID(ctx, id); err != nil {
		return domainErrors.ErrProductFamilyNotFound
	}
	return s.familyRepo.Delete(ctx, id)
}

// ProductVariantService handles product variant management logic
type ProductVariantService struct {
	variantRepo repository.ProductVariantRepository
	familyRepo  repository.ProductFamilyRepository
}

// NewProductVariantService creates a new product variant service
func NewProductVariantService(variantRepo repository.ProductVariantRepository, familyRepo repository.ProductFamilyRepository) *ProductVariantService {
	return &ProductVariantService{
		variantRepo: variantRepo,
		familyRepo:  familyRepo,
	}
}

// Create creates a new product variant
func (s *ProductVariantService) Create(ctx context.Context, familyID int64, name, sku, barcode, unit string, costPrice, sellingPrice decimal.Decimal, isManufactured bool, conversionFactor decimal.Decimal) (*entity.ProductVariant, error) {
	// Verify family exists
	if _, err := s.familyRepo.GetByID(ctx, familyID); err != nil {
		return nil, domainErrors.ErrProductFamilyNotFound
	}

	// Check SKU uniqueness
	exists, err := s.variantRepo.ExistsBySKU(ctx, sku)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, domainErrors.ErrSKUExists
	}

	// Check barcode uniqueness if provided
	if barcode != "" {
		exists, err := s.variantRepo.ExistsByBarcode(ctx, barcode)
		if err != nil {
			return nil, err
		}
		if exists {
			return nil, domainErrors.ErrBarcodeExists
		}
	}

	if unit == "" {
		unit = "piece"
	}

	if conversionFactor.IsZero() {
		conversionFactor = decimal.NewFromInt(1)
	}

	variant := &entity.ProductVariant{
		FamilyID:         familyID,
		Name:             name,
		SKU:              sku,
		Barcode:          barcode,
		Unit:             unit,
		CostPrice:        costPrice,
		SellingPrice:     sellingPrice,
		IsManufactured:   isManufactured,
		ConversionFactor: conversionFactor,
	}

	if err := s.variantRepo.Create(ctx, variant); err != nil {
		return nil, err
	}
	return variant, nil
}

// GetByID retrieves a product variant by ID
func (s *ProductVariantService) GetByID(ctx context.Context, id int64) (*entity.ProductVariant, error) {
	variant, err := s.variantRepo.GetByID(ctx, id)
	if err != nil {
		return nil, domainErrors.ErrProductVariantNotFound
	}
	return variant, nil
}

// List retrieves all product variants with pagination
func (s *ProductVariantService) List(ctx context.Context, offset, limit int) ([]entity.ProductVariant, int64, error) {
	return s.variantRepo.List(ctx, offset, limit)
}

// Update updates a product variant
func (s *ProductVariantService) Update(ctx context.Context, id int64, familyID *int64, name, sku, barcode *string, costPrice, sellingPrice *decimal.Decimal, isManufactured *bool, conversionFactor *decimal.Decimal) (*entity.ProductVariant, error) {
	variant, err := s.variantRepo.GetByID(ctx, id)
	if err != nil {
		return nil, domainErrors.ErrProductVariantNotFound
	}

	if familyID != nil {
		if _, err := s.familyRepo.GetByID(ctx, *familyID); err != nil {
			return nil, domainErrors.ErrProductFamilyNotFound
		}
		variant.FamilyID = *familyID
	}
	if name != nil {
		variant.Name = *name
	}
	if sku != nil && *sku != variant.SKU {
		exists, err := s.variantRepo.ExistsBySKU(ctx, *sku)
		if err != nil {
			return nil, err
		}
		if exists {
			return nil, domainErrors.ErrSKUExists
		}
		variant.SKU = *sku
	}
	if barcode != nil && *barcode != variant.Barcode {
		if *barcode != "" {
			exists, err := s.variantRepo.ExistsByBarcode(ctx, *barcode)
			if err != nil {
				return nil, err
			}
			if exists {
				return nil, domainErrors.ErrBarcodeExists
			}
		}
		variant.Barcode = *barcode
	}
	if costPrice != nil {
		variant.CostPrice = *costPrice
	}
	if sellingPrice != nil {
		variant.SellingPrice = *sellingPrice
	}
	if isManufactured != nil {
		variant.IsManufactured = *isManufactured
	}
	if conversionFactor != nil {
		variant.ConversionFactor = *conversionFactor
	}

	if err := s.variantRepo.Update(ctx, variant); err != nil {
		return nil, err
	}
	return variant, nil
}

// Delete deletes a product variant
func (s *ProductVariantService) Delete(ctx context.Context, id int64) error {
	if _, err := s.variantRepo.GetByID(ctx, id); err != nil {
		return domainErrors.ErrProductVariantNotFound
	}
	return s.variantRepo.Delete(ctx, id)
}
