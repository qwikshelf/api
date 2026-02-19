package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/qwikshelf/api/internal/application/dto"
	"github.com/qwikshelf/api/internal/application/service"
	domainErrors "github.com/qwikshelf/api/internal/domain/errors"
	"github.com/qwikshelf/api/pkg/response"
)

type CategoryHandler struct {
	categoryService *service.CategoryService
}

func NewCategoryHandler(categoryService *service.CategoryService) *CategoryHandler {
	return &CategoryHandler{categoryService: categoryService}
}

// @Summary      List categories
// @Description  Returns a list of all product categories
// @Tags         Categories
// @Produce      json
// @Security     BearerAuth
// @Success      200  {object}  response.Response{data=[]dto.CategoryResponse}
// @Router       /categories [get]
func (h *CategoryHandler) List(c *gin.Context) {
	categories, err := h.categoryService.List(c.Request.Context())
	if err != nil {
		response.InternalErrorDebug(c, "Failed to fetch categories", err)
		return
	}
	resp := make([]dto.CategoryResponse, 0)
	for _, cat := range categories {
		resp = append(resp, dto.CategoryResponse{ID: cat.ID, Name: cat.Name})
	}
	response.OK(c, "Categories retrieved", resp)
}

// @Summary      Create category
// @Description  Creates a new product category
// @Tags         Categories
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        request  body      dto.CreateCategoryRequest  true  "Category details"
// @Success      201      {object}  response.Response{data=dto.CategoryResponse}
// @Failure      400      {object}  response.Response
// @Router       /categories [post]
func (h *CategoryHandler) Create(c *gin.Context) {
	var req dto.CreateCategoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body")
		return
	}
	category, err := h.categoryService.Create(c.Request.Context(), req.Name)
	if err != nil {
		response.InternalErrorDebug(c, "Failed to create category", err)
		return
	}
	response.Created(c, "Category created", dto.CategoryResponse{ID: category.ID, Name: category.Name})
}

// @Summary      Get category
// @Description  Returns a single category by ID
// @Tags         Categories
// @Produce      json
// @Security     BearerAuth
// @Param        id   path      int  true  "Category ID"
// @Success      200  {object}  response.Response{data=dto.CategoryResponse}
// @Failure      404  {object}  response.Response
// @Router       /categories/{id} [get]
func (h *CategoryHandler) Get(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "Invalid category ID")
		return
	}
	category, err := h.categoryService.GetByID(c.Request.Context(), id)
	if err != nil {
		response.NotFound(c, "Category not found")
		return
	}
	response.OK(c, "Category retrieved", dto.CategoryResponse{ID: category.ID, Name: category.Name})
}

// @Summary      Update category
// @Description  Updates an existing category
// @Tags         Categories
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id       path      int                        true  "Category ID"
// @Param        request  body      dto.UpdateCategoryRequest  true  "Updated details"
// @Success      200      {object}  response.Response{data=dto.CategoryResponse}
// @Failure      404      {object}  response.Response
// @Router       /categories/{id} [put]
func (h *CategoryHandler) Update(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "Invalid category ID")
		return
	}
	var req dto.UpdateCategoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body")
		return
	}
	category, err := h.categoryService.Update(c.Request.Context(), id, req.Name)
	if err != nil {
		if err == domainErrors.ErrCategoryNotFound {
			response.NotFound(c, "Category not found")
		} else {
			response.InternalErrorDebug(c, "Failed to update category", err)
		}
		return
	}
	response.OK(c, "Category updated", dto.CategoryResponse{ID: category.ID, Name: category.Name})
}

// @Summary      Delete category
// @Description  Deletes a category by ID
// @Tags         Categories
// @Security     BearerAuth
// @Param        id   path  int  true  "Category ID"
// @Success      204  "No Content"
// @Failure      404  {object}  response.Response
// @Router       /categories/{id} [delete]
func (h *CategoryHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "Invalid category ID")
		return
	}
	if err := h.categoryService.Delete(c.Request.Context(), id); err != nil {
		if err == domainErrors.ErrCategoryNotFound {
			response.NotFound(c, "Category not found")
		} else {
			response.InternalErrorDebug(c, "Failed to delete category", err)
		}
		return
	}
	response.NoContent(c)
}

type ProductFamilyHandler struct {
	familyService *service.ProductFamilyService
}

func NewProductFamilyHandler(familyService *service.ProductFamilyService) *ProductFamilyHandler {
	return &ProductFamilyHandler{familyService: familyService}
}

// @Summary      List product families
// @Description  Returns a paginated list of product families
// @Tags         Product Families
// @Produce      json
// @Security     BearerAuth
// @Param        page      query  int  false  "Page number"    default(1)
// @Param        per_page  query  int  false  "Items per page" default(20)
// @Success      200  {object}  response.Response{data=[]dto.ProductFamilyResponse}
// @Router       /product-families [get]
func (h *ProductFamilyHandler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "20"))
	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 100 {
		perPage = 20
	}
	offset := (page - 1) * perPage
	families, total, err := h.familyService.List(c.Request.Context(), offset, perPage)
	if err != nil {
		response.InternalErrorDebug(c, "Failed to fetch product families", err)
		return
	}
	resp := make([]dto.ProductFamilyResponse, 0)
	for _, f := range families {
		fr := dto.ProductFamilyResponse{ID: f.ID, CategoryID: f.CategoryID, Name: f.Name, Description: f.Description}
		if f.Category != nil {
			fr.Category = &dto.CategoryResponse{ID: f.Category.ID, Name: f.Category.Name}
		}
		resp = append(resp, fr)
	}
	totalPages := int(total) / perPage
	if int(total)%perPage > 0 {
		totalPages++
	}
	response.SuccessWithMeta(c, 200, "Product families retrieved", resp, &response.Meta{Page: page, PerPage: perPage, Total: total, TotalPages: totalPages})
}

// @Summary      Create product family
// @Description  Creates a new product family under a category
// @Tags         Product Families
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        request  body      dto.CreateProductFamilyRequest  true  "Product family details"
// @Success      201      {object}  response.Response{data=dto.ProductFamilyResponse}
// @Failure      400      {object}  response.Response
// @Router       /product-families [post]
func (h *ProductFamilyHandler) Create(c *gin.Context) {
	var req dto.CreateProductFamilyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body")
		return
	}
	family, err := h.familyService.Create(c.Request.Context(), req.CategoryID, req.Name, req.Description)
	if err != nil {
		if err == domainErrors.ErrCategoryNotFound {
			response.BadRequest(c, "Category not found")
		} else {
			response.InternalErrorDebug(c, "Failed to create product family", err)
		}
		return
	}
	response.Created(c, "Product family created", dto.ProductFamilyResponse{ID: family.ID, CategoryID: family.CategoryID, Name: family.Name, Description: family.Description})
}

// @Summary      Get product family
// @Description  Returns a single product family by ID
// @Tags         Product Families
// @Produce      json
// @Security     BearerAuth
// @Param        id   path      int  true  "Product Family ID"
// @Success      200  {object}  response.Response{data=dto.ProductFamilyResponse}
// @Failure      404  {object}  response.Response
// @Router       /product-families/{id} [get]
func (h *ProductFamilyHandler) Get(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "Invalid product family ID")
		return
	}
	family, err := h.familyService.GetByID(c.Request.Context(), id)
	if err != nil {
		response.NotFound(c, "Product family not found")
		return
	}
	resp := dto.ProductFamilyResponse{ID: family.ID, CategoryID: family.CategoryID, Name: family.Name, Description: family.Description}
	if family.Category != nil {
		resp.Category = &dto.CategoryResponse{ID: family.Category.ID, Name: family.Category.Name}
	}
	response.OK(c, "Product family retrieved", resp)
}

// @Summary      Update product family
// @Description  Updates an existing product family
// @Tags         Product Families
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id       path      int                             true  "Product Family ID"
// @Param        request  body      dto.UpdateProductFamilyRequest  true  "Updated details"
// @Success      200      {object}  response.Response{data=dto.ProductFamilyResponse}
// @Failure      404      {object}  response.Response
// @Router       /product-families/{id} [put]
func (h *ProductFamilyHandler) Update(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "Invalid product family ID")
		return
	}
	var req dto.UpdateProductFamilyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body")
		return
	}
	var categoryID *int64
	var name, desc *string
	if req.CategoryID != 0 {
		categoryID = &req.CategoryID
	}
	if req.Name != "" {
		name = &req.Name
	}
	if req.Description != "" {
		desc = &req.Description
	}
	family, err := h.familyService.Update(c.Request.Context(), id, categoryID, name, desc)
	if err != nil {
		if err == domainErrors.ErrProductFamilyNotFound {
			response.NotFound(c, "Product family not found")
		} else if err == domainErrors.ErrCategoryNotFound {
			response.BadRequest(c, "Category not found")
		} else {
			response.InternalErrorDebug(c, "Failed to update product family", err)
		}
		return
	}
	response.OK(c, "Product family updated", dto.ProductFamilyResponse{ID: family.ID, CategoryID: family.CategoryID, Name: family.Name, Description: family.Description})
}

// @Summary      Delete product family
// @Description  Deletes a product family by ID
// @Tags         Product Families
// @Security     BearerAuth
// @Param        id   path  int  true  "Product Family ID"
// @Success      204  "No Content"
// @Failure      404  {object}  response.Response
// @Router       /product-families/{id} [delete]
func (h *ProductFamilyHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "Invalid product family ID")
		return
	}
	if err := h.familyService.Delete(c.Request.Context(), id); err != nil {
		if err == domainErrors.ErrProductFamilyNotFound {
			response.NotFound(c, "Product family not found")
		} else {
			response.InternalErrorDebug(c, "Failed to delete product family", err)
		}
		return
	}
	response.NoContent(c)
}

type ProductVariantHandler struct {
	variantService *service.ProductVariantService
}

func NewProductVariantHandler(variantService *service.ProductVariantService) *ProductVariantHandler {
	return &ProductVariantHandler{variantService: variantService}
}

// @Summary      List products
// @Description  Returns a paginated list of product variants
// @Tags         Products
// @Produce      json
// @Security     BearerAuth
// @Param        page      query  int  false  "Page number"    default(1)
// @Param        per_page  query  int  false  "Items per page" default(20)
// @Success      200  {object}  response.Response{data=[]dto.ProductVariantResponse}
// @Router       /products [get]
func (h *ProductVariantHandler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "20"))
	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 100 {
		perPage = 20
	}
	offset := (page - 1) * perPage
	variants, total, err := h.variantService.List(c.Request.Context(), offset, perPage)
	if err != nil {
		response.InternalErrorDebug(c, "Failed to fetch products", err)
		return
	}
	resp := make([]dto.ProductVariantResponse, 0)
	for _, v := range variants {
		resp = append(resp, dto.ProductVariantResponse{
			ID: v.ID, FamilyID: v.FamilyID, Name: v.Name, SKU: v.SKU,
			Barcode: v.Barcode, Unit: v.Unit, CostPrice: v.CostPrice, SellingPrice: v.SellingPrice, IsManufactured: v.IsManufactured,
		})
	}
	totalPages := int(total) / perPage
	if int(total)%perPage > 0 {
		totalPages++
	}
	response.SuccessWithMeta(c, 200, "Products retrieved", resp, &response.Meta{Page: page, PerPage: perPage, Total: total, TotalPages: totalPages})
}

// @Summary      Create product
// @Description  Creates a new product variant
// @Tags         Products
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        request  body      dto.CreateProductVariantRequest  true  "Product details"
// @Success      201      {object}  response.Response{data=dto.ProductVariantResponse}
// @Failure      400      {object}  response.Response
// @Failure      409      {object}  response.Response
// @Router       /products [post]
func (h *ProductVariantHandler) Create(c *gin.Context) {
	var req dto.CreateProductVariantRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body")
		return
	}
	variant, err := h.variantService.Create(c.Request.Context(), req.FamilyID, req.Name, req.SKU, req.Barcode, req.Unit, req.CostPrice, req.SellingPrice, req.IsManufactured)
	if err != nil {
		switch err {
		case domainErrors.ErrProductFamilyNotFound:
			response.BadRequest(c, "Product family not found")
		case domainErrors.ErrSKUExists:
			response.Conflict(c, "SKU already exists")
		case domainErrors.ErrBarcodeExists:
			response.Conflict(c, "Barcode already exists")
		default:
			response.InternalErrorDebug(c, "Failed to create product", err)
		}
		return
	}
	response.Created(c, "Product created", dto.ProductVariantResponse{
		ID: variant.ID, FamilyID: variant.FamilyID, Name: variant.Name, SKU: variant.SKU,
		Barcode: variant.Barcode, Unit: variant.Unit, CostPrice: variant.CostPrice, SellingPrice: variant.SellingPrice, IsManufactured: variant.IsManufactured,
	})
}

// @Summary      Get product
// @Description  Returns a single product variant by ID
// @Tags         Products
// @Produce      json
// @Security     BearerAuth
// @Param        id   path      int  true  "Product ID"
// @Success      200  {object}  response.Response{data=dto.ProductVariantResponse}
// @Failure      404  {object}  response.Response
// @Router       /products/{id} [get]
func (h *ProductVariantHandler) Get(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "Invalid product ID")
		return
	}
	variant, err := h.variantService.GetByID(c.Request.Context(), id)
	if err != nil {
		response.NotFound(c, "Product not found")
		return
	}
	response.OK(c, "Product retrieved", dto.ProductVariantResponse{
		ID: variant.ID, FamilyID: variant.FamilyID, Name: variant.Name, SKU: variant.SKU,
		Barcode: variant.Barcode, Unit: variant.Unit, CostPrice: variant.CostPrice, SellingPrice: variant.SellingPrice, IsManufactured: variant.IsManufactured,
	})
}

// @Summary      Update product
// @Description  Updates an existing product variant
// @Tags         Products
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id       path      int                              true  "Product ID"
// @Param        request  body      dto.UpdateProductVariantRequest  true  "Updated details"
// @Success      200      {object}  response.Response{data=dto.ProductVariantResponse}
// @Failure      404      {object}  response.Response
// @Failure      409      {object}  response.Response
// @Router       /products/{id} [put]
func (h *ProductVariantHandler) Update(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "Invalid product ID")
		return
	}
	var req dto.UpdateProductVariantRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body")
		return
	}
	var familyID *int64
	var name, sku, barcode *string
	if req.FamilyID != 0 {
		familyID = &req.FamilyID
	}
	if req.Name != "" {
		name = &req.Name
	}
	if req.SKU != "" {
		sku = &req.SKU
	}
	if req.Barcode != "" {
		barcode = &req.Barcode
	}
	variant, err := h.variantService.Update(c.Request.Context(), id, familyID, name, sku, barcode, req.CostPrice, req.SellingPrice, req.IsManufactured)
	if err != nil {
		switch err {
		case domainErrors.ErrProductVariantNotFound:
			response.NotFound(c, "Product not found")
		case domainErrors.ErrProductFamilyNotFound:
			response.BadRequest(c, "Product family not found")
		case domainErrors.ErrSKUExists:
			response.Conflict(c, "SKU already exists")
		case domainErrors.ErrBarcodeExists:
			response.Conflict(c, "Barcode already exists")
		default:
			response.InternalErrorDebug(c, "Failed to update product", err)
		}
		return
	}
	response.OK(c, "Product updated", dto.ProductVariantResponse{
		ID: variant.ID, FamilyID: variant.FamilyID, Name: variant.Name, SKU: variant.SKU,
		Barcode: variant.Barcode, Unit: variant.Unit, CostPrice: variant.CostPrice, SellingPrice: variant.SellingPrice, IsManufactured: variant.IsManufactured,
	})
}

// @Summary      Delete product
// @Description  Deletes a product variant by ID
// @Tags         Products
// @Security     BearerAuth
// @Param        id   path  int  true  "Product ID"
// @Success      204  "No Content"
// @Failure      404  {object}  response.Response
// @Router       /products/{id} [delete]
func (h *ProductVariantHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "Invalid product ID")
		return
	}
	if err := h.variantService.Delete(c.Request.Context(), id); err != nil {
		if err == domainErrors.ErrProductVariantNotFound {
			response.NotFound(c, "Product not found")
		} else {
			response.InternalErrorDebug(c, "Failed to delete product", err)
		}
		return
	}
	response.NoContent(c)
}
