package postgres

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/qwikshelf/api/internal/domain/entity"
)

// SessionRepository implements repository.SessionRepository
type SessionRepository struct {
	db *DB
}

// NewSessionRepository creates a new session repository
func NewSessionRepository(db *DB) *SessionRepository {
	return &SessionRepository{db: db}
}

// Create creates a new session
func (r *SessionRepository) Create(ctx context.Context, s *entity.UserSession) error {
	query := `
		INSERT INTO user_sessions (user_id, refresh_token_hash, device_info, ip_address, expires_at)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, created_at, last_used_at
	`
	return r.db.Pool.QueryRow(ctx, query,
		s.UserID, s.RefreshTokenHash, s.DeviceInfo, s.IPAddress, s.ExpiresAt,
	).Scan(&s.ID, &s.CreatedAt, &s.LastUsedAt)
}

// GetByID retrieves a session by ID
func (r *SessionRepository) GetByID(ctx context.Context, id string) (*entity.UserSession, error) {
	query := `
		SELECT id, user_id, refresh_token_hash, device_info, ip_address, is_revoked, created_at, expires_at, last_used_at
		FROM user_sessions
		WHERE id = $1
	`
	s := &entity.UserSession{}
	err := r.db.Pool.QueryRow(ctx, query, id).Scan(
		&s.ID, &s.UserID, &s.RefreshTokenHash, &s.DeviceInfo, &s.IPAddress, &s.IsRevoked, &s.CreatedAt, &s.ExpiresAt, &s.LastUsedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, errors.New("session not found")
	}
	if err != nil {
		return nil, err
	}
	return s, nil
}

// GetByRefreshTokenHash retrieves a session by refresh token hash
func (r *SessionRepository) GetByRefreshTokenHash(ctx context.Context, hash string) (*entity.UserSession, error) {
	query := `
		SELECT id, user_id, refresh_token_hash, device_info, ip_address, is_revoked, created_at, expires_at, last_used_at
		FROM user_sessions
		WHERE refresh_token_hash = $1
	`
	s := &entity.UserSession{}
	err := r.db.Pool.QueryRow(ctx, query, hash).Scan(
		&s.ID, &s.UserID, &s.RefreshTokenHash, &s.DeviceInfo, &s.IPAddress, &s.IsRevoked, &s.CreatedAt, &s.ExpiresAt, &s.LastUsedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, errors.New("session not found")
	}
	if err != nil {
		return nil, err
	}
	return s, nil
}

// Update updates an existing session
func (r *SessionRepository) Update(ctx context.Context, s *entity.UserSession) error {
	query := `
		UPDATE user_sessions
		SET refresh_token_hash = $1, is_revoked = $2, last_used_at = NOW()
		WHERE id = $3
	`
	_, err := r.db.Pool.Exec(ctx, query, s.RefreshTokenHash, s.IsRevoked, s.ID)
	return err
}

// Delete removes a session
func (r *SessionRepository) Delete(ctx context.Context, id string) error {
	query := `DELETE FROM user_sessions WHERE id = $1`
	_, err := r.db.Pool.Exec(ctx, query, id)
	return err
}

// RevokeByUserID revokes all sessions for a user
func (r *SessionRepository) RevokeByUserID(ctx context.Context, userID int64) error {
	query := `UPDATE user_sessions SET is_revoked = true WHERE user_id = $1`
	_, err := r.db.Pool.Exec(ctx, query, userID)
	return err
}

// ListByUserID retrieves all sessions for a user
func (r *SessionRepository) ListByUserID(ctx context.Context, userID int64) ([]*entity.UserSession, error) {
	query := `
		SELECT id, user_id, refresh_token_hash, device_info, ip_address, is_revoked, created_at, expires_at, last_used_at
		FROM user_sessions
		WHERE user_id = $1
		ORDER BY created_at DESC
	`
	rows, err := r.db.Pool.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var sessions []*entity.UserSession
	for rows.Next() {
		s := &entity.UserSession{}
		err := rows.Scan(
			&s.ID, &s.UserID, &s.RefreshTokenHash, &s.DeviceInfo, &s.IPAddress, &s.IsRevoked, &s.CreatedAt, &s.ExpiresAt, &s.LastUsedAt,
		)
		if err != nil {
			return nil, err
		}
		sessions = append(sessions, s)
	}
	return sessions, nil
}
