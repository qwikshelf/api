package postgres

import (
	"context"
	"github.com/qwikshelf/api/internal/domain/entity"
)

// AuditLogRepository implements repository.AuditLogRepository
type AuditLogRepository struct {
	db *DB
}

// NewAuditLogRepository creates a new audit log repository
func NewAuditLogRepository(db *DB) *AuditLogRepository {
	return &AuditLogRepository{db: db}
}

// Create inserts a new audit log entry
func (r *AuditLogRepository) Create(ctx context.Context, log *entity.AuditLog) error {
	query := `
		INSERT INTO audit_logs (user_id, method, path, query, body, status_code, ip_address, user_agent, latency_ms, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING id
	`
	return r.db.Pool.QueryRow(ctx, query,
		log.UserID, log.Method, log.Path, log.Query, log.Body, log.StatusCode, 
		log.IPAddress, log.UserAgent, log.LatencyMS, log.CreatedAt,
	).Scan(&log.ID)
}

// List retrieves all audit logs with pagination
func (r *AuditLogRepository) List(ctx context.Context, offset, limit int) ([]*entity.AuditLog, int64, error) {
	query := `
		SELECT id, user_id, method, path, query, body, status_code, ip_address, user_agent, latency_ms, created_at, COUNT(*) OVER()
		FROM audit_logs
		ORDER BY created_at DESC
		LIMIT $1 OFFSET $2
	`
	rows, err := r.db.Pool.Query(ctx, query, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var logs []*entity.AuditLog
	var total int64
	for rows.Next() {
		log := &entity.AuditLog{}
		err := rows.Scan(
			&log.ID, &log.UserID, &log.Method, &log.Path, &log.Query, &log.Body, 
			&log.StatusCode, &log.IPAddress, &log.UserAgent, &log.LatencyMS, &log.CreatedAt, &total,
		)
		if err != nil {
			return nil, 0, err
		}
		logs = append(logs, log)
	}

	return logs, total, nil
}

// GetByUserID retrieves audit logs for a specific user
func (r *AuditLogRepository) GetByUserID(ctx context.Context, userID int64, offset, limit int) ([]*entity.AuditLog, int64, error) {
	query := `
		SELECT id, user_id, method, path, query, body, status_code, ip_address, user_agent, latency_ms, created_at, COUNT(*) OVER()
		FROM audit_logs
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`
	rows, err := r.db.Pool.Query(ctx, query, userID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var logs []*entity.AuditLog
	var total int64
	for rows.Next() {
		log := &entity.AuditLog{}
		err := rows.Scan(
			&log.ID, &log.UserID, &log.Method, &log.Path, &log.Query, &log.Body, 
			&log.StatusCode, &log.IPAddress, &log.UserAgent, &log.LatencyMS, &log.CreatedAt, &total,
		)
		if err != nil {
			return nil, 0, err
		}
		logs = append(logs, log)
	}

	return logs, total, nil
}
