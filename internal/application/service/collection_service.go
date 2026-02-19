package service

import (
	"context"
	"time"

	"github.com/qwikshelf/api/internal/domain/entity"
	domainErrors "github.com/qwikshelf/api/internal/domain/errors"
	"github.com/qwikshelf/api/internal/domain/repository"
)

type CollectionService struct {
	collectionRepo repository.CollectionRepository
	inventoryRepo  repository.InventoryRepository
	variantRepo    repository.ProductVariantRepository
	warehouseRepo  repository.WarehouseRepository
	supplierRepo   repository.SupplierRepository
}

func NewCollectionService(
	collectionRepo repository.CollectionRepository,
	inventoryRepo repository.InventoryRepository,
	variantRepo repository.ProductVariantRepository,
	warehouseRepo repository.WarehouseRepository,
	supplierRepo repository.SupplierRepository,
) *CollectionService {
	return &CollectionService{
		collectionRepo: collectionRepo,
		inventoryRepo:  inventoryRepo,
		variantRepo:    variantRepo,
		warehouseRepo:  warehouseRepo,
		supplierRepo:   supplierRepo,
	}
}

func (s *CollectionService) RecordCollection(ctx context.Context, collection *entity.Collection) error {
	// 1. Verify existence
	if _, err := s.variantRepo.GetByID(ctx, collection.VariantID); err != nil {
		return domainErrors.ErrProductVariantNotFound
	}
	if _, err := s.supplierRepo.GetByID(ctx, collection.SupplierID); err != nil {
		return domainErrors.ErrSupplierNotFound
	}

	// 2. Set default warehouse if not provided (Main Warehouse)
	if collection.WarehouseID == 0 {
		// In a real app, this might be a config or a specific ID = 1
		collection.WarehouseID = 1
	}
	if _, err := s.warehouseRepo.GetByID(ctx, collection.WarehouseID); err != nil {
		return domainErrors.ErrWarehouseNotFound
	}

	// 3. Set time if not provided
	if collection.CollectedAt.IsZero() {
		collection.CollectedAt = time.Now()
	}

	// 4. Record the collection
	if err := s.collectionRepo.Create(ctx, collection); err != nil {
		return err
	}

	// 5. Update inventory in the Main Warehouse (Add weight as quantity)
	// Note: We use the weight recorded by the agent as the quantity increase.
	if err := s.inventoryRepo.AdjustLevel(ctx, collection.WarehouseID, collection.VariantID, collection.Weight); err != nil {
		return err
	}

	return nil
}

func (s *CollectionService) ListCollections(ctx context.Context, offset, limit int) ([]entity.Collection, int64, error) {
	return s.collectionRepo.List(ctx, offset, limit)
}
