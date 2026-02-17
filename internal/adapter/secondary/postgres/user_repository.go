package postgres

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"

	"github.com/qwikshelf/api/internal/domain/entity"
	domainErrors "github.com/qwikshelf/api/internal/domain/errors"
)

// UserRepository implements repository.UserRepository
type UserRepository struct {
	db *DB
}

// NewUserRepository creates a new user repository
func NewUserRepository(db *DB) *UserRepository {
	return &UserRepository{db: db}
}

// Create creates a new user
func (r *UserRepository) Create(ctx context.Context, user *entity.User) error {
	query := `
		INSERT INTO users (username, password_hash, role_id, is_active, created_at)
		VALUES ($1, $2, $3, $4, NOW())
		RETURNING id, created_at
	`
	return r.db.Pool.QueryRow(ctx, query,
		user.Username, user.PasswordHash, user.RoleID, user.IsActive,
	).Scan(&user.ID, &user.CreatedAt)
}

// GetByID retrieves a user by ID
func (r *UserRepository) GetByID(ctx context.Context, id int64) (*entity.User, error) {
	query := `
		SELECT u.id, u.username, u.password_hash, u.role_id, u.is_active, u.created_at,
		       r.id, r.name, r.description
		FROM users u
		LEFT JOIN roles r ON u.role_id = r.id
		WHERE u.id = $1
	`
	user := &entity.User{Role: &entity.Role{}}
	err := r.db.Pool.QueryRow(ctx, query, id).Scan(
		&user.ID, &user.Username, &user.PasswordHash, &user.RoleID, &user.IsActive, &user.CreatedAt,
		&user.Role.ID, &user.Role.Name, &user.Role.Description,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domainErrors.ErrUserNotFound
	}
	if err != nil {
		return nil, err
	}
	return user, nil
}

// GetByUsername retrieves a user by username
func (r *UserRepository) GetByUsername(ctx context.Context, username string) (*entity.User, error) {
	query := `
		SELECT u.id, u.username, u.password_hash, u.role_id, u.is_active, u.created_at,
		       r.id, r.name, r.description
		FROM users u
		LEFT JOIN roles r ON u.role_id = r.id
		WHERE u.username = $1
	`
	user := &entity.User{Role: &entity.Role{}}
	err := r.db.Pool.QueryRow(ctx, query, username).Scan(
		&user.ID, &user.Username, &user.PasswordHash, &user.RoleID, &user.IsActive, &user.CreatedAt,
		&user.Role.ID, &user.Role.Name, &user.Role.Description,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domainErrors.ErrUserNotFound
	}
	if err != nil {
		return nil, err
	}
	return user, nil
}

// List retrieves all users with pagination
func (r *UserRepository) List(ctx context.Context, offset, limit int) ([]entity.User, int64, error) {
	// Get total count
	var total int64
	countQuery := `SELECT COUNT(*) FROM users`
	if err := r.db.Pool.QueryRow(ctx, countQuery).Scan(&total); err != nil {
		return nil, 0, err
	}

	// Get users
	query := `
		SELECT u.id, u.username, u.password_hash, u.role_id, u.is_active, u.created_at,
		       r.id, r.name, r.description
		FROM users u
		LEFT JOIN roles r ON u.role_id = r.id
		ORDER BY u.id
		LIMIT $1 OFFSET $2
	`
	rows, err := r.db.Pool.Query(ctx, query, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var users []entity.User
	for rows.Next() {
		user := entity.User{Role: &entity.Role{}}
		if err := rows.Scan(
			&user.ID, &user.Username, &user.PasswordHash, &user.RoleID, &user.IsActive, &user.CreatedAt,
			&user.Role.ID, &user.Role.Name, &user.Role.Description,
		); err != nil {
			return nil, 0, err
		}
		users = append(users, user)
	}

	return users, total, rows.Err()
}

// Update updates an existing user
func (r *UserRepository) Update(ctx context.Context, user *entity.User) error {
	query := `
		UPDATE users
		SET username = $1, password_hash = $2, role_id = $3, is_active = $4
		WHERE id = $5
	`
	result, err := r.db.Pool.Exec(ctx, query,
		user.Username, user.PasswordHash, user.RoleID, user.IsActive, user.ID,
	)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return domainErrors.ErrUserNotFound
	}
	return nil
}

// Delete deletes a user by ID
func (r *UserRepository) Delete(ctx context.Context, id int64) error {
	query := `DELETE FROM users WHERE id = $1`
	result, err := r.db.Pool.Exec(ctx, query, id)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return domainErrors.ErrUserNotFound
	}
	return nil
}

// ExistsByUsername checks if a username exists
func (r *UserRepository) ExistsByUsername(ctx context.Context, username string) (bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM users WHERE username = $1)`
	var exists bool
	err := r.db.Pool.QueryRow(ctx, query, username).Scan(&exists)
	return exists, err
}

// RoleRepository implements repository.RoleRepository
type RoleRepository struct {
	db *DB
}

// NewRoleRepository creates a new role repository
func NewRoleRepository(db *DB) *RoleRepository {
	return &RoleRepository{db: db}
}

// Create creates a new role
func (r *RoleRepository) Create(ctx context.Context, role *entity.Role) error {
	query := `
		INSERT INTO roles (name, description)
		VALUES ($1, $2)
		RETURNING id
	`
	return r.db.Pool.QueryRow(ctx, query, role.Name, role.Description).Scan(&role.ID)
}

// GetByID retrieves a role by ID
func (r *RoleRepository) GetByID(ctx context.Context, id int64) (*entity.Role, error) {
	query := `SELECT id, name, description FROM roles WHERE id = $1`
	role := &entity.Role{}
	err := r.db.Pool.QueryRow(ctx, query, id).Scan(&role.ID, &role.Name, &role.Description)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domainErrors.ErrRoleNotFound
	}
	if err != nil {
		return nil, err
	}
	return role, nil
}

// GetByName retrieves a role by name
func (r *RoleRepository) GetByName(ctx context.Context, name string) (*entity.Role, error) {
	query := `SELECT id, name, description FROM roles WHERE name = $1`
	role := &entity.Role{}
	err := r.db.Pool.QueryRow(ctx, query, name).Scan(&role.ID, &role.Name, &role.Description)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domainErrors.ErrRoleNotFound
	}
	if err != nil {
		return nil, err
	}
	return role, nil
}

// List retrieves all roles
func (r *RoleRepository) List(ctx context.Context) ([]entity.Role, error) {
	query := `SELECT id, name, description FROM roles ORDER BY id`
	rows, err := r.db.Pool.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var roles []entity.Role
	for rows.Next() {
		var role entity.Role
		if err := rows.Scan(&role.ID, &role.Name, &role.Description); err != nil {
			return nil, err
		}
		roles = append(roles, role)
	}
	return roles, rows.Err()
}

// Update updates an existing role
func (r *RoleRepository) Update(ctx context.Context, role *entity.Role) error {
	query := `UPDATE roles SET name = $1, description = $2 WHERE id = $3`
	result, err := r.db.Pool.Exec(ctx, query, role.Name, role.Description, role.ID)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return domainErrors.ErrRoleNotFound
	}
	return nil
}

// Delete deletes a role by ID
func (r *RoleRepository) Delete(ctx context.Context, id int64) error {
	query := `DELETE FROM roles WHERE id = $1`
	result, err := r.db.Pool.Exec(ctx, query, id)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return domainErrors.ErrRoleNotFound
	}
	return nil
}

// GetPermissions retrieves all permissions for a role
func (r *RoleRepository) GetPermissions(ctx context.Context, roleID int64) ([]entity.Permission, error) {
	query := `
		SELECT p.id, p.slug, p.description
		FROM permissions p
		JOIN role_permissions rp ON p.id = rp.permission_id
		WHERE rp.role_id = $1
		ORDER BY p.id
	`
	rows, err := r.db.Pool.Query(ctx, query, roleID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var permissions []entity.Permission
	for rows.Next() {
		var p entity.Permission
		if err := rows.Scan(&p.ID, &p.Slug, &p.Description); err != nil {
			return nil, err
		}
		permissions = append(permissions, p)
	}
	return permissions, rows.Err()
}

// SetPermissions sets the permissions for a role
func (r *RoleRepository) SetPermissions(ctx context.Context, roleID int64, permissionIDs []int64) error {
	// Delete existing permissions
	deleteQuery := `DELETE FROM role_permissions WHERE role_id = $1`
	if _, err := r.db.Pool.Exec(ctx, deleteQuery, roleID); err != nil {
		return err
	}

	// Insert new permissions
	if len(permissionIDs) == 0 {
		return nil
	}

	insertQuery := `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)`
	for _, permissionID := range permissionIDs {
		if _, err := r.db.Pool.Exec(ctx, insertQuery, roleID, permissionID); err != nil {
			return err
		}
	}
	return nil
}

// PermissionRepository implements repository.PermissionRepository
type PermissionRepository struct {
	db *DB
}

// NewPermissionRepository creates a new permission repository
func NewPermissionRepository(db *DB) *PermissionRepository {
	return &PermissionRepository{db: db}
}

// Create creates a new permission
func (r *PermissionRepository) Create(ctx context.Context, permission *entity.Permission) error {
	query := `
		INSERT INTO permissions (slug, description)
		VALUES ($1, $2)
		RETURNING id
	`
	return r.db.Pool.QueryRow(ctx, query, permission.Slug, permission.Description).Scan(&permission.ID)
}

// GetByID retrieves a permission by ID
func (r *PermissionRepository) GetByID(ctx context.Context, id int64) (*entity.Permission, error) {
	query := `SELECT id, slug, description FROM permissions WHERE id = $1`
	p := &entity.Permission{}
	err := r.db.Pool.QueryRow(ctx, query, id).Scan(&p.ID, &p.Slug, &p.Description)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domainErrors.ErrPermissionNotFound
	}
	if err != nil {
		return nil, err
	}
	return p, nil
}

// GetBySlug retrieves a permission by slug
func (r *PermissionRepository) GetBySlug(ctx context.Context, slug string) (*entity.Permission, error) {
	query := `SELECT id, slug, description FROM permissions WHERE slug = $1`
	p := &entity.Permission{}
	err := r.db.Pool.QueryRow(ctx, query, slug).Scan(&p.ID, &p.Slug, &p.Description)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domainErrors.ErrPermissionNotFound
	}
	if err != nil {
		return nil, err
	}
	return p, nil
}

// List retrieves all permissions
func (r *PermissionRepository) List(ctx context.Context) ([]entity.Permission, error) {
	query := `SELECT id, slug, description FROM permissions ORDER BY id`
	rows, err := r.db.Pool.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var permissions []entity.Permission
	for rows.Next() {
		var p entity.Permission
		if err := rows.Scan(&p.ID, &p.Slug, &p.Description); err != nil {
			return nil, err
		}
		permissions = append(permissions, p)
	}
	return permissions, rows.Err()
}

// Delete deletes a permission by ID
func (r *PermissionRepository) Delete(ctx context.Context, id int64) error {
	query := `DELETE FROM permissions WHERE id = $1`
	result, err := r.db.Pool.Exec(ctx, query, id)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return domainErrors.ErrPermissionNotFound
	}
	return nil
}
