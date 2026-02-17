package middleware

import (
	"bytes"
	"io"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog"

	"github.com/qwikshelf/api/pkg/logger"
)

// bodyLogWriter wraps gin.ResponseWriter to capture the response body.
type bodyLogWriter struct {
	gin.ResponseWriter
	body *bytes.Buffer
}

func (w *bodyLogWriter) Write(b []byte) (int, error) {
	w.body.Write(b)
	return w.ResponseWriter.Write(b)
}

// RequestLogger returns a Gin middleware that logs every request and response as structured JSON.
func RequestLogger() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()

		// Read request body (for POST/PUT)
		var reqBody string
		if c.Request.Body != nil && (c.Request.Method == "POST" || c.Request.Method == "PUT" || c.Request.Method == "PATCH") {
			bodyBytes, _ := io.ReadAll(c.Request.Body)
			reqBody = string(bodyBytes)
			// Restore the body so handlers can read it
			c.Request.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))
		}

		// Wrap response writer to capture response body
		blw := &bodyLogWriter{body: bytes.NewBufferString(""), ResponseWriter: c.Writer}
		c.Writer = blw

		// Process request
		c.Next()

		// Calculate latency
		latency := time.Since(start)
		status := c.Writer.Status()

		// Build log event
		var event *zerolog.Event
		if status >= 500 {
			event = logger.Error()
		} else if status >= 400 {
			event = logger.Warn()
		} else {
			event = logger.Info()
		}

		event.
			Str("type", "request").
			Str("method", c.Request.Method).
			Str("path", c.Request.URL.Path).
			Str("query", c.Request.URL.RawQuery).
			Int("status", status).
			Dur("latency", latency).
			Str("client_ip", c.ClientIP()).
			Str("user_agent", c.Request.UserAgent())

		// Add request body for mutating requests (truncated to 2KB)
		if reqBody != "" {
			if len(reqBody) > 2048 {
				reqBody = reqBody[:2048] + "...(truncated)"
			}
			event.Str("request_body", reqBody)
		}

		// Add user info if authenticated
		if userID, exists := c.Get("user_id"); exists {
			event.Interface("user_id", userID)
		}

		// Add request ID if present
		if requestID, exists := c.Get("request_id"); exists {
			event.Interface("request_id", requestID)
		}

		// Add response body for errors (truncated to 1KB)
		if status >= 400 {
			respBody := blw.body.String()
			if len(respBody) > 1024 {
				respBody = respBody[:1024] + "...(truncated)"
			}
			event.Str("response_body", respBody)
		}

		// Add any Gin errors
		if len(c.Errors) > 0 {
			event.Str("gin_errors", c.Errors.String())
		}

		event.Msg("HTTP request")
	}
}

// RecoveryLogger returns a Gin middleware that recovers from panics and logs them.
func RecoveryLogger() gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if err := recover(); err != nil {
				logger.Error().
					Str("type", "panic").
					Interface("error", err).
					Str("method", c.Request.Method).
					Str("path", c.Request.URL.Path).
					Msg("Recovered from panic")

				c.AbortWithStatusJSON(500, gin.H{
					"success": false,
					"error": gin.H{
						"code":    "INTERNAL_ERROR",
						"message": "An unexpected error occurred",
					},
				})
			}
		}()
		c.Next()
	}
}
