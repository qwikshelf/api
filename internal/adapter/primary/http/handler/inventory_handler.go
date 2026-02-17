package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/qwikshelf/api/internal/adapter/primary/http/middleware"
	"github.com/qwikshelf/api/internal/application/dto"
	"github.com/qwikshelf/api/internal/application/service"
	"github.com/qwikshelf/api/internal/domain/entity"
	domainErrors "github.com/qwikshelf/api/internal/domain/errors"
	"github.com/qwikshelf/api/pkg/response"
)

type InventoryHandler struct {
	inventoryService *service.InventoryService
}

func NewInventoryHandler(inventoryService *service.InventoryService) *InventoryHandler {
	return &InventoryHandler{inventoryService: inventoryService}
}

// @Summary      List inventory
// @Description  Returns inventory levels, optionally filtered by warehouse
// @Tags         Inventory
// @Produce      json
// @Security     BearerAuth
// @Param        warehouse_id  query  int  false  "Filter by warehouse ID"
// @Param        page          query  int  false  "Page number (default 1)"
// @Param        limit         query  int  false  "Items per page (default 20)"
// @Success      200  {object}  response.Response{data=[]dto.InventoryLevelResponse}
// @Router       /inventory [get]
func (h *InventoryHandler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}
	offset := (page - 1) * limit

	warehouseIDStr := c.Query("warehouse_id")
	var warehouseID *int64
	if warehouseIDStr != "" && warehouseIDStr != "undefined" && warehouseIDStr != "null" {
		id, err := strconv.ParseInt(warehouseIDStr, 10, 64)
		if err != nil {
			response.BadRequest(c, "Invalid warehouse ID")
			return
		}
		warehouseID = &id
	}

	levels, total, err := h.inventoryService.List(c.Request.Context(), warehouseID, offset, limit)
	if err != nil {
		response.InternalErrorDebug(c, "Failed to fetch inventory", err)
		return
	}

	var resp []dto.InventoryLevelResponse
	for _, l := range levels {
		lr := dto.InventoryLevelResponse{
			ID:          l.ID,
			WarehouseID: l.WarehouseID,
			VariantID:   l.VariantID,
			Quantity:    l.Quantity,
			BatchNumber: l.BatchNumber,
			ExpiryDate:  l.ExpiryDate,
		}
		if l.Variant != nil {
			lr.Variant = &dto.ProductVariantResponse{ID: l.Variant.ID, Name: l.Variant.Name, SKU: l.Variant.SKU}
		}
		if l.Warehouse != nil {
			lr.Warehouse = &dto.WarehouseResponse{ID: l.Warehouse.ID, Name: l.Warehouse.Name, Type: l.Warehouse.Type}
		}
		resp = append(resp, lr)
	}

	totalPages := int(total) / limit
	if int(total)%limit > 0 {
		totalPages++
	}

	meta := &response.Meta{
		Page:       page,
		PerPage:    limit,
		Total:      total,
		TotalPages: totalPages,
	}

	response.SuccessWithMeta(c, 200, "Inventory levels retrieved", resp, meta)
}

// @Summary      List inventory by warehouse
// @Description  Returns inventory levels for a specific warehouse
// @Tags         Inventory
// @Produce      json
// @Security     BearerAuth
// @Param        warehouseId  path  int  true  "Warehouse ID"
// @Success      200  {object}  response.Response{data=[]dto.InventoryLevelResponse}
// @Failure      404  {object}  response.Response
// @Router       /inventory/warehouse/{warehouseId} [get]
func (h *InventoryHandler) ListByWarehouse(c *gin.Context) {
	warehouseID, err := strconv.ParseInt(c.Param("warehouseId"), 10, 64)
	if err != nil {
		response.BadRequest(c, "Invalid warehouse ID")
		return
	}
	levels, err := h.inventoryService.ListByWarehouse(c.Request.Context(), warehouseID)
	if err != nil {
		if err == domainErrors.ErrWarehouseNotFound {
			response.NotFound(c, "Warehouse not found")
		} else {
			response.InternalErrorDebug(c, "Failed to fetch inventory", err)
		}
		return
	}
	var resp []dto.InventoryLevelResponse
	for _, l := range levels {
		lr := dto.InventoryLevelResponse{ID: l.ID, WarehouseID: l.WarehouseID, VariantID: l.VariantID, Quantity: l.Quantity, BatchNumber: l.BatchNumber, ExpiryDate: l.ExpiryDate}
		if l.Variant != nil {
			lr.Variant = &dto.ProductVariantResponse{ID: l.Variant.ID, Name: l.Variant.Name, SKU: l.Variant.SKU}
		}
		resp = append(resp, lr)
	}
	response.OK(c, "Warehouse inventory retrieved", resp)
}

// @Summary      Adjust inventory
// @Description  Adjusts stock level for a product variant in a warehouse
// @Tags         Inventory
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        request  body      dto.AdjustInventoryRequest  true  "Adjustment details"
// @Success      200      {object}  response.Response{data=dto.InventoryLevelResponse}
// @Failure      400      {object}  response.Response
// @Failure      404      {object}  response.Response
// @Router       /inventory/adjust [post]
func (h *InventoryHandler) Adjust(c *gin.Context) {
	var req dto.AdjustInventoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body")
		return
	}
	level, err := h.inventoryService.Adjust(c.Request.Context(), req.WarehouseID, req.VariantID, req.QuantityDelta)
	if err != nil {
		switch err {
		case domainErrors.ErrWarehouseNotFound:
			response.NotFound(c, "Warehouse not found")
		case domainErrors.ErrProductVariantNotFound:
			response.NotFound(c, "Product variant not found")
		default:
			response.InternalErrorDebug(c, "Failed to adjust inventory", err)
		}
		return
	}
	response.OK(c, "Inventory adjusted", dto.InventoryLevelResponse{ID: level.ID, WarehouseID: level.WarehouseID, VariantID: level.VariantID, Quantity: level.Quantity, BatchNumber: level.BatchNumber, ExpiryDate: level.ExpiryDate})
}

// @Summary      Transfer inventory
// @Description  Creates an inventory transfer between warehouses
// @Tags         Inventory
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        request  body      dto.CreateTransferRequest  true  "Transfer details"
// @Success      201      {object}  response.Response{data=dto.TransferResponse}
// @Failure      400      {object}  response.Response
// @Failure      404      {object}  response.Response
// @Router       /inventory/transfer [post]
func (h *InventoryHandler) Transfer(c *gin.Context) {
	var req dto.CreateTransferRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body")
		return
	}
	userID := middleware.GetUserID(c)
	if userID == 0 {
		response.Unauthorized(c, "Not authenticated")
		return
	}
	var items []entity.InventoryTransferItem
	for _, item := range req.Items {
		items = append(items, entity.InventoryTransferItem{VariantID: item.VariantID, Quantity: item.Quantity})
	}
	transfer, err := h.inventoryService.Transfer(c.Request.Context(), req.SourceWarehouseID, req.DestinationWarehouseID, userID, items)
	if err != nil {
		switch err {
		case domainErrors.ErrSameWarehouse:
			response.BadRequest(c, "Source and destination warehouse cannot be the same")
		case domainErrors.ErrWarehouseNotFound:
			response.NotFound(c, "Warehouse not found")
		case domainErrors.ErrProductVariantNotFound:
			response.NotFound(c, "Product variant not found")
		case domainErrors.ErrInsufficientStock:
			response.BadRequest(c, "Insufficient stock for transfer")
		case domainErrors.ErrInvalidQuantity:
			response.BadRequest(c, "Invalid quantity")
		default:
			response.InternalErrorDebug(c, "Failed to create transfer", err)
		}
		return
	}
	resp := dto.TransferResponse{
		ID: transfer.ID, SourceWarehouseID: transfer.SourceWarehouseID,
		DestinationWarehouseID: transfer.DestinationWarehouseID, AuthorizedByUserID: transfer.AuthorizedByUserID,
		TransferredAt: transfer.TransferredAt, Status: transfer.Status,
	}
	for _, item := range transfer.Items {
		resp.Items = append(resp.Items, dto.TransferItemResponse{ID: item.ID, VariantID: item.VariantID, Quantity: item.Quantity})
	}
	response.Created(c, "Transfer created", resp)
}
