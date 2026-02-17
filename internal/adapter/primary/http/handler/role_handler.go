package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/qwikshelf/api/internal/application/dto"
	"github.com/qwikshelf/api/internal/application/service"
	domainErrors "github.com/qwikshelf/api/internal/domain/errors"
	"github.com/qwikshelf/api/pkg/response"
)

// RoleHandler handles role endpoints
type RoleHandler struct {
	roleService *service.RoleService
}

// NewRoleHandler creates a new role handler
func NewRoleHandler(roleService *service.RoleService) *RoleHandler {
	return &RoleHandler{roleService: roleService}
}

// List lists all roles
// @Summary      List roles
// @Description  Returns a list of all available roles
// @Tags         Roles
// @Produce      json
// @Security     BearerAuth
// @Success      200  {object}  response.Response{data=[]dto.RoleResponse}
// @Failure      401  {object}  response.Response
// @Failure      500  {object}  response.Response
// @Router       /roles [get]
func (h *RoleHandler) List(c *gin.Context) {
	roles, err := h.roleService.List(c.Request.Context())
	if err != nil {
response.InternalErrorDebug(c, "Failed to fetch roles", err)
		return
	}

	var resp []dto.RoleResponse
	for _, r := range roles {
		resp = append(resp, dto.RoleResponse{
			ID:          r.ID,
			Name:        r.Name,
			Description: r.Description,
		})
	}

	response.OK(c, "Roles retrieved", resp)
}

// Create creates a new role
// @Summary      Create role
// @Description  Creates a new role with optional permissions
// @Tags         Roles
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        request  body      dto.CreateRoleRequest  true  "Role details"
// @Success      201      {object}  response.Response{data=dto.RoleResponse}
// @Failure      400      {object}  response.Response
// @Failure      401      {object}  response.Response
// @Failure      500      {object}  response.Response
// @Router       /roles [post]
func (h *RoleHandler) Create(c *gin.Context) {
	var req dto.CreateRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body")
		return
	}

	role, err := h.roleService.Create(c.Request.Context(), req.Name, req.Description, req.PermissionIDs)
	if err != nil {
response.InternalErrorDebug(c, "Failed to create role", err)
		return
	}

	resp := dto.RoleResponse{
		ID:          role.ID,
		Name:        role.Name,
		Description: role.Description,
	}

	response.Created(c, "Role created", resp)
}

// Get retrieves a role by ID
// @Summary      Get role
// @Description  Returns a single role by ID with its permissions
// @Tags         Roles
// @Produce      json
// @Security     BearerAuth
// @Param        id   path      int  true  "Role ID"
// @Success      200  {object}  response.Response{data=dto.RoleResponse}
// @Failure      400  {object}  response.Response
// @Failure      401  {object}  response.Response
// @Failure      404  {object}  response.Response
// @Router       /roles/{id} [get]
func (h *RoleHandler) Get(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "Invalid role ID")
		return
	}

	role, permissions, err := h.roleService.GetWithPermissions(c.Request.Context(), id)
	if err != nil {
		response.NotFound(c, "Role not found")
		return
	}

	resp := dto.RoleResponse{
		ID:          role.ID,
		Name:        role.Name,
		Description: role.Description,
	}

	for _, p := range permissions {
		resp.Permissions = append(resp.Permissions, dto.PermissionResponse{
			ID:          p.ID,
			Slug:        p.Slug,
			Description: p.Description,
		})
	}

	response.OK(c, "Role retrieved", resp)
}

// Update updates a role
// @Summary      Update role
// @Description  Updates an existing role's details and permissions
// @Tags         Roles
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id       path      int                    true  "Role ID"
// @Param        request  body      dto.UpdateRoleRequest  true  "Updated role details"
// @Success      200      {object}  response.Response{data=dto.RoleResponse}
// @Failure      400      {object}  response.Response
// @Failure      401      {object}  response.Response
// @Failure      404      {object}  response.Response
// @Failure      500      {object}  response.Response
// @Router       /roles/{id} [put]
func (h *RoleHandler) Update(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "Invalid role ID")
		return
	}

	var req dto.UpdateRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body")
		return
	}

	var name, description *string
	if req.Name != "" {
		name = &req.Name
	}
	if req.Description != "" {
		description = &req.Description
	}

	role, err := h.roleService.Update(c.Request.Context(), id, name, description, req.PermissionIDs)
	if err != nil {
		if err == domainErrors.ErrRoleNotFound {
			response.NotFound(c, "Role not found")
		} else {
response.InternalErrorDebug(c, "Failed to update role", err)
		}
		return
	}

	resp := dto.RoleResponse{
		ID:          role.ID,
		Name:        role.Name,
		Description: role.Description,
	}

	response.OK(c, "Role updated", resp)
}

// Delete deletes a role
// @Summary      Delete role
// @Description  Deletes a role by ID
// @Tags         Roles
// @Produce      json
// @Security     BearerAuth
// @Param        id   path  int  true  "Role ID"
// @Success      204  "No Content"
// @Failure      400  {object}  response.Response
// @Failure      401  {object}  response.Response
// @Failure      404  {object}  response.Response
// @Failure      500  {object}  response.Response
// @Router       /roles/{id} [delete]
func (h *RoleHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "Invalid role ID")
		return
	}

	if err := h.roleService.Delete(c.Request.Context(), id); err != nil {
		if err == domainErrors.ErrRoleNotFound {
			response.NotFound(c, "Role not found")
		} else {
response.InternalErrorDebug(c, "Failed to delete role", err)
		}
		return
	}

	response.NoContent(c)
}
