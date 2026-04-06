package service

import (
	"context"
	"encoding/json"
	"strings"
	"time"

	"github.com/qwikshelf/api/internal/domain/entity"
	"github.com/qwikshelf/api/internal/domain/repository"
	"github.com/qwikshelf/api/pkg/logger"
)

// AuditService handles request logging and sanitization
type AuditService struct {
	repo    repository.AuditLogRepository
	logChan chan *entity.AuditLog
}

// NewAuditService creates a new audit service and starts the background worker
func NewAuditService(repo repository.AuditLogRepository) *AuditService {
	s := &AuditService{
		repo:    repo,
		logChan: make(chan *entity.AuditLog, 1000), // Buffered channel
	}
	go s.startWorker()
	return s
}

// LogRequest asynchronously logs a request
func (s *AuditService) LogRequest(log *entity.AuditLog) {
	// Sanitize body before sending to channel
	if log.Body != nil && *log.Body != "" {
		sanitized := s.sanitizeJSON(*log.Body)
		log.Body = &sanitized
	}

	select {
	case s.logChan <- log:
		// Sent successfully
	default:
		// Channel full, drop log to prevent blocking request
		logger.Warn().Msg("Audit log channel full, dropping log entry")
	}
}

// startWorker processes logs from the channel and saves them to the database
func (s *AuditService) startWorker() {
	for logEntry := range s.logChan {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		if err := s.repo.Create(ctx, logEntry); err != nil {
			logger.Error().Err(err).Msg("Failed to save audit log")
		}
		cancel()
	}
}

// sanitizeJSON redacts sensitive fields from a JSON string
func (s *AuditService) sanitizeJSON(input string) string {
	var data map[string]interface{}
	if err := json.Unmarshal([]byte(input), &data); err != nil {
		return input // Not a JSON or invalid, return as is
	}

	s.sanitizeMap(data)

	sanitized, err := json.Marshal(data)
	if err != nil {
		return input
	}

	return string(sanitized)
}

// sanitizeMap recursively redacts sensitive fields in a map
func (s *AuditService) sanitizeMap(data map[string]interface{}) {
	sensitiveKeys := []string{"password", "token", "refresh_token", "old_password", "new_password", "secret"}

	for k, v := range data {
		// Check for sensitive key
		isSensitive := false
		lowerK := strings.ToLower(k)
		for _, sk := range sensitiveKeys {
			if strings.Contains(lowerK, sk) {
				isSensitive = true
				break
			}
		}

		if isSensitive {
			data[k] = "[REDACTED]"
			continue
		}

		// Recurse into maps
		if m, ok := v.(map[string]interface{}); ok {
			s.sanitizeMap(m)
		}

		// Recurse into slices of maps
		if l, ok := v.([]interface{}); ok {
			for _, item := range l {
				if m, ok := item.(map[string]interface{}); ok {
					s.sanitizeMap(m)
				}
			}
		}
	}
}
