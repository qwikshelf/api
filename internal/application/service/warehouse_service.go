package service

import (
	"context"

	"github.com/qwikshelf/api/internal/domain/entity"
	domainErrors "github.com/qwikshelf/api/internal/domain/errors"
	"github.com/qwikshelf/api/internal/domain/repository"
)

// WarehouseService handles warehouse management logic
type WarehouseService struct {
	warehouseRepo repository.WarehouseRepository
}

// NewWarehouseService creates a new warehouse service
func NewWarehouseService(warehouseRepo repository.WarehouseRepository) *WarehouseService {
	return &WarehouseService{warehouseRepo: warehouseRepo}
}

// Create creates a new warehouse
func (s *WarehouseService) Create(ctx context.Context, name string, warehouseType entity.WarehouseType, address string) (*entity.Warehouse, error) {
	if !warehouseType.IsValid() {
		return nil, domainErrors.ErrInvalidInput
	}

	warehouse := &entity.Warehouse{
		Name:    name,
		Type:    warehouseType,
		Address: address,
	}

	if err := s.warehouseRepo.Create(ctx, warehouse); err != nil {
		return nil, err
	}
	return warehouse, nil
}

// GetByID retrieves a warehouse by ID
func (s *WarehouseService) GetByID(ctx context.Context, id int64) (*entity.Warehouse, error) {
	warehouse, err := s.warehouseRepo.GetByID(ctx, id)
	if err != nil {
		return nil, domainErrors.ErrWarehouseNotFound
	}
	return warehouse, nil
}

// List retrieves all warehouses
func (s *WarehouseService) List(ctx context.Context) ([]entity.Warehouse, error) {
	return s.warehouseRepo.List(ctx)
}

// ListByType retrieves warehouses by type
func (s *WarehouseService) ListByType(ctx context.Context, warehouseType entity.WarehouseType) ([]entity.Warehouse, error) {
	return s.warehouseRepo.ListByType(ctx, warehouseType)
}

// Update updates a warehouse
func (s *WarehouseService) Update(ctx context.Context, id int64, name *string, warehouseType *entity.WarehouseType, address *string) (*entity.Warehouse, error) {
	warehouse, err := s.warehouseRepo.GetByID(ctx, id)
	if err != nil {
		return nil, domainErrors.ErrWarehouseNotFound
	}

	if name != nil {
		warehouse.Name = *name
	}
	if warehouseType != nil {
		if !warehouseType.IsValid() {
			return nil, domainErrors.ErrInvalidInput
		}
		warehouse.Type = *warehouseType
	}
	if address != nil {
		warehouse.Address = *address
	}

	if err := s.warehouseRepo.Update(ctx, warehouse); err != nil {
		return nil, err
	}
	return warehouse, nil
}

// Delete deletes a warehouse
func (s *WarehouseService) Delete(ctx context.Context, id int64) error {
	if _, err := s.warehouseRepo.GetByID(ctx, id); err != nil {
		return domainErrors.ErrWarehouseNotFound
	}
	return s.warehouseRepo.Delete(ctx, id)
}

// SupplierService handles supplier management logic
type SupplierService struct {
	supplierRepo repository.SupplierRepository
}

// NewSupplierService creates a new supplier service
func NewSupplierService(supplierRepo repository.SupplierRepository) *SupplierService {
	return &SupplierService{supplierRepo: supplierRepo}
}

// Create creates a new supplier
func (s *SupplierService) Create(ctx context.Context, name, phone, location string) (*entity.Supplier, error) {
	supplier := &entity.Supplier{
		Name:     name,
		Phone:    phone,
		Location: location,
	}

	if err := s.supplierRepo.Create(ctx, supplier); err != nil {
		return nil, err
	}
	return supplier, nil
}

// GetByID retrieves a supplier by ID
func (s *SupplierService) GetByID(ctx context.Context, id int64) (*entity.Supplier, error) {
	supplier, err := s.supplierRepo.GetByID(ctx, id)
	if err != nil {
		return nil, domainErrors.ErrSupplierNotFound
	}
	return supplier, nil
}

// List retrieves all suppliers with pagination
func (s *SupplierService) List(ctx context.Context, offset, limit int) ([]entity.Supplier, int64, error) {
	return s.supplierRepo.List(ctx, offset, limit)
}

// Update updates a supplier
func (s *SupplierService) Update(ctx context.Context, id int64, name, phone, location *string) (*entity.Supplier, error) {
	supplier, err := s.supplierRepo.GetByID(ctx, id)
	if err != nil {
		return nil, domainErrors.ErrSupplierNotFound
	}

	if name != nil {
		supplier.Name = *name
	}
	if phone != nil {
		supplier.Phone = *phone
	}
	if location != nil {
		supplier.Location = *location
	}

	if err := s.supplierRepo.Update(ctx, supplier); err != nil {
		return nil, err
	}
	return supplier, nil
}

// Delete deletes a supplier
func (s *SupplierService) Delete(ctx context.Context, id int64) error {
	if _, err := s.supplierRepo.GetByID(ctx, id); err != nil {
		return domainErrors.ErrSupplierNotFound
	}
	return s.supplierRepo.Delete(ctx, id)
}

// AddVariant links a product variant to a supplier
func (s *SupplierService) AddVariant(ctx context.Context, supplierID int64, sv *entity.SupplierVariant) error {
	if _, err := s.supplierRepo.GetByID(ctx, supplierID); err != nil {
		return domainErrors.ErrSupplierNotFound
	}
	sv.SupplierID = supplierID
	return s.supplierRepo.AddVariant(ctx, sv)
}

// GetVariants retrieves all product variants for a supplier with full details
func (s *SupplierService) GetVariants(ctx context.Context, supplierID int64) ([]entity.SupplierVariant, error) {
	if _, err := s.supplierRepo.GetByID(ctx, supplierID); err != nil {
		return nil, domainErrors.ErrSupplierNotFound
	}
	return s.supplierRepo.GetVariants(ctx, supplierID)
}

// RemoveVariant unlinks a product variant from a supplier
func (s *SupplierService) RemoveVariant(ctx context.Context, supplierID, variantID int64) error {
	if _, err := s.supplierRepo.GetByID(ctx, supplierID); err != nil {
		return domainErrors.ErrSupplierNotFound
	}
	return s.supplierRepo.RemoveVariant(ctx, supplierID, variantID)
}
