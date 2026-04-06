package middleware

import (
	"bytes"
	"io"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/qwikshelf/api/internal/application/service"
	"github.com/qwikshelf/api/internal/domain/entity"
)

// AuditMiddleware handles recording request activity for auditing
type AuditMiddleware struct {
	auditService *service.AuditService
}

// NewAuditMiddleware creates a new audit middleware
func NewAuditMiddleware(auditService *service.AuditService) *AuditMiddleware {
	return &AuditMiddleware{auditService: auditService}
}

// Audit returns a Gin middleware that records logs
func (m *AuditMiddleware) Audit() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()

		// 1. Capture metadata
		method := c.Request.Method
		path := c.Request.URL.Path

		// Skip audit for OPTIONS requests (CORS preflight) and health checks
		if method == "OPTIONS" || path == "/health" || path == "/favicon.ico" {
			c.Next()
			return
		}

		query := c.Request.URL.RawQuery
		ip := c.ClientIP()
		ua := c.Request.UserAgent()

		// 2. Capture request body for mutating requests
		var body *string
		if method == "POST" || method == "PUT" || method == "PATCH" || method == "DELETE" {
			if c.Request.Body != nil {
				bodyBytes, _ := io.ReadAll(c.Request.Body)
				bodyStr := string(bodyBytes)
				body = &bodyStr
				// Restore body for handlers
				c.Request.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))
			}
		}

		// 3. Process the request
		c.Next()

		// 4. Capture post-execution metrics
		latency := time.Since(start).Milliseconds()
		statusCode := c.Writer.Status()

		// 5. Build log entry
		logEntry := &entity.AuditLog{
			Method:     method,
			Path:       path,
			Query:      query,
			Body:       body,
			StatusCode: statusCode,
			IPAddress:  ip,
			UserAgent:  ua,
			LatencyMS:  latency,
			CreatedAt:  time.Now(),
		}

		// 6. Set user ID if authenticated
		if userID, exists := c.Get("user_id"); exists {
			if id, ok := userID.(int64); ok {
				logEntry.UserID = &id
			}
		}

		// 7. Send to service for async processing
		m.auditService.LogRequest(logEntry)
	}
}
