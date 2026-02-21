package repository

import (
	"context"

	"github.com/qwikshelf/api/internal/domain/entity"
)

// SessionRepository defines the interface for session persistence
type SessionRepository interface {
	Create(ctx context.Context, session *entity.UserSession) error
	GetByID(ctx context.Context, id string) (*entity.UserSession, error)
	GetByRefreshTokenHash(ctx context.Context, hash string) (*entity.UserSession, error)
	Update(ctx context.Context, session *entity.UserSession) error
	Delete(ctx context.Context, id string) error
	RevokeByUserID(ctx context.Context, userID int64) error
	ListByUserID(ctx context.Context, userID int64) ([]*entity.UserSession, error)
}
