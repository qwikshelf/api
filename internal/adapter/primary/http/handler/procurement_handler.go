package handler

import (
	"fmt"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/shopspring/decimal"

	"github.com/qwikshelf/api/internal/application/dto"
	"github.com/qwikshelf/api/internal/application/service"
	"github.com/qwikshelf/api/internal/domain/entity"
	domainErrors "github.com/qwikshelf/api/internal/domain/errors"
	"github.com/qwikshelf/api/pkg/response"
)

// ProcurementHandler handles procurement API requests
type ProcurementHandler struct {
	procurementService *service.ProcurementService
}

// NewProcurementHandler creates a new procurement handler
func NewProcurementHandler(procurementService *service.ProcurementService) *ProcurementHandler {
	return &ProcurementHandler{procurementService: procurementService}
}

// mapProcurementResponse maps entity to response DTO
func mapProcurementResponse(p *entity.Procurement) dto.ProcurementResponse {
	resp := dto.ProcurementResponse{
		ID:               p.ID,
		SupplierID:       p.SupplierID,
		WarehouseID:      p.WarehouseID,
		OrderedByUserID:  p.OrderedByUserID,
		CreatedAt:        p.CreatedAt,
		ExpectedDelivery: p.ExpectedDelivery,
		Status:           string(p.Status),
		TotalCost:        p.CalculateTotalCost(),
	}
	if p.Supplier != nil {
		resp.SupplierName = p.Supplier.Name
	}
	if p.Warehouse != nil {
		resp.WarehouseName = p.Warehouse.Name
	}
	for _, item := range p.Items {
		itemResp := dto.ProcurementItemResponse{
			ID:               item.ID,
			VariantID:        item.VariantID,
			QuantityOrdered:  item.QuantityOrdered,
			QuantityReceived: item.QuantityReceived,
			UnitCost:         item.UnitCost,
			LineTotal:        item.LineTotal(),
		}
		if item.Variant != nil {
			itemResp.VariantName = item.Variant.Name
			itemResp.VariantSKU = item.Variant.SKU
			itemResp.VariantUnit = item.Variant.Unit
		}
		resp.Items = append(resp.Items, itemResp)
	}
	return resp
}

// Create creates a new procurement/purchase order
// @Summary      Create purchase order
// @Description  Creates a new purchase order for a supplier with line items
// @Tags         Procurements
// @Security     BearerAuth
// @Accept       json
// @Produce      json
// @Param        request  body  dto.CreateProcurementRequest  true  "Purchase order details"
// @Success      201  {object}  response.Response{data=dto.ProcurementResponse}
// @Failure      400  {object}  response.Response
// @Failure      404  {object}  response.Response
// @Failure      500  {object}  response.Response
// @Router       /procurements [post]
func (h *ProcurementHandler) Create(c *gin.Context) {
	var req dto.CreateProcurementRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, fmt.Sprintf("Invalid request body: %s", err.Error()))
		return
	}

	// Get user ID from context (set by auth middleware)
	userID, exists := c.Get("user_id")
	if !exists {
		response.Unauthorized(c, "User not authenticated")
		return
	}

	// Parse expected delivery date if provided
	var expectedDelivery *time.Time
	if req.ExpectedDelivery != "" {
		// Try YYYY-MM-DD format (typical for UI date pickers)
		t, err := time.Parse("2006-01-02", req.ExpectedDelivery)
		if err != nil {
			// Fallback to RFC3339
			t, err = time.Parse(time.RFC3339, req.ExpectedDelivery)
			if err != nil {
				response.BadRequest(c, "Invalid expected_delivery format. Use YYYY-MM-DD or RFC3339")
				return
			}
		}
		expectedDelivery = &t
	}

	procurement := &entity.Procurement{
		SupplierID:       req.SupplierID,
		WarehouseID:      req.WarehouseID,
		OrderedByUserID:  userID.(int64),
		ExpectedDelivery: expectedDelivery,
	}

	for _, item := range req.Items {
		procurement.Items = append(procurement.Items, entity.ProcurementItem{
			VariantID:       item.VariantID,
			QuantityOrdered: item.Quantity,
			UnitCost:        item.UnitCost,
		})
	}

	if err := h.procurementService.Create(c.Request.Context(), procurement); err != nil {
		if err == domainErrors.ErrSupplierNotFound {
			response.NotFound(c, "Supplier not found")
		} else {
			response.InternalErrorDebug(c, "Failed to create purchase order", err)
		}
		return
	}

	response.Success(c, 201, "Purchase order created", mapProcurementResponse(procurement))
}

// Get retrieves a procurement by ID
// @Summary      Get purchase order
// @Description  Returns a purchase order with all its line items and supplier/product details
// @Tags         Procurements
// @Security     BearerAuth
// @Param        id   path  int  true  "Procurement ID"
// @Success      200  {object}  response.Response{data=dto.ProcurementResponse}
// @Failure      404  {object}  response.Response
// @Router       /procurements/{id} [get]
func (h *ProcurementHandler) Get(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "Invalid procurement ID")
		return
	}

	procurement, err := h.procurementService.GetByID(c.Request.Context(), id)
	if err != nil {
		response.NotFound(c, "Purchase order not found")
		return
	}

	response.OK(c, "Purchase order retrieved", mapProcurementResponse(procurement))
}

// List retrieves all procurements with pagination
// @Summary      List purchase orders
// @Description  Returns paginated list of all purchase orders
// @Tags         Procurements
// @Security     BearerAuth
// @Param        page      query  int  false  "Page number" default(1)
// @Param        per_page  query  int  false  "Items per page" default(20)
// @Success      200  {object}  response.Response{data=[]dto.ProcurementResponse}
// @Failure      500  {object}  response.Response
// @Router       /procurements [get]
func (h *ProcurementHandler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "20"))
	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 100 {
		perPage = 20
	}
	offset := (page - 1) * perPage

	procurements, total, err := h.procurementService.List(c.Request.Context(), offset, perPage)
	if err != nil {
		response.InternalErrorDebug(c, "Failed to list purchase orders", err)
		return
	}

	var respList []dto.ProcurementResponse
	for _, p := range procurements {
		respList = append(respList, mapProcurementResponse(&p))
	}

	response.SuccessWithMeta(c, 200, "Purchase orders retrieved", respList, &response.Meta{
		Page:       page,
		PerPage:    perPage,
		Total:      total,
		TotalPages: (int(total) + perPage - 1) / perPage,
	})
}

// ListBySupplier retrieves procurements for a supplier
// @Summary      List purchase orders by supplier
// @Description  Returns all purchase orders for a specific supplier
// @Tags         Procurements
// @Security     BearerAuth
// @Param        supplierId  path  int  true  "Supplier ID"
// @Success      200  {object}  response.Response{data=[]dto.ProcurementResponse}
// @Failure      500  {object}  response.Response
// @Router       /procurements/supplier/{supplierId} [get]
func (h *ProcurementHandler) ListBySupplier(c *gin.Context) {
	supplierID, err := strconv.ParseInt(c.Param("supplierId"), 10, 64)
	if err != nil {
		response.BadRequest(c, "Invalid supplier ID")
		return
	}

	procurements, err := h.procurementService.ListBySupplier(c.Request.Context(), supplierID)
	if err != nil {
		response.InternalErrorDebug(c, "Failed to list purchase orders", err)
		return
	}

	var respList []dto.ProcurementResponse
	for _, p := range procurements {
		respList = append(respList, mapProcurementResponse(&p))
	}

	response.Success(c, 200, "Purchase orders retrieved", respList)
}

// UpdateStatus updates the status of a procurement
// @Summary      Update purchase order status
// @Description  Updates status. When set to 'received', inventory is auto-adjusted.
// @Tags         Procurements
// @Security     BearerAuth
// @Accept       json
// @Param        id       path  int                                true  "Procurement ID"
// @Param        request  body  dto.UpdateProcurementStatusRequest true  "New status"
// @Success      200  {object}  response.Response
// @Failure      400  {object}  response.Response
// @Failure      404  {object}  response.Response
// @Failure      500  {object}  response.Response
// @Router       /procurements/{id}/status [patch]
func (h *ProcurementHandler) UpdateStatus(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "Invalid procurement ID")
		return
	}

	var req dto.UpdateProcurementStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body")
		return
	}

	status := entity.ProcurementStatus(req.Status)
	if err := h.procurementService.UpdateStatus(c.Request.Context(), id, status); err != nil {
		if err == domainErrors.ErrProcurementNotFound {
			response.NotFound(c, "Purchase order not found")
		} else if err == domainErrors.ErrInvalidInput {
			response.BadRequest(c, "Invalid status")
		} else {
			response.InternalErrorDebug(c, "Failed to update status", err)
		}
		return
	}

	response.OK(c, "Status updated", nil)
}

// ReceiveItems records received quantities for procurement items
// @Summary      Receive items
// @Description  Records partial or full receipt of items in a purchase order
// @Tags         Procurements
// @Security     BearerAuth
// @Accept       json
// @Param        id       path  int                                true  "Procurement ID"
// @Param        request  body  dto.ReceiveProcurementItemRequest  true  "Items received"
// @Success      200  {object}  response.Response
// @Failure      400  {object}  response.Response
// @Failure      404  {object}  response.Response
// @Failure      500  {object}  response.Response
// @Router       /procurements/{id}/receive [patch]
func (h *ProcurementHandler) ReceiveItems(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "Invalid procurement ID")
		return
	}

	var req dto.ReceiveProcurementItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body")
		return
	}

	items := make([]struct {
		ItemID           int64
		QuantityReceived decimal.Decimal
	}, len(req.Items))
	for i, item := range req.Items {
		items[i].ItemID = item.ItemID
		items[i].QuantityReceived = item.QuantityReceived
	}

	if err := h.procurementService.ReceiveItems(c.Request.Context(), id, items); err != nil {
		if err == domainErrors.ErrProcurementNotFound {
			response.NotFound(c, "Purchase order not found")
		} else {
			response.InternalErrorDebug(c, "Failed to receive items", err)
		}
		return
	}

	response.OK(c, "Items received", nil)
}
