package repository

import (
	"context"
	"github.com/qwikshelf/api/internal/domain/entity"
)

// AuditLogRepository defines the interface for audit log data access
type AuditLogRepository interface {
	Create(ctx context.Context, log *entity.AuditLog) error
	List(ctx context.Context, offset, limit int) ([]*entity.AuditLog, int64, error)
	GetByUserID(ctx context.Context, userID int64, offset, limit int) ([]*entity.AuditLog, int64, error)
}
