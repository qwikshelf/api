package dto

import "time"

// --- Auth DTOs ---

// LoginRequest represents a login request.
// Username and Password are required.
type LoginRequest struct {
	Username string `json:"username" binding:"required,min=3"`
	Password string `json:"password" binding:"required,min=6"`
}

// LoginResponse represents a login response
type LoginResponse struct {
	Token     string       `json:"token"`
	ExpiresAt time.Time    `json:"expires_at"`
	User      UserResponse `json:"user"`
}

// --- User DTOs ---

// CreateUserRequest represents a request to create a user.
// Username must be 3-50 chars. Password must be at least 6 chars.
// RoleID is required.
type CreateUserRequest struct {
	Username string `json:"username" binding:"required,min=3,max=50"`
	Password string `json:"password" binding:"required,min=6"`
	RoleID   int64  `json:"role_id" binding:"required"`
	IsActive bool   `json:"is_active"`
}

// UpdateUserRequest represents a request to update a user
type UpdateUserRequest struct {
	Username string `json:"username,omitempty" binding:"omitempty,min=3,max=50"`
	Password string `json:"password,omitempty" binding:"omitempty,min=6"`
	RoleID   int64  `json:"role_id,omitempty"`
	IsActive *bool  `json:"is_active,omitempty"`
}

// UserResponse represents a user in API responses
type UserResponse struct {
	ID        int64         `json:"id"`
	Username  string        `json:"username"`
	RoleID    int64         `json:"role_id"`
	Role      *RoleResponse `json:"role,omitempty"`
	IsActive  bool          `json:"is_active"`
	CreatedAt time.Time     `json:"created_at"`
}

// --- Role DTOs ---

// CreateRoleRequest represents a request to create a role.
// Name is required (2-50 chars).
type CreateRoleRequest struct {
	Name          string  `json:"name" binding:"required,min=2,max=50"`
	Description   string  `json:"description,omitempty"`
	PermissionIDs []int64 `json:"permission_ids,omitempty"`
}

// UpdateRoleRequest represents a request to update a role
type UpdateRoleRequest struct {
	Name          string  `json:"name,omitempty" binding:"omitempty,min=2,max=50"`
	Description   string  `json:"description,omitempty"`
	PermissionIDs []int64 `json:"permission_ids,omitempty"`
}

// RoleResponse represents a role in API responses
type RoleResponse struct {
	ID          int64                `json:"id"`
	Name        string               `json:"name"`
	Description string               `json:"description,omitempty"`
	Permissions []PermissionResponse `json:"permissions,omitempty"`
}

// PermissionResponse represents a permission in API responses
type PermissionResponse struct {
	ID          int64  `json:"id"`
	Slug        string `json:"slug"`
	Description string `json:"description,omitempty"`
}
