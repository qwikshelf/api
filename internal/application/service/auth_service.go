package service

import (
	"context"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"github.com/qwikshelf/api/internal/config"
	"github.com/qwikshelf/api/internal/domain/entity"
	domainErrors "github.com/qwikshelf/api/internal/domain/errors"
	"github.com/qwikshelf/api/internal/domain/repository"
)

// PasswordHasher defines the interface for password hashing
type PasswordHasher interface {
	Hash(password string) (string, error)
	Compare(password, hash string) error
}

// AuthService handles authentication logic
type AuthService struct {
	userRepo repository.UserRepository
	hasher   PasswordHasher
	jwtCfg   config.JWTConfig
}

// NewAuthService creates a new auth service
func NewAuthService(userRepo repository.UserRepository, hasher PasswordHasher, jwtCfg config.JWTConfig) *AuthService {
	return &AuthService{
		userRepo: userRepo,
		hasher:   hasher,
		jwtCfg:   jwtCfg,
	}
}

// Claims represents JWT claims
type Claims struct {
	UserID   int64  `json:"user_id"`
	Username string `json:"username"`
	RoleID   int64  `json:"role_id"`
	jwt.RegisteredClaims
}

// LoginResult contains the result of a successful login
type LoginResult struct {
	Token     string
	ExpiresAt time.Time
	User      *entity.User
}

// Login authenticates a user and returns a JWT token
func (s *AuthService) Login(ctx context.Context, username, password string) (*LoginResult, error) {
	// Get user by username
	user, err := s.userRepo.GetByUsername(ctx, username)

	if err != nil {
		return nil, domainErrors.ErrInvalidCredentials
	}

	// Check if user is active
	if !user.IsActive {
		return nil, domainErrors.ErrUserInactive
	}

	// Verify password
	if err := s.hasher.Compare(password, user.PasswordHash); err != nil {
		return nil, domainErrors.ErrInvalidCredentials
	}

	// Generate JWT token
	expiresAt := time.Now().Add(time.Duration(s.jwtCfg.ExpiryHours) * time.Hour)
	claims := &Claims{
		UserID:   user.ID,
		Username: user.Username,
		RoleID:   user.RoleID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expiresAt),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Subject:   user.Username,
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(s.jwtCfg.Secret))
	if err != nil {
		return nil, err
	}

	return &LoginResult{
		Token:     tokenString,
		ExpiresAt: expiresAt,
		User:      user,
	}, nil
}

// ValidateToken validates a JWT token and returns the claims
func (s *AuthService) ValidateToken(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, domainErrors.ErrInvalidToken
		}
		return []byte(s.jwtCfg.Secret), nil
	})

	if err != nil {
		return nil, domainErrors.ErrInvalidToken
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, domainErrors.ErrInvalidToken
	}

	return claims, nil
}

// GetUserByID retrieves a user by ID (for /me endpoint)
func (s *AuthService) GetUserByID(ctx context.Context, id int64) (*entity.User, error) {
	return s.userRepo.GetByID(ctx, id)
}
