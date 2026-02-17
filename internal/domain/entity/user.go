package entity

import "time"

// Role represents a user role in the system
type Role struct {
	ID          int64  `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description,omitempty"`
}

// Permission represents a system permission
type Permission struct {
	ID          int64  `json:"id"`
	Slug        string `json:"slug"`
	Description string `json:"description,omitempty"`
}

// RolePermission represents the many-to-many relationship between roles and permissions
type RolePermission struct {
	RoleID       int64 `json:"role_id"`
	PermissionID int64 `json:"permission_id"`
}

// User represents a system user
type User struct {
	ID           int64     `json:"id"`
	Username     string    `json:"username"`
	PasswordHash string    `json:"-"` // Never expose password hash in JSON
	RoleID       int64     `json:"role_id"`
	Role         *Role     `json:"role,omitempty"`
	IsActive     bool      `json:"is_active"`
	CreatedAt    time.Time `json:"created_at"`
}

// HasPermission checks if the user has a specific permission
func (u *User) HasPermission(slug string, permissions []Permission) bool {
	for _, p := range permissions {
		if p.Slug == slug {
			return true
		}
	}
	return false
}

// UserWithPermissions represents a user with their role and permissions loaded
type UserWithPermissions struct {
	User
	Permissions []Permission `json:"permissions,omitempty"`
}
