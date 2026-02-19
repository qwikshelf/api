package service

import (
	"context"

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

	// 2. Validate all items and check stock
	for _, item := range sale.Items {
		// Verify variant exists
		if _, err := s.variantRepo.GetByID(ctx, item.VariantID); err != nil {
			return domainErrors.ErrProductVariantNotFound
		}

		// Check stock level at warehouse
		level, err := s.inventoryRepo.GetLevel(ctx, sale.WarehouseID, item.VariantID)
		if err != nil {
			return err
		}
		if level.Quantity.LessThan(item.Quantity) {
			return domainErrors.ErrInsufficientStock
		}
	}

	// 3. Record the sale in the repository (includes item creation)
	sale.CalculateTotals()
	if err := s.saleRepo.Create(ctx, sale); err != nil {
		return err
	}

	// 4. Deduct inventory for each item
	for _, item := range sale.Items {
		if err := s.inventoryRepo.AdjustLevel(ctx, sale.WarehouseID, item.VariantID, item.Quantity.Neg()); err != nil {
			// Note: In a production app, we would use a single DB transaction for sale + adjustments.
			// Our SaleRepository uses a transaction for the sale itself, but AdjustLevel is separate.
			// This could be improved by passing the TX or using an atomic unit of work.
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
func (s *SaleService) List(ctx context.Context, warehouseID *int64, offset, limit int) ([]entity.Sale, int64, error) {
	return s.saleRepo.List(ctx, warehouseID, offset, limit)
}
