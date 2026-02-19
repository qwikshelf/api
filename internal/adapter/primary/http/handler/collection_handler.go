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

type CollectionHandler struct {
	collectionService *service.CollectionService
}

func NewCollectionHandler(collectionService *service.CollectionService) *CollectionHandler {
	return &CollectionHandler{collectionService: collectionService}
}

// @Summary      Record a collection
// @Description  Allows an agent to record a product receipt with weight and supplier
// @Tags         Collections
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        request  body      dto.RecordCollectionRequest  true  "Collection details"
// @Success      201      {object}  response.Response{data=dto.CollectionResponse}
// @Failure      400      {object}  response.Response
// @Router       /collections [post]
func (h *CollectionHandler) Record(c *gin.Context) {
	var req dto.RecordCollectionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, fmt.Sprintf("Invalid request body: %s", err.Error()))
		return
	}

	// Get user ID from context (Agent)
	userID, exists := c.Get("user_id")
	if !exists {
		response.Unauthorized(c, "User not authenticated")
		return
	}

	collection := &entity.Collection{
		VariantID:   req.VariantID,
		SupplierID:  req.SupplierID,
		AgentID:     userID.(int64),
		WarehouseID: req.WarehouseID,
		Weight:      req.Weight,
		CollectedAt: req.CollectedAt,
		Notes:       req.Notes,
	}

	if err := h.collectionService.RecordCollection(c.Request.Context(), collection); err != nil {
		if err == domainErrors.ErrWarehouseNotFound {
			response.NotFound(c, "Warehouse not found")
		} else if err == domainErrors.ErrProductVariantNotFound {
			response.NotFound(c, "Product variant not found")
		} else if err == domainErrors.ErrSupplierNotFound {
			response.NotFound(c, "Supplier not found")
		} else {
			response.InternalErrorDebug(c, "Failed to record collection", err)
		}
		return
	}

	response.Created(c, "Collection recorded successfully", mapCollectionResponse(collection))
}

// @Summary      List collections
// @Description  Returns a paginated list of all collections
// @Tags         Collections
// @Produce      json
// @Security     BearerAuth
// @Param        page      query  int  false  "Page number"    default(1)
// @Param        per_page  query  int  false  "Items per page" default(20)
// @Success      200  {object}  response.Response{data=[]dto.CollectionResponse}
// @Router       /collections [get]
func (h *CollectionHandler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "20"))
	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 100 {
		perPage = 20
	}
	offset := (page - 1) * perPage

	collections, total, err := h.collectionService.ListCollections(c.Request.Context(), offset, perPage)
	if err != nil {
		response.InternalErrorDebug(c, "Failed to fetch collections", err)
		return
	}

	resp := make([]dto.CollectionResponse, 0)
	for _, col := range collections {
		resp = append(resp, mapCollectionResponse(&col))
	}

	totalPages := int(total) / perPage
	if int(total)%perPage > 0 {
		totalPages++
	}

	response.SuccessWithMeta(c, 200, "Collections retrieved", resp, &response.Meta{
		Page:       page,
		PerPage:    perPage,
		Total:      total,
		TotalPages: totalPages,
	})
}

func mapCollectionResponse(c *entity.Collection) dto.CollectionResponse {
	resp := dto.CollectionResponse{
		ID:          c.ID,
		VariantID:   c.VariantID,
		SupplierID:  c.SupplierID,
		AgentID:     c.AgentID,
		WarehouseID: c.WarehouseID,
		Weight:      c.Weight,
		CollectedAt: c.CollectedAt,
		Notes:       c.Notes,
	}

	if c.Variant != nil {
		resp.VariantName = c.Variant.Name
	}
	if c.Supplier != nil {
		resp.SupplierName = c.Supplier.Name
	}
	if c.Agent != nil {
		resp.AgentName = c.Agent.Username
	}

	return resp
}
