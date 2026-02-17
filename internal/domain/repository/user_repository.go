package repository

import (
	"context"

	"github.com/qwikshelf/api/internal/domain/entity"
)

// UserRepository defines the interface for user data access
type UserRepository interface {
	// Create creates a new user
	Create(ctx context.Context, user *entity.User) error

	// GetByID retrieves a user by ID
	GetByID(ctx context.Context, id int64) (*entity.User, error)

	// GetByUsername retrieves a user by username
	GetByUsername(ctx context.Context, username string) (*entity.User, error)

	// List retrieves all users with pagination
	List(ctx context.Context, offset, limit int) ([]entity.User, int64, error)

	// Update updates an existing user
	Update(ctx context.Context, user *entity.User) error

	// Delete deletes a user by ID
	Delete(ctx context.Context, id int64) error

	// ExistsByUsername checks if a username exists
	ExistsByUsername(ctx context.Context, username string) (bool, error)
}

// RoleRepository defines the interface for role data access
type RoleRepository interface {
	// Create creates a new role
	Create(ctx context.Context, role *entity.Role) error

	// GetByID retrieves a role by ID
	GetByID(ctx context.Context, id int64) (*entity.Role, error)

	// GetByName retrieves a role by name
	GetByName(ctx context.Context, name string) (*entity.Role, error)

	// List retrieves all roles
	List(ctx context.Context) ([]entity.Role, error)

	// Update updates an existing role
	Update(ctx context.Context, role *entity.Role) error

	// Delete deletes a role by ID
	Delete(ctx context.Context, id int64) error

	// GetPermissions retrieves all permissions for a role
	GetPermissions(ctx context.Context, roleID int64) ([]entity.Permission, error)

	// SetPermissions sets the permissions for a role
	SetPermissions(ctx context.Context, roleID int64, permissionIDs []int64) error
}

// PermissionRepository defines the interface for permission data access
type PermissionRepository interface {
	// Create creates a new permission
	Create(ctx context.Context, permission *entity.Permission) error

	// GetByID retrieves a permission by ID
	GetByID(ctx context.Context, id int64) (*entity.Permission, error)

	// GetBySlug retrieves a permission by slug
	GetBySlug(ctx context.Context, slug string) (*entity.Permission, error)

	// List retrieves all permissions
	List(ctx context.Context) ([]entity.Permission, error)

	// Delete deletes a permission by ID
	Delete(ctx context.Context, id int64) error
}
