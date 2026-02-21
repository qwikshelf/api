package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/qwikshelf/api/internal/adapter/primary/http/middleware"
	"github.com/qwikshelf/api/internal/application/dto"
	"github.com/qwikshelf/api/internal/application/service"
	domainErrors "github.com/qwikshelf/api/internal/domain/errors"
	"github.com/qwikshelf/api/pkg/response"
)

// AuthHandler handles authentication endpoints
type AuthHandler struct {
	authService *service.AuthService
}

// NewAuthHandler creates a new auth handler
func NewAuthHandler(authService *service.AuthService) *AuthHandler {
	return &AuthHandler{authService: authService}
}

// Login handles user login
// @Summary      User login
// @Description  Authenticate with username and password to receive a JWT token
// @Tags         Auth
// @Accept       json
// @Produce      json
// @Param        request  body      dto.LoginRequest  true  "Login credentials"
// @Success      200      {object}  response.Response{data=dto.LoginResponse}
// @Failure      401      {object}  response.Response
// @Failure      403      {object}  response.Response
// @Failure      500      {object}  response.Response
// @Router       /auth/login [post]
func (h *AuthHandler) Login(c *gin.Context) {
	var req dto.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body")
		return
	}

	result, err := h.authService.Login(c.Request.Context(), req.Username, req.Password)
	if err != nil {
		switch err {
		case domainErrors.ErrInvalidCredentials:
			response.Unauthorized(c, "Invalid username or password")
		case domainErrors.ErrUserInactive:
			response.Forbidden(c, "User account is inactive")
		default:
			response.InternalErrorDebug(c, "Login failed", err)
		}
		return
	}

	resp := dto.LoginResponse{
		AccessToken:  result.AccessToken,
		RefreshToken: result.RefreshToken,
		ExpiresAt:    result.ExpiresAt,
		User: dto.UserResponse{
			ID:        result.User.ID,
			Username:  result.User.Username,
			RoleID:    result.User.RoleID,
			IsActive:  result.User.IsActive,
			CreatedAt: result.User.CreatedAt,
		},
	}

	if result.User.Role != nil {
		resp.User.Role = &dto.RoleResponse{
			ID:          result.User.Role.ID,
			Name:        result.User.Role.Name,
			Description: result.User.Role.Description,
		}
	}

	response.OK(c, "Login successful", resp)
}

// Logout handles user logout
// @Summary      User logout
// @Description  Logout the current user (client-side token removal)
// @Tags         Auth
// @Produce      json
// @Success      200  {object}  response.Response
// @Router       /auth/logout [post]
func (h *AuthHandler) Logout(c *gin.Context) {
	response.OK(c, "Logout successful", nil)
}

// Refresh handles token refresh
// @Summary      Refresh token
// @Description  Get a new access token using a refresh token
// @Tags         Auth
// @Accept       json
// @Produce      json
// @Param        request  body      dto.RefreshRequest  true  "Refresh token"
// @Success      200      {object}  response.Response{data=dto.LoginResponse}
// @Failure      401      {object}  response.Response
// @Failure      500      {object}  response.Response
// @Router       /auth/refresh [post]
func (h *AuthHandler) Refresh(c *gin.Context) {
	var req dto.RefreshRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body")
		return
	}

	result, err := h.authService.RefreshToken(c.Request.Context(), req.RefreshToken)
	if err != nil {
		response.Unauthorized(c, "Invalid or expired refresh token")
		return
	}

	resp := dto.LoginResponse{
		AccessToken:  result.AccessToken,
		RefreshToken: result.RefreshToken,
		ExpiresAt:    result.ExpiresAt,
		User: dto.UserResponse{
			ID:        result.User.ID,
			Username:  result.User.Username,
			RoleID:    result.User.RoleID,
			IsActive:  result.User.IsActive,
			CreatedAt: result.User.CreatedAt,
		},
	}

	response.OK(c, "Token refreshed", resp)
}

// Me returns the current authenticated user
// @Summary      Get current user
// @Description  Returns the profile of the currently authenticated user
// @Tags         Auth
// @Produce      json
// @Security     BearerAuth
// @Success      200  {object}  response.Response{data=dto.UserResponse}
// @Failure      401  {object}  response.Response
// @Failure      404  {object}  response.Response
// @Router       /auth/me [get]
func (h *AuthHandler) Me(c *gin.Context) {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		response.Unauthorized(c, "Not authenticated")
		return
	}

	user, err := h.authService.GetUserByID(c.Request.Context(), userID)
	if err != nil {
		response.NotFound(c, "User not found")
		return
	}

	resp := dto.UserResponse{
		ID:        user.ID,
		Username:  user.Username,
		RoleID:    user.RoleID,
		IsActive:  user.IsActive,
		CreatedAt: user.CreatedAt,
	}

	if user.Role != nil {
		resp.Role = &dto.RoleResponse{
			ID:          user.Role.ID,
			Name:        user.Role.Name,
			Description: user.Role.Description,
		}
	}

	response.OK(c, "Current user retrieved", resp)
}

// UserHandler handles user endpoints
type UserHandler struct {
	userService *service.UserService
}

// NewUserHandler creates a new user handler
func NewUserHandler(userService *service.UserService) *UserHandler {
	return &UserHandler{userService: userService}
}

// List lists all users
// @Summary      List users
// @Description  Returns a paginated list of all users
// @Tags         Users
// @Produce      json
// @Security     BearerAuth
// @Param        page      query  int  false  "Page number"      default(1)
// @Param        per_page  query  int  false  "Items per page"   default(20)
// @Success      200  {object}  response.Response{data=[]dto.UserResponse}
// @Failure      401  {object}  response.Response
// @Failure      500  {object}  response.Response
// @Router       /users [get]
func (h *UserHandler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "20"))
	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 100 {
		perPage = 20
	}
	offset := (page - 1) * perPage

	users, total, err := h.userService.List(c.Request.Context(), offset, perPage)
	if err != nil {
		response.InternalErrorDebug(c, "Failed to fetch users", err)
		return
	}

	var resp []dto.UserResponse
	for _, u := range users {
		userResp := dto.UserResponse{
			ID:        u.ID,
			Username:  u.Username,
			RoleID:    u.RoleID,
			IsActive:  u.IsActive,
			CreatedAt: u.CreatedAt,
		}
		if u.Role != nil {
			userResp.Role = &dto.RoleResponse{
				ID:          u.Role.ID,
				Name:        u.Role.Name,
				Description: u.Role.Description,
			}
		}
		resp = append(resp, userResp)
	}

	totalPages := int(total) / perPage
	if int(total)%perPage > 0 {
		totalPages++
	}

	response.SuccessWithMeta(c, 200, "Users retrieved", resp, &response.Meta{
		Page:       page,
		PerPage:    perPage,
		Total:      total,
		TotalPages: totalPages,
	})
}

// Create creates a new user
// @Summary      Create user
// @Description  Creates a new user with the provided details
// @Tags         Users
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        request  body      dto.CreateUserRequest  true  "User details"
// @Success      201      {object}  response.Response{data=dto.UserResponse}
// @Failure      400      {object}  response.Response
// @Failure      401      {object}  response.Response
// @Failure      409      {object}  response.Response
// @Failure      500      {object}  response.Response
// @Router       /users [post]
func (h *UserHandler) Create(c *gin.Context) {
	var req dto.CreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body")
		return
	}

	user, err := h.userService.Create(c.Request.Context(), req.Username, req.Password, req.RoleID, req.IsActive)
	if err != nil {
		switch err {
		case domainErrors.ErrUsernameExists:
			response.Conflict(c, "Username already exists")
		case domainErrors.ErrRoleNotFound:
			response.BadRequest(c, "Role not found")
		default:
			response.InternalErrorDebug(c, "Failed to create user", err)
		}
		return
	}

	resp := dto.UserResponse{
		ID:        user.ID,
		Username:  user.Username,
		RoleID:    user.RoleID,
		IsActive:  user.IsActive,
		CreatedAt: user.CreatedAt,
	}

	response.Created(c, "User created", resp)
}

// Get retrieves a user by ID
// @Summary      Get user
// @Description  Returns a single user by ID
// @Tags         Users
// @Produce      json
// @Security     BearerAuth
// @Param        id   path      int  true  "User ID"
// @Success      200  {object}  response.Response{data=dto.UserResponse}
// @Failure      400  {object}  response.Response
// @Failure      401  {object}  response.Response
// @Failure      404  {object}  response.Response
// @Router       /users/{id} [get]
func (h *UserHandler) Get(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "Invalid user ID")
		return
	}

	user, err := h.userService.GetByID(c.Request.Context(), id)
	if err != nil {
		response.NotFound(c, "User not found")
		return
	}

	resp := dto.UserResponse{
		ID:        user.ID,
		Username:  user.Username,
		RoleID:    user.RoleID,
		IsActive:  user.IsActive,
		CreatedAt: user.CreatedAt,
	}

	if user.Role != nil {
		resp.Role = &dto.RoleResponse{
			ID:          user.Role.ID,
			Name:        user.Role.Name,
			Description: user.Role.Description,
		}
	}

	response.OK(c, "User retrieved", resp)
}

// Update updates a user
// @Summary      Update user
// @Description  Updates an existing user's details
// @Tags         Users
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id       path      int                    true  "User ID"
// @Param        request  body      dto.UpdateUserRequest  true  "Updated user details"
// @Success      200      {object}  response.Response{data=dto.UserResponse}
// @Failure      400      {object}  response.Response
// @Failure      401      {object}  response.Response
// @Failure      404      {object}  response.Response
// @Failure      409      {object}  response.Response
// @Failure      500      {object}  response.Response
// @Router       /users/{id} [put]
func (h *UserHandler) Update(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "Invalid user ID")
		return
	}

	var req dto.UpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body")
		return
	}

	var username, password *string
	var roleID *int64
	if req.Username != "" {
		username = &req.Username
	}
	if req.Password != "" {
		password = &req.Password
	}
	if req.RoleID != 0 {
		roleID = &req.RoleID
	}

	user, err := h.userService.Update(c.Request.Context(), id, username, password, roleID, req.IsActive)
	if err != nil {
		switch err {
		case domainErrors.ErrUserNotFound:
			response.NotFound(c, "User not found")
		case domainErrors.ErrUsernameExists:
			response.Conflict(c, "Username already exists")
		case domainErrors.ErrRoleNotFound:
			response.BadRequest(c, "Role not found")
		default:
			response.InternalErrorDebug(c, "Failed to update user", err)
		}
		return
	}

	resp := dto.UserResponse{
		ID:        user.ID,
		Username:  user.Username,
		RoleID:    user.RoleID,
		IsActive:  user.IsActive,
		CreatedAt: user.CreatedAt,
	}

	response.OK(c, "User updated", resp)
}

// Delete deletes a user
// @Summary      Delete user
// @Description  Deletes a user by ID
// @Tags         Users
// @Produce      json
// @Security     BearerAuth
// @Param        id   path  int  true  "User ID"
// @Success      204  "No Content"
// @Failure      400  {object}  response.Response
// @Failure      401  {object}  response.Response
// @Failure      404  {object}  response.Response
// @Failure      500  {object}  response.Response
// @Router       /users/{id} [delete]
func (h *UserHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "Invalid user ID")
		return
	}

	if err := h.userService.Delete(c.Request.Context(), id); err != nil {
		if err == domainErrors.ErrUserNotFound {
			response.NotFound(c, "User not found")
		} else {
			response.InternalErrorDebug(c, "Failed to delete user", err)
		}
		return
	}

	response.NoContent(c)
}
