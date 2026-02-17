package service

import (
	"context"

	"github.com/qwikshelf/api/internal/domain/entity"
	domainErrors "github.com/qwikshelf/api/internal/domain/errors"
	"github.com/qwikshelf/api/internal/domain/repository"
)

// UserService handles user management logic
type UserService struct {
	userRepo repository.UserRepository
	roleRepo repository.RoleRepository
	hasher   PasswordHasher
}

// NewUserService creates a new user service
func NewUserService(userRepo repository.UserRepository, roleRepo repository.RoleRepository, hasher PasswordHasher) *UserService {
	return &UserService{
		userRepo: userRepo,
		roleRepo: roleRepo,
		hasher:   hasher,
	}
}

// Create creates a new user
func (s *UserService) Create(ctx context.Context, username, password string, roleID int64, isActive bool) (*entity.User, error) {
	// Check if username exists
	exists, err := s.userRepo.ExistsByUsername(ctx, username)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, domainErrors.ErrUsernameExists
	}

	// Verify role exists
	role, err := s.roleRepo.GetByID(ctx, roleID)
	if err != nil {
		return nil, domainErrors.ErrRoleNotFound
	}

	// Hash password
	hash, err := s.hasher.Hash(password)
	if err != nil {
		return nil, err
	}

	user := &entity.User{
		Username:     username,
		PasswordHash: hash,
		RoleID:       roleID,
		Role:         role,
		IsActive:     isActive,
	}

	if err := s.userRepo.Create(ctx, user); err != nil {
		return nil, err
	}

	return user, nil
}

// GetByID retrieves a user by ID
func (s *UserService) GetByID(ctx context.Context, id int64) (*entity.User, error) {
	user, err := s.userRepo.GetByID(ctx, id)
	if err != nil {
		return nil, domainErrors.ErrUserNotFound
	}
	return user, nil
}

// List retrieves all users with pagination
func (s *UserService) List(ctx context.Context, offset, limit int) ([]entity.User, int64, error) {
	return s.userRepo.List(ctx, offset, limit)
}

// Update updates an existing user
func (s *UserService) Update(ctx context.Context, id int64, username, password *string, roleID *int64, isActive *bool) (*entity.User, error) {
	user, err := s.userRepo.GetByID(ctx, id)
	if err != nil {
		return nil, domainErrors.ErrUserNotFound
	}

	if username != nil && *username != user.Username {
		exists, err := s.userRepo.ExistsByUsername(ctx, *username)
		if err != nil {
			return nil, err
		}
		if exists {
			return nil, domainErrors.ErrUsernameExists
		}
		user.Username = *username
	}

	if password != nil {
		hash, err := s.hasher.Hash(*password)
		if err != nil {
			return nil, err
		}
		user.PasswordHash = hash
	}

	if roleID != nil {
		if _, err := s.roleRepo.GetByID(ctx, *roleID); err != nil {
			return nil, domainErrors.ErrRoleNotFound
		}
		user.RoleID = *roleID
	}

	if isActive != nil {
		user.IsActive = *isActive
	}

	if err := s.userRepo.Update(ctx, user); err != nil {
		return nil, err
	}

	return user, nil
}

// Delete deletes a user
func (s *UserService) Delete(ctx context.Context, id int64) error {
	if _, err := s.userRepo.GetByID(ctx, id); err != nil {
		return domainErrors.ErrUserNotFound
	}
	return s.userRepo.Delete(ctx, id)
}
