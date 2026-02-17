package service

import (
	"context"

	"github.com/qwikshelf/api/internal/domain/entity"
	domainErrors "github.com/qwikshelf/api/internal/domain/errors"
	"github.com/qwikshelf/api/internal/domain/repository"
)

// RoleService handles role management logic
type RoleService struct {
	roleRepo       repository.RoleRepository
	permissionRepo repository.PermissionRepository
}

// NewRoleService creates a new role service
func NewRoleService(roleRepo repository.RoleRepository, permissionRepo repository.PermissionRepository) *RoleService {
	return &RoleService{
		roleRepo:       roleRepo,
		permissionRepo: permissionRepo,
	}
}

// Create creates a new role with optional permissions
func (s *RoleService) Create(ctx context.Context, name, description string, permissionIDs []int64) (*entity.Role, error) {
	role := &entity.Role{
		Name:        name,
		Description: description,
	}

	if err := s.roleRepo.Create(ctx, role); err != nil {
		return nil, err
	}

	if len(permissionIDs) > 0 {
		if err := s.roleRepo.SetPermissions(ctx, role.ID, permissionIDs); err != nil {
			return nil, err
		}
	}

	return role, nil
}

// GetByID retrieves a role by ID
func (s *RoleService) GetByID(ctx context.Context, id int64) (*entity.Role, error) {
	role, err := s.roleRepo.GetByID(ctx, id)
	if err != nil {
		return nil, domainErrors.ErrRoleNotFound
	}
	return role, nil
}

// GetWithPermissions retrieves a role with its permissions
func (s *RoleService) GetWithPermissions(ctx context.Context, id int64) (*entity.Role, []entity.Permission, error) {
	role, err := s.roleRepo.GetByID(ctx, id)
	if err != nil {
		return nil, nil, domainErrors.ErrRoleNotFound
	}

	permissions, err := s.roleRepo.GetPermissions(ctx, id)
	if err != nil {
		return nil, nil, err
	}

	return role, permissions, nil
}

// List retrieves all roles
func (s *RoleService) List(ctx context.Context) ([]entity.Role, error) {
	return s.roleRepo.List(ctx)
}

// Update updates an existing role
func (s *RoleService) Update(ctx context.Context, id int64, name, description *string, permissionIDs []int64) (*entity.Role, error) {
	role, err := s.roleRepo.GetByID(ctx, id)
	if err != nil {
		return nil, domainErrors.ErrRoleNotFound
	}

	if name != nil {
		role.Name = *name
	}
	if description != nil {
		role.Description = *description
	}

	if err := s.roleRepo.Update(ctx, role); err != nil {
		return nil, err
	}

	if permissionIDs != nil {
		if err := s.roleRepo.SetPermissions(ctx, id, permissionIDs); err != nil {
			return nil, err
		}
	}

	return role, nil
}

// Delete deletes a role
func (s *RoleService) Delete(ctx context.Context, id int64) error {
	if _, err := s.roleRepo.GetByID(ctx, id); err != nil {
		return domainErrors.ErrRoleNotFound
	}
	return s.roleRepo.Delete(ctx, id)
}

// ListPermissions retrieves all permissions
func (s *RoleService) ListPermissions(ctx context.Context) ([]entity.Permission, error) {
	return s.permissionRepo.List(ctx)
}
