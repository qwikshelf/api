package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"

	"github.com/qwikshelf/api/pkg/response"
)

// AuthMiddleware handles JWT authentication
type AuthMiddleware struct {
	secret string
}

// NewAuthMiddleware creates a new auth middleware
func NewAuthMiddleware(secret string) *AuthMiddleware {
	return &AuthMiddleware{secret: secret}
}

// Claims represents JWT claims
type Claims struct {
	UserID   int64  `json:"user_id"`
	Username string `json:"username"`
	RoleID   int64  `json:"role_id"`
	jwt.RegisteredClaims
}

// Authenticate returns a Gin middleware that validates JWT tokens
func (m *AuthMiddleware) Authenticate() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			response.Unauthorized(c, "Authorization header required")
			c.Abort()
			return
		}

		// Extract token from "Bearer <token>"
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			response.Unauthorized(c, "Invalid authorization header format")
			c.Abort()
			return
		}

		tokenString := parts[1]

		// Parse and validate token
		token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, jwt.ErrSignatureInvalid
			}
			return []byte(m.secret), nil
		})

		if err != nil {
			response.Unauthorized(c, "Invalid or expired token")
			c.Abort()
			return
		}

		claims, ok := token.Claims.(*Claims)
		if !ok || !token.Valid {
			response.Unauthorized(c, "Invalid token claims")
			c.Abort()
			return
		}

		// Set user info in context
		c.Set("user_id", claims.UserID)
		c.Set("username", claims.Username)
		c.Set("role_id", claims.RoleID)

		c.Next()
	}
}

// GetUserID extracts user ID from context
func GetUserID(c *gin.Context) int64 {
	if id, exists := c.Get("user_id"); exists {
		return id.(int64)
	}
	return 0
}

// GetUsername extracts username from context
func GetUsername(c *gin.Context) string {
	if username, exists := c.Get("username"); exists {
		return username.(string)
	}
	return ""
}

// GetRoleID extracts role ID from context
func GetRoleID(c *gin.Context) int64 {
	if id, exists := c.Get("role_id"); exists {
		return id.(int64)
	}
	return 0
}

// RequirePermission returns a middleware that checks for a specific permission
// Note: This requires loading permissions for the user, simplified for now
func (m *AuthMiddleware) RequirePermission(permission string) gin.HandlerFunc {
	return func(c *gin.Context) {
		// For now, just check if user is authenticated
		// TODO: Implement permission checking
		if GetUserID(c) == 0 {
			response.Forbidden(c, "Permission denied")
			c.Abort()
			return
		}
		c.Next()
	}
}

// OptionalAuth returns a middleware that validates JWT tokens if present but doesn't require them
func (m *AuthMiddleware) OptionalAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.Next()
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			c.Next()
			return
		}

		tokenString := parts[1]

		token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, jwt.ErrSignatureInvalid
			}
			return []byte(m.secret), nil
		})

		if err != nil || !token.Valid {
			c.Next()
			return
		}

		claims, ok := token.Claims.(*Claims)
		if ok && token.Valid {
			c.Set("user_id", claims.UserID)
			c.Set("username", claims.Username)
			c.Set("role_id", claims.RoleID)
		}

		c.Next()
	}
}

// RateLimit returns a simple rate limiting middleware (placeholder)
func RateLimit(requestsPerSecond int) gin.HandlerFunc {
	return func(c *gin.Context) {
		// TODO: Implement proper rate limiting with Redis
		c.Next()
	}
}

// RequestID adds a unique request ID to each request
func RequestID() gin.HandlerFunc {
	return func(c *gin.Context) {
		requestID := c.GetHeader("X-Request-ID")
		if requestID == "" {
			requestID = generateRequestID()
		}
		c.Set("request_id", requestID)
		c.Header("X-Request-ID", requestID)
		c.Next()
	}
}

func generateRequestID() string {
	// Simple implementation - in production use UUID
	return "req_" + randomString(16)
}

func randomString(n int) string {
	const letters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, n)
	for i := range b {
		b[i] = letters[i%len(letters)]
	}
	return string(b)
}

// ContentType sets default content type
func ContentType() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Content-Type", "application/json")
		c.Next()
	}
}

// NotFoundHandler handles 404 errors
func NotFoundHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "NOT_FOUND",
				"message": "The requested resource was not found",
			},
		})
	}
}
