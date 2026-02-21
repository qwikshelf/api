package entity

import (
	"time"
)

// UserSession represents a user's active session
type UserSession struct {
	ID                string    `json:"id"`
	UserID            int64     `json:"user_id"`
	RefreshTokenHash  string    `json:"-"`
	DeviceInfo        string    `json:"device_info"`
	IPAddress         string    `json:"ip_address"`
	IsRevoked         bool      `json:"is_revoked"`
	CreatedAt         time.Time `json:"created_at"`
	ExpiresAt         time.Time `json:"expires_at"`
	LastUsedAt        time.Time `json:"last_used_at"`
}

// IsExpired checks if the session has expired
func (s *UserSession) IsExpired() bool {
	return time.Now().After(s.ExpiresAt)
}

// IsValid checks if the session is active and not revoked
func (s *UserSession) IsValid() bool {
	return !s.IsRevoked && !s.IsExpired()
}
