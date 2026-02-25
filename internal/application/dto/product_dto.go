package dto

import "github.com/shopspring/decimal"

// --- Category DTOs ---

// CreateCategoryRequest represents a request to create a category.
// Name must be between 2 and 100 characters.
type CreateCategoryRequest struct {
	Name string `json:"name" binding:"required,min=2,max=100"`
}

// UpdateCategoryRequest represents a request to update a category
type UpdateCategoryRequest struct {
	Name string `json:"name" binding:"required,min=2,max=100"`
}

// CategoryResponse represents a category in API responses
type CategoryResponse struct {
	ID   int64  `json:"id"`
	Name string `json:"name"`
}

// --- Product Family DTOs ---

// CreateProductFamilyRequest represents a request to create a product family.
// A valid CategoryID is required. Name must be between 2 and 100 characters.
type CreateProductFamilyRequest struct {
	CategoryID  int64  `json:"category_id" binding:"required"`
	Name        string `json:"name" binding:"required,min=2,max=100"`
	Description string `json:"description,omitempty"`
}

// UpdateProductFamilyRequest represents a request to update a product family
type UpdateProductFamilyRequest struct {
	CategoryID  int64  `json:"category_id,omitempty"`
	Name        string `json:"name,omitempty" binding:"omitempty,min=2,max=100"`
	Description string `json:"description,omitempty"`
}

// ProductFamilyResponse represents a product family in API responses
type ProductFamilyResponse struct {
	ID          int64             `json:"id"`
	CategoryID  int64             `json:"category_id"`
	Category    *CategoryResponse `json:"category,omitempty"`
	Name        string            `json:"name"`
	Description string            `json:"description,omitempty"`
}

// --- Product Variant DTOs ---

// CreateProductVariantRequest represents a request to create a product variant.
// SKU must be unique and between 2 and 50 characters.
// CostPrice and SellingPrice are required.
type CreateProductVariantRequest struct {
	FamilyID         int64           `json:"family_id" binding:"required"`
	Name             string          `json:"name" binding:"required,min=2,max=100"`
	SKU              string          `json:"sku" binding:"required,min=2,max=50"`
	Barcode          string          `json:"barcode,omitempty" binding:"omitempty,max=50"`
	Unit             string          `json:"unit" binding:"required,oneof=piece kg liter box pack dozen"`
	CostPrice        decimal.Decimal `json:"cost_price" binding:"required"`
	SellingPrice     decimal.Decimal `json:"selling_price" binding:"required"`
	IsManufactured   bool            `json:"is_manufactured"`
	ConversionFactor decimal.Decimal `json:"conversion_factor"`
}

// UpdateProductVariantRequest represents a request to update a product variant
type UpdateProductVariantRequest struct {
	FamilyID         int64            `json:"family_id,omitempty"`
	Name             string           `json:"name,omitempty" binding:"omitempty,min=2,max=100"`
	SKU              string           `json:"sku,omitempty" binding:"omitempty,min=2,max=50"`
	Barcode          string           `json:"barcode,omitempty" binding:"omitempty,max=50"`
	Unit             string           `json:"unit,omitempty" binding:"omitempty,oneof=piece kg liter box pack dozen"`
	CostPrice        *decimal.Decimal `json:"cost_price,omitempty"`
	SellingPrice     *decimal.Decimal `json:"selling_price,omitempty"`
	IsManufactured   *bool            `json:"is_manufactured,omitempty"`
	ConversionFactor *decimal.Decimal `json:"conversion_factor,omitempty"`
}

// ProductVariantResponse represents a product variant in API responses
type ProductVariantResponse struct {
	ID               int64                  `json:"id"`
	FamilyID         int64                  `json:"family_id"`
	Family           *ProductFamilyResponse `json:"family,omitempty"`
	FamilyName       string                 `json:"family_name,omitempty"`
	Name             string                 `json:"name"`
	SKU              string                 `json:"sku"`
	Barcode          string                 `json:"barcode,omitempty"`
	Unit             string                 `json:"unit"`
	CostPrice        decimal.Decimal        `json:"cost_price"`
	SellingPrice     decimal.Decimal        `json:"selling_price"`
	IsManufactured   bool                   `json:"is_manufactured"`
	ConversionFactor decimal.Decimal        `json:"conversion_factor"`
}
