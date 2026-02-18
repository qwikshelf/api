package service

import (
	"context"

	"github.com/shopspring/decimal"

	"github.com/qwikshelf/api/internal/domain/entity"
	domainErrors "github.com/qwikshelf/api/internal/domain/errors"
	"github.com/qwikshelf/api/internal/domain/repository"
)

// ProcurementService handles procurement/purchase order logic
type ProcurementService struct {
	procurementRepo repository.ProcurementRepository
	supplierRepo    repository.SupplierRepository
	inventoryRepo   repository.InventoryRepository
	warehouseRepo   repository.WarehouseRepository
	variantRepo     repository.ProductVariantRepository
}

// NewProcurementService creates a new procurement service
func NewProcurementService(
	procurementRepo repository.ProcurementRepository,
	supplierRepo repository.SupplierRepository,
	inventoryRepo repository.InventoryRepository,
	warehouseRepo repository.WarehouseRepository,
	variantRepo repository.ProductVariantRepository,
) *ProcurementService {
	return &ProcurementService{
		procurementRepo: procurementRepo,
		supplierRepo:    supplierRepo,
		inventoryRepo:   inventoryRepo,
		warehouseRepo:   warehouseRepo,
		variantRepo:     variantRepo,
	}
}

// Create creates a new purchase order
func (s *ProcurementService) Create(ctx context.Context, procurement *entity.Procurement) error {
	// Verify supplier exists
	if _, err := s.supplierRepo.GetByID(ctx, procurement.SupplierID); err != nil {
		return domainErrors.ErrSupplierNotFound
	}

	// Verify warehouse exists
	if _, err := s.warehouseRepo.GetByID(ctx, procurement.WarehouseID); err != nil {
		return domainErrors.ErrWarehouseNotFound
	}

	// Verify all variants exist
	for _, item := range procurement.Items {
		if _, err := s.variantRepo.GetByID(ctx, item.VariantID); err != nil {
			return domainErrors.ErrProductVariantNotFound
		}
	}

	if procurement.Status == "" {
		procurement.Status = entity.ProcurementStatusPending
	}

	return s.procurementRepo.Create(ctx, procurement)
}

// GetByID retrieves a procurement with full details
func (s *ProcurementService) GetByID(ctx context.Context, id int64) (*entity.Procurement, error) {
	return s.procurementRepo.GetByID(ctx, id)
}

// List retrieves all procurements with pagination
func (s *ProcurementService) List(ctx context.Context, offset, limit int) ([]entity.Procurement, int64, error) {
	return s.procurementRepo.List(ctx, offset, limit)
}

// ListBySupplier retrieves procurements for a supplier
func (s *ProcurementService) ListBySupplier(ctx context.Context, supplierID int64) ([]entity.Procurement, error) {
	return s.procurementRepo.ListBySupplier(ctx, supplierID)
}

// UpdateStatus updates the status of a procurement
func (s *ProcurementService) UpdateStatus(ctx context.Context, id int64, status entity.ProcurementStatus) error {
	if !status.IsValid() {
		return domainErrors.ErrInvalidInput
	}

	// If marking as received, auto-adjust inventory
	if status == entity.ProcurementStatusReceived {
		procurement, err := s.procurementRepo.GetByID(ctx, id)
		if err != nil {
			return err
		}
		for _, item := range procurement.Items {
			qty := item.QuantityOrdered
			if !item.QuantityReceived.IsZero() {
				qty = item.QuantityReceived
			}
			if err := s.inventoryRepo.AdjustLevel(ctx, procurement.WarehouseID, item.VariantID, qty); err != nil {
				return err
			}
		}
	}

	return s.procurementRepo.UpdateStatus(ctx, id, status)
}

// ReceiveItems updates received quantities for procurement items
func (s *ProcurementService) ReceiveItems(ctx context.Context, id int64, items []struct {
	ItemID           int64
	QuantityReceived decimal.Decimal
}) error {
	// Verify procurement exists
	if _, err := s.procurementRepo.GetByID(ctx, id); err != nil {
		return err
	}

	for _, item := range items {
		qty, _ := item.QuantityReceived.Float64()
		if err := s.procurementRepo.UpdateItemReceived(ctx, item.ItemID, qty); err != nil {
			return err
		}
	}
	return nil
}
