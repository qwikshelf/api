package service

import (
	"context"
	"time"

	"github.com/shopspring/decimal"

	"github.com/qwikshelf/api/internal/domain/entity"
	domainErrors "github.com/qwikshelf/api/internal/domain/errors"
	"github.com/qwikshelf/api/internal/domain/repository"
)

// SaleService handles sale/POS logic
type SaleService struct {
	saleRepo      repository.SaleRepository
	inventoryRepo repository.InventoryRepository
	variantRepo   repository.ProductVariantRepository
	warehouseRepo repository.WarehouseRepository
}

// NewSaleService creates a new sale service
func NewSaleService(
	saleRepo repository.SaleRepository,
	inventoryRepo repository.InventoryRepository,
	variantRepo repository.ProductVariantRepository,
	warehouseRepo repository.WarehouseRepository,
) *SaleService {
	return &SaleService{
		saleRepo:      saleRepo,
		inventoryRepo: inventoryRepo,
		variantRepo:   variantRepo,
		warehouseRepo: warehouseRepo,
	}
}

// ProcessSale validates stock and records a new sale
func (s *SaleService) ProcessSale(ctx context.Context, sale *entity.Sale) error {
	// 1. Verify warehouse exists
	if _, err := s.warehouseRepo.GetByID(ctx, sale.WarehouseID); err != nil {
		return domainErrors.ErrWarehouseNotFound
	}

	// 2. Validate all items, resolve base variants, and check stock
	type resolvedItem struct {
		baseVariantID int64
		deductQty     decimal.Decimal
	}
	resolved := make([]resolvedItem, len(sale.Items))

	for i, item := range sale.Items {
		// Verify variant exists and get its conversion factor + family
		variant, err := s.variantRepo.GetByID(ctx, item.VariantID)
		if err != nil {
			return domainErrors.ErrProductVariantNotFound
		}

		factor := variant.ConversionFactor
		if factor.IsZero() {
			factor = decimal.NewFromInt(1)
		}

		// Calculate actual base-unit quantity to deduct
		deductQty := item.Quantity.Mul(factor)

		// Find the base variant (conversion_factor = 1) in the same family
		baseVariantID := variant.ID
		if factor.GreaterThan(decimal.NewFromInt(1)) {
			siblings, err := s.variantRepo.ListByFamily(ctx, variant.FamilyID)
			if err != nil {
				return err
			}
			for _, sib := range siblings {
				cf := sib.ConversionFactor
				if cf.IsZero() {
					cf = decimal.NewFromInt(1)
				}
				if cf.Equal(decimal.NewFromInt(1)) {
					baseVariantID = sib.ID
					break
				}
			}
		}

		// Check stock level at warehouse using base variant
		level, err := s.inventoryRepo.GetLevel(ctx, sale.WarehouseID, baseVariantID)
		if err != nil {
			return err
		}
		if level.Quantity.LessThan(deductQty) {
			return domainErrors.ErrInsufficientStock
		}

		resolved[i] = resolvedItem{baseVariantID: baseVariantID, deductQty: deductQty}
	}

	// 3. Record the sale in the repository (includes item creation)
	sale.CalculateTotals()
	if err := s.saleRepo.Create(ctx, sale); err != nil {
		return err
	}

	// 4. Deduct inventory from base variants
	for _, r := range resolved {
		if err := s.inventoryRepo.AdjustLevel(ctx, sale.WarehouseID, r.baseVariantID, r.deductQty.Neg()); err != nil {
			return err
		}
	}

	return nil
}

// GetByID retrieves a sale with full details
func (s *SaleService) GetByID(ctx context.Context, id int64) (*entity.Sale, error) {
	return s.saleRepo.GetByID(ctx, id)
}

// List retrieves all sales with pagination and filtering
func (s *SaleService) List(ctx context.Context, warehouseID *int64, startDate, endDate *time.Time, offset, limit int) ([]entity.Sale, int64, error) {
	return s.saleRepo.List(ctx, warehouseID, startDate, endDate, offset, limit)
}
