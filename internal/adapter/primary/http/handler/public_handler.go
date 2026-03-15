package handler

import (
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/qwikshelf/api/internal/adapter/primary/http/middleware"
	"github.com/qwikshelf/api/internal/application/dto"
	"github.com/qwikshelf/api/internal/application/service"
	"github.com/qwikshelf/api/internal/domain/entity"
	domainErrors "github.com/qwikshelf/api/internal/domain/errors"
	"github.com/qwikshelf/api/pkg/response"
)

type PublicHandler struct {
	variantService  *service.ProductVariantService
	categoryService *service.CategoryService
	saleService     *service.SaleService
	userService     *service.UserService
	authService     *service.AuthService
	deliveryService *service.DeliveryService
}

func NewPublicHandler(
	variantService *service.ProductVariantService,
	categoryService *service.CategoryService,
	saleService *service.SaleService,
	userService *service.UserService,
	authService *service.AuthService,
	deliveryService *service.DeliveryService,
) *PublicHandler {
	return &PublicHandler{
		variantService:  variantService,
		categoryService: categoryService,
		saleService:     saleService,
		userService:     userService,
		authService:     authService,
		deliveryService: deliveryService,
	}
}

// @Summary      List public products
// @Description  Returns a list of product variants for the storefront
// @Tags         Public
// @Produce      json
// @Param        page      query  int  false  "Page number"    default(1)
// @Param        per_page  query  int  false  "Items per page" default(20)
// @Success      200  {object}  response.Response{data=[]dto.PublicProductResponse}
// @Router       /public/products [get]
func (h *PublicHandler) ListProducts(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "20"))
	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 100 {
		perPage = 20
	}
	offset := (page - 1) * perPage

	var variants []entity.ProductVariant
	var total int64
	var err error

	categoryIDStr := c.Query("category_id")
	if categoryIDStr != "" {
		categoryID, decodeErr := strconv.ParseInt(categoryIDStr, 10, 64)
		if decodeErr == nil {
			variants, total, err = h.variantService.ListByCategory(c.Request.Context(), categoryID, offset, perPage)
		} else {
			variants, total, err = h.variantService.List(c.Request.Context(), offset, perPage)
		}
	} else {
		variants, total, err = h.variantService.List(c.Request.Context(), offset, perPage)
	}

	if err != nil {
		response.InternalErrorDebug(c, "Failed to fetch products", err)
		return
	}

	resp := make([]dto.PublicProductResponse, 0)
	for _, v := range variants {
		// Basic masking of sensitive data (CostPrice excluded in PublicProductResponse)
		resp = append(resp, dto.PublicProductResponse{
			ID:               v.ID,
			FamilyID:         v.FamilyID,
			FamilyName:       v.FamilyName,
			Name:             v.Name,
			SKU:              v.SKU,
			Unit:             v.Unit,
			SellingPrice:     v.SellingPrice,
			ConversionFactor: v.ConversionFactor,
			// For now description is empty as we don't have it on variant level,
			// but we can fetch it from family if needed later.
		})
	}

	totalPages := int(total) / perPage
	if int(total)%perPage > 0 {
		totalPages++
	}

	response.SuccessWithMeta(c, 200, "Products retrieved", resp, &response.Meta{
		Page:       page,
		PerPage:    perPage,
		Total:      total,
		TotalPages: totalPages,
	})
}

// @Summary      Get public product detail
// @Description  Returns details for a single product variant
// @Tags         Public
// @Produce      json
// @Param        id   path      int  true  "Product Variant ID"
// @Success      200  {object}  response.Response{data=dto.PublicProductResponse}
// @Router       /public/products/{id} [get]
func (h *PublicHandler) GetProduct(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "Invalid product ID")
		return
	}

	v, err := h.variantService.GetByID(c.Request.Context(), id)
	if err != nil {
		response.NotFound(c, "Product not found")
		return
	}

	resp := dto.PublicProductResponse{
		ID:               v.ID,
		FamilyID:         v.FamilyID,
		FamilyName:       v.FamilyName,
		Name:             v.Name,
		SKU:              v.SKU,
		Unit:             v.Unit,
		SellingPrice:     v.SellingPrice,
		ConversionFactor: v.ConversionFactor,
	}

	response.OK(c, "Product retrieved", resp)
}

// @Summary      List public categories
// @Description  Returns a list of categories for the storefront navigation
// @Tags         Public
// @Produce      json
// @Success      200  {object}  response.Response{data=[]dto.PublicCategoryResponse}
// @Router       /public/categories [get]
func (h *PublicHandler) ListCategories(c *gin.Context) {
	categories, err := h.categoryService.List(c.Request.Context())
	if err != nil {
		response.InternalErrorDebug(c, "Failed to fetch categories", err)
		return
	}

	resp := make([]dto.PublicCategoryResponse, 0)
	for _, cat := range categories {
		resp = append(resp, dto.PublicCategoryResponse{
			ID:   cat.ID,
			Name: cat.Name,
		})
	}

	response.OK(c, "Categories retrieved", resp)
}

// @Summary      Create storefront order
// @Description  Place a new order from the public storefront. Defaults to COD.
// @Tags         Public
// @Accept       json
// @Produce      json
// @Param        request  body  dto.PublicCreateOrderRequest  true  "Order details"
// @Success      201  {object}  response.Response{data=dto.PublicOrderResponse}
// @Router       /public/orders [post]
func (h *PublicHandler) CreateOrder(c *gin.Context) {
	var req dto.PublicCreateOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	// Map request to entity.Sale
	sale := &entity.Sale{
		WarehouseID:       1, // Main Warehouse
		CustomerName:      req.CustomerName + " (Ph: " + req.CustomerPhone + ", Addr: " + req.Address + ")",
		PaymentMethod:     "cash", // default to COD for storefront
		ProcessedByUserID: 1,      // System/Admin user
		CreatedAt:         time.Now(),
	}

	// Link to customer if authenticated
	userID := middleware.GetUserID(c)
	if userID != 0 {
		sale.CustomerID = &userID
	}

	for _, item := range req.Items {
		variant, err := h.variantService.GetByID(c.Request.Context(), item.VariantID)
		if err != nil {
			response.BadRequest(c, "Invalid product variant ID: "+strconv.FormatInt(item.VariantID, 10))
			return
		}

		sale.Items = append(sale.Items, entity.SaleItem{
			VariantID: item.VariantID,
			Quantity:  item.Quantity,
			UnitPrice: variant.SellingPrice,
		})
	}

	if err := h.saleService.ProcessSale(c.Request.Context(), sale); err != nil {
		response.InternalErrorDebug(c, "Failed to process order", err)
		return
	}

	resp := dto.PublicOrderResponse{
		ID:          sale.ID,
		Status:      "confirmed",
		TotalAmount: sale.TotalAmount,
	}

	response.Success(c, 201, "Order placed successfully", resp)
}

// @Summary      Customer Registration
// @Description  Create a new customer account for the storefront.
// @Tags         Public
// @Accept       json
// @Produce      json
// @Param        request  body      dto.RegisterRequest  true  "Registration details"
// @Success      201      {object}  response.Response{data=dto.UserResponse}
// @Router       /public/register [post]
func (h *PublicHandler) Register(c *gin.Context) {
	var req dto.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	// Fetch customer role
	role, err := h.userService.GetRoleByName(c.Request.Context(), "customer")
	if err != nil {
		response.InternalErrorDebug(c, "Default role 'customer' not found", err)
		return
	}

	user, err := h.userService.Create(c.Request.Context(), req.Username, req.Password, req.FullName, req.Phone, req.Address, role.ID, true, nil)
	if err != nil {
		if err == domainErrors.ErrUsernameExists {
			response.Conflict(c, "Username already exists")
		} else {
			response.InternalErrorDebug(c, "Failed to register customer", err)
		}
		return
	}

	resp := dto.UserResponse{
		ID:        user.ID,
		Username:  user.Username,
		FullName:  user.FullName,
		Phone:     user.Phone,
		Address:   user.Address,
		RoleID:    user.RoleID,
		IsActive:  user.IsActive,
		CreatedAt: user.CreatedAt,
	}

	response.Created(c, "Registration successful", resp)
}

// @Summary      Customer Login
// @Description  Authenticate customer for the storefront.
// @Tags         Public
// @Accept       json
// @Produce      json
// @Param        request  body      dto.LoginRequest  true  "Login credentials"
// @Success      200      {object}  response.Response{data=dto.LoginResponse}
// @Router       /public/login [post]
func (h *PublicHandler) Login(c *gin.Context) {
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
			FullName:  result.User.FullName,
			Phone:     result.User.Phone,
			Address:   result.User.Address,
			RoleID:    result.User.RoleID,
			IsActive:  result.User.IsActive,
			CreatedAt: result.User.CreatedAt,
		},
	}

	response.OK(c, "Login successful", resp)
}

// @Summary      Get My Orders
// @Description  Retrieve order history for the currently logged-in customer.
// @Tags         Public
// @Produce      json
// @Security     BearerAuth
// @Success      200      {object}  response.Response{data=[]dto.PublicOrderResponse}
// @Router       /public/my/orders [get]
func (h *PublicHandler) GetMyOrders(c *gin.Context) {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		response.Unauthorized(c, "Authentication required")
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "20"))
	offset := (page - 1) * perPage

	sales, total, err := h.saleService.ListByCustomer(c.Request.Context(), userID, offset, perPage)
	if err != nil {
		response.InternalErrorDebug(c, "Failed to fetch orders", err)
		return
	}

	var resp []dto.PublicOrderResponse
	for _, s := range sales {
		resp = append(resp, dto.PublicOrderResponse{
			ID:          s.ID,
			Status:      "confirmed", // Map from sale status if available
			TotalAmount: s.TotalAmount,
		})
	}

	totalPages := int(total) / perPage
	if int(total)%perPage > 0 {
		totalPages++
	}

	response.SuccessWithMeta(c, 200, "Orders retrieved", resp, &response.Meta{
		Page:       page,
		PerPage:    perPage,
		Total:      total,
		TotalPages: totalPages,
	})
}

// @Summary      Get Order Tracking
// @Description  Get detailed status and items for a specific order.
// @Tags         Public
// @Produce      json
// @Security     BearerAuth
// @Param        id   path      int  true  "Order ID"
// @Success      200  {object}  response.Response
// @Router       /public/my/orders/{id} [get]
func (h *PublicHandler) GetOrderTracking(c *gin.Context) {
	userID := middleware.GetUserID(c)
	orderID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "Invalid order ID")
		return
	}

	sale, err := h.saleService.GetByID(c.Request.Context(), orderID)
	if err != nil {
		response.NotFound(c, "Order not found")
		return
	}

	// Security check: ensure order belongs to user
	if sale.CustomerID == nil || *sale.CustomerID != userID {
		response.Forbidden(c, "Order does not belong to you")
		return
	}

	response.OK(c, "Order details retrieved", sale)
}

// @Summary      Check serviceability
// @Description  Check if a pincode is serviceable and get delivery details.
// @Tags         Public
// @Produce      json
// @Param        pincode   query      string  true  "Pincode to check"
// @Success      200       {object}  response.Response{data=entity.ServiceableArea}
// @Router       /public/serviceability [get]
func (h *PublicHandler) CheckServiceability(c *gin.Context) {
	pincode := c.Query("pincode")
	if pincode == "" {
		response.BadRequest(c, "Pincode is required")
		return
	}

	area, err := h.deliveryService.CheckServiceability(c.Request.Context(), pincode)
	if err != nil {
		response.InternalErrorDebug(c, "Failed to check serviceability", err)
		return
	}

	if area == nil {
		response.Success(c, 200, "Area not serviceable", gin.H{"serviceable": false})
		return
	}

	response.OK(c, "Area is serviceable", area)
}
