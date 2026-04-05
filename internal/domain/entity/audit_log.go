package entity

import "time"

// AuditLog represents a single audit log entry for a request
type AuditLog struct {
	ID         int64     `json:"id"`
	UserID     *int64    `json:"user_id,omitempty"`
	Method     string    `json:"method"`
	Path       string    `json:"path"`
	Query      string    `json:"query,omitempty"`
	Body       *string   `json:"body,omitempty"`
	StatusCode int       `json:"status_code"`
	IPAddress  string    `json:"ip_address,omitempty"`
	UserAgent  string    `json:"user_agent,omitempty"`
	LatencyMS  int64     `json:"latency_ms"`
	CreatedAt  time.Time `json:"created_at"`
}
