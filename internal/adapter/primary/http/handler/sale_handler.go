package handler

import (
	"fmt"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/qwikshelf/api/internal/application/dto"
	"github.com/qwikshelf/api/internal/application/service"
	"github.com/qwikshelf/api/internal/domain/entity"
	domainErrors "github.com/qwikshelf/api/internal/domain/errors"
	"github.com/qwikshelf/api/pkg/response"
)

// SaleHandler handles POS/Sale API requests
type SaleHandler struct {
	saleService *service.SaleService
}

// NewSaleHandler creates a new sale handler
func NewSaleHandler(saleService *service.SaleService) *SaleHandler {
	return &SaleHandler{saleService: saleService}
}

// mapSaleResponse maps sale entity to response DTO
func mapSaleResponse(s *entity.Sale) dto.SaleResponse {
	resp := dto.SaleResponse{
		ID:                s.ID,
		WarehouseID:       s.WarehouseID,
		CustomerName:      s.CustomerName,
		TotalAmount:       s.TotalAmount,
		TaxAmount:         s.TaxAmount,
		DiscountAmount:    s.DiscountAmount,
		PaymentMethod:     s.PaymentMethod,
		ProcessedByUserID: s.ProcessedByUserID,
		CreatedAt:         s.CreatedAt,
	}

	if s.Warehouse != nil {
		resp.WarehouseName = s.Warehouse.Name
	}
	if s.ProcessedByUser != nil {
		resp.ProcessedByName = s.ProcessedByUser.Username
	}

	for _, item := range s.Items {
		itemResp := dto.SaleItemResponse{
			ID:        item.ID,
			VariantID: item.VariantID,
			Quantity:  item.Quantity,
			UnitPrice: item.UnitPrice,
			LineTotal: item.LineTotal,
		}
		if item.Variant != nil {
			itemResp.VariantName = item.Variant.Name
			itemResp.VariantSKU = item.Variant.SKU
		}
		resp.Items = append(resp.Items, itemResp)
	}

	return resp
}

// Create processes a new sale (POS)
// @Summary      Process sale
// @Description  Creates a new sale and deducts inventory
// @Tags         Sales
// @Security     BearerAuth
// @Accept       json
// @Produce      json
// @Param        request  body  dto.CreateSaleRequest  true  "Sale details"
// @Success      201  {object}  response.Response{data=dto.SaleResponse}
// @Failure      400  {object}  response.Response
// @Failure      404  {object}  response.Response
// @Failure      500  {object}  response.Response
// @Router       /sales [post]
func (h *SaleHandler) Create(c *gin.Context) {
	var req dto.CreateSaleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, fmt.Sprintf("Invalid request body: %s", err.Error()))
		return
	}

	// Get user ID from context
	userID, exists := c.Get("user_id")
	if !exists {
		response.Unauthorized(c, "User not authenticated")
		return
	}

	sale := &entity.Sale{
		WarehouseID:       req.WarehouseID,
		CustomerName:      req.CustomerName,
		TaxAmount:         req.TaxAmount,
		DiscountAmount:    req.DiscountAmount,
		PaymentMethod:     req.PaymentMethod,
		ProcessedByUserID: userID.(int64),
	}

	for _, item := range req.Items {
		sale.Items = append(sale.Items, entity.SaleItem{
			VariantID: item.VariantID,
			Quantity:  item.Quantity,
			UnitPrice: item.UnitPrice,
		})
	}

	if err := h.saleService.ProcessSale(c.Request.Context(), sale); err != nil {
		if err == domainErrors.ErrWarehouseNotFound {
			response.NotFound(c, "Warehouse not found")
		} else if err == domainErrors.ErrProductVariantNotFound {
			response.NotFound(c, "One or more products not found")
		} else if err == domainErrors.ErrInsufficientStock {
			response.BadRequest(c, "Insufficient stock for one or more items")
		} else {
			response.InternalErrorDebug(c, "Failed to process sale", err)
		}
		return
	}

	response.Success(c, 201, "Sale completed successfully", mapSaleResponse(sale))
}

// Get retrieves a sale by ID
func (h *SaleHandler) Get(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "Invalid sale ID")
		return
	}

	sale, err := h.saleService.GetByID(c.Request.Context(), id)
	if err != nil {
		response.NotFound(c, "Sale not found")
		return
	}

	response.OK(c, "Sale retrieved", mapSaleResponse(sale))
}

// List retrieves sales history
func (h *SaleHandler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "20"))
	var warehouseID *int64
	if wid, err := strconv.ParseInt(c.Query("warehouse_id"), 10, 64); err == nil {
		warehouseID = &wid
	}

	offset := (page - 1) * perPage
	sales, total, err := h.saleService.List(c.Request.Context(), warehouseID, offset, perPage)
	if err != nil {
		response.InternalErrorDebug(c, "Failed to list sales history", err)
		return
	}

	var respList []dto.SaleResponse
	for _, s := range sales {
		respList = append(respList, mapSaleResponse(&s))
	}

	response.SuccessWithMeta(c, 200, "Sales history retrieved", respList, &response.Meta{
		Page:       page,
		PerPage:    perPage,
		Total:      total,
		TotalPages: (int(total) + perPage - 1) / perPage,
	})
}
