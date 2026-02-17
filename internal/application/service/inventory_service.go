package service

import (
	"context"
	"time"

	"github.com/shopspring/decimal"

	"github.com/qwikshelf/api/internal/domain/entity"
	domainErrors "github.com/qwikshelf/api/internal/domain/errors"
	"github.com/qwikshelf/api/internal/domain/repository"
)

// InventoryService handles inventory management logic
type InventoryService struct {
	inventoryRepo repository.InventoryRepository
	warehouseRepo repository.WarehouseRepository
	variantRepo   repository.ProductVariantRepository
}

// NewInventoryService creates a new inventory service
func NewInventoryService(
	inventoryRepo repository.InventoryRepository,
	warehouseRepo repository.WarehouseRepository,
	variantRepo repository.ProductVariantRepository,
) *InventoryService {
	return &InventoryService{
		inventoryRepo: inventoryRepo,
		warehouseRepo: warehouseRepo,
		variantRepo:   variantRepo,
	}
}

// GetLevel retrieves inventory level for a specific warehouse and variant
func (s *InventoryService) GetLevel(ctx context.Context, warehouseID, variantID int64) (*entity.InventoryLevel, error) {
	return s.inventoryRepo.GetLevel(ctx, warehouseID, variantID)
}

// ListByWarehouse retrieves all inventory levels for a warehouse
func (s *InventoryService) ListByWarehouse(ctx context.Context, warehouseID int64) ([]entity.InventoryLevel, error) {
	// Verify warehouse exists
	if _, err := s.warehouseRepo.GetByID(ctx, warehouseID); err != nil {
		return nil, domainErrors.ErrWarehouseNotFound
	}
	return s.inventoryRepo.GetLevelsByWarehouse(ctx, warehouseID)
}

// List retrieves all inventory levels with pagination
func (s *InventoryService) List(ctx context.Context, warehouseID *int64, offset, limit int) ([]entity.InventoryLevel, int64, error) {
	if warehouseID != nil {
		levels, err := s.ListByWarehouse(ctx, *warehouseID)
		if err != nil {
			return nil, 0, err
		}
		// Calculate manual pagination for warehouse-filtered list since repo doesn't support it yet
		// This is a temporary solution until ListByWarehouse supports pagination
		total := int64(len(levels))
		start := offset
		if start > len(levels) {
			start = len(levels)
		}
		end := offset + limit
		if end > len(levels) {
			end = len(levels)
		}
		return levels[start:end], total, nil
	}
	return s.inventoryRepo.List(ctx, offset, limit)
}

// Adjust adjusts inventory level for a specific warehouse and variant
func (s *InventoryService) Adjust(ctx context.Context, warehouseID, variantID int64, quantityDelta decimal.Decimal) (*entity.InventoryLevel, error) {
	// Verify warehouse exists
	if _, err := s.warehouseRepo.GetByID(ctx, warehouseID); err != nil {
		return nil, domainErrors.ErrWarehouseNotFound
	}

	// Verify variant exists
	if _, err := s.variantRepo.GetByID(ctx, variantID); err != nil {
		return nil, domainErrors.ErrProductVariantNotFound
	}

	// Perform adjustment
	if err := s.inventoryRepo.AdjustLevel(ctx, warehouseID, variantID, quantityDelta); err != nil {
		return nil, err
	}

	// Return updated level
	return s.inventoryRepo.GetLevel(ctx, warehouseID, variantID)
}

// Transfer creates an inventory transfer between warehouses
func (s *InventoryService) Transfer(ctx context.Context, sourceWarehouseID, destWarehouseID, authorizedByUserID int64, items []entity.InventoryTransferItem) (*entity.InventoryTransfer, error) {
	// Validate warehouses are different
	if sourceWarehouseID == destWarehouseID {
		return nil, domainErrors.ErrSameWarehouse
	}

	// Verify source warehouse exists
	if _, err := s.warehouseRepo.GetByID(ctx, sourceWarehouseID); err != nil {
		return nil, domainErrors.ErrWarehouseNotFound
	}

	// Verify destination warehouse exists
	if _, err := s.warehouseRepo.GetByID(ctx, destWarehouseID); err != nil {
		return nil, domainErrors.ErrWarehouseNotFound
	}

	// Validate and check stock for each item
	for _, item := range items {
		if item.Quantity.LessThanOrEqual(decimal.Zero) {
			return nil, domainErrors.ErrInvalidQuantity
		}

		// Verify variant exists
		if _, err := s.variantRepo.GetByID(ctx, item.VariantID); err != nil {
			return nil, domainErrors.ErrProductVariantNotFound
		}

		// Check stock level at source
		level, err := s.inventoryRepo.GetLevel(ctx, sourceWarehouseID, item.VariantID)
		if err != nil {
			return nil, err
		}
		if level.Quantity.LessThan(item.Quantity) {
			return nil, domainErrors.ErrInsufficientStock
		}
	}

	// Create transfer
	transfer := &entity.InventoryTransfer{
		SourceWarehouseID:      sourceWarehouseID,
		DestinationWarehouseID: destWarehouseID,
		AuthorizedByUserID:     authorizedByUserID,
		TransferredAt:          time.Now(),
		Status:                 entity.TransferStatusPending,
		Items:                  items,
	}

	if err := s.inventoryRepo.CreateTransfer(ctx, transfer); err != nil {
		return nil, err
	}

	// Deduct from source and add to destination
	for _, item := range items {
		// Deduct from source
		if err := s.inventoryRepo.AdjustLevel(ctx, sourceWarehouseID, item.VariantID, item.Quantity.Neg()); err != nil {
			return nil, err
		}
		// Add to destination
		if err := s.inventoryRepo.AdjustLevel(ctx, destWarehouseID, item.VariantID, item.Quantity); err != nil {
			return nil, err
		}
	}

	// Update transfer status to completed
	if err := s.inventoryRepo.UpdateTransferStatus(ctx, transfer.ID, entity.TransferStatusCompleted); err != nil {
		return nil, err
	}
	transfer.Status = entity.TransferStatusCompleted

	return transfer, nil
}

// ListTransfers retrieves all transfers with pagination
func (s *InventoryService) ListTransfers(ctx context.Context, offset, limit int) ([]entity.InventoryTransfer, int64, error) {
	return s.inventoryRepo.ListTransfers(ctx, offset, limit)
}

// GetTransfer retrieves a transfer by ID
func (s *InventoryService) GetTransfer(ctx context.Context, id int64) (*entity.InventoryTransfer, error) {
	transfer, err := s.inventoryRepo.GetTransferByID(ctx, id)
	if err != nil {
		return nil, domainErrors.ErrTransferNotFound
	}
	return transfer, nil
}
