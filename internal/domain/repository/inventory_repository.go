package repository

import (
	"context"

	"github.com/shopspring/decimal"

	"github.com/qwikshelf/api/internal/domain/entity"
)

// InventoryRepository defines the interface for inventory data access
type InventoryRepository interface {
	// Inventory Levels
	GetLevel(ctx context.Context, warehouseID, variantID int64) (*entity.InventoryLevel, error)
	GetLevelsByWarehouse(ctx context.Context, warehouseID int64) ([]entity.InventoryLevel, error)
	GetLevelsByVariant(ctx context.Context, variantID int64) ([]entity.InventoryLevel, error)
	List(ctx context.Context, offset, limit int) ([]entity.InventoryLevel, int64, error)
	SetLevel(ctx context.Context, level *entity.InventoryLevel) error
	AdjustLevel(ctx context.Context, warehouseID, variantID int64, quantityDelta decimal.Decimal) error

	// Transfers
	CreateTransfer(ctx context.Context, transfer *entity.InventoryTransfer) error
	GetTransferByID(ctx context.Context, id int64) (*entity.InventoryTransfer, error)
	ListTransfers(ctx context.Context, offset, limit int) ([]entity.InventoryTransfer, int64, error)
	UpdateTransferStatus(ctx context.Context, id int64, status entity.TransferStatus) error

	// Batch operations
	GetExpiringStock(ctx context.Context, daysUntilExpiry int) ([]entity.InventoryLevel, error)
	GetLowStock(ctx context.Context, threshold decimal.Decimal) ([]entity.InventoryLevel, error)
}

// ProcurementRepository defines the interface for procurement data access
type ProcurementRepository interface {
	Create(ctx context.Context, procurement *entity.Procurement) error
	GetByID(ctx context.Context, id int64) (*entity.Procurement, error)
	List(ctx context.Context, offset, limit int) ([]entity.Procurement, int64, error)
	ListBySupplier(ctx context.Context, supplierID int64) ([]entity.Procurement, error)
	UpdateStatus(ctx context.Context, id int64, status entity.ProcurementStatus) error
	UpdateItemReceived(ctx context.Context, itemID int64, quantityReceived float64) error
}

// ProductionRepository defines the interface for production data access
type ProductionRepository interface {
	CreateRun(ctx context.Context, run *entity.ProductionRun) error
	GetRunByID(ctx context.Context, id int64) (*entity.ProductionRun, error)
	ListRuns(ctx context.Context, offset, limit int) ([]entity.ProductionRun, int64, error)
	AddLog(ctx context.Context, log *entity.ProductionLog) error
	GetLogsByRun(ctx context.Context, runID int64) ([]entity.ProductionLog, error)
}
