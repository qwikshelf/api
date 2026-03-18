package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/qwikshelf/api/internal/application/dto"
	"github.com/qwikshelf/api/internal/application/service"
	domainErrors "github.com/qwikshelf/api/internal/domain/errors"
	"github.com/qwikshelf/api/pkg/response"
)

type WarehouseHandler struct {
	warehouseService *service.WarehouseService
}

func NewWarehouseHandler(warehouseService *service.WarehouseService) *WarehouseHandler {
	return &WarehouseHandler{warehouseService: warehouseService}
}

// @Summary      List warehouses
// @Description  Returns a list of all warehouses
// @Tags         Warehouses
// @Produce      json
// @Security     BearerAuth
// @Success      200  {object}  response.Response{data=[]dto.WarehouseResponse}
// @Failure      401  {object}  response.Response
// @Router       /warehouses [get]
func (h *WarehouseHandler) List(c *gin.Context) {
	warehouses, err := h.warehouseService.List(c.Request.Context())
	if err != nil {
		response.InternalErrorDebug(c, "Failed to fetch warehouses", err)
		return
	}
	resp := make([]dto.WarehouseResponse, 0)
	for _, w := range warehouses {
		resp = append(resp, dto.WarehouseResponse{ID: w.ID, Name: w.Name, Type: w.Type, Address: w.Address})
	}
	response.OK(c, "Warehouses retrieved", resp)
}

// @Summary      Create warehouse
// @Description  Creates a new warehouse
// @Tags         Warehouses
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        request  body      dto.CreateWarehouseRequest  true  "Warehouse details"
// @Success      201      {object}  response.Response{data=dto.WarehouseResponse}
// @Failure      400      {object}  response.Response
// @Router       /warehouses [post]
func (h *WarehouseHandler) Create(c *gin.Context) {
	var req dto.CreateWarehouseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body")
		return
	}
	warehouse, err := h.warehouseService.Create(c.Request.Context(), req.Name, req.Type, req.Address)
	if err != nil {
		if err == domainErrors.ErrInvalidInput {
			response.BadRequest(c, "Invalid warehouse type")
		} else {
			response.InternalErrorDebug(c, "Failed to create warehouse", err)
		}
		return
	}
	response.Created(c, "Warehouse created", dto.WarehouseResponse{ID: warehouse.ID, Name: warehouse.Name, Type: warehouse.Type, Address: warehouse.Address})
}

// @Summary      Get warehouse
// @Description  Returns a single warehouse by ID
// @Tags         Warehouses
// @Produce      json
// @Security     BearerAuth
// @Param        id   path      int  true  "Warehouse ID"
// @Success      200  {object}  response.Response{data=dto.WarehouseResponse}
// @Failure      404  {object}  response.Response
// @Router       /warehouses/{id} [get]
func (h *WarehouseHandler) Get(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "Invalid warehouse ID")
		return
	}
	warehouse, err := h.warehouseService.GetByID(c.Request.Context(), id)
	if err != nil {
		response.NotFound(c, "Warehouse not found")
		return
	}
	response.OK(c, "Warehouse retrieved", dto.WarehouseResponse{ID: warehouse.ID, Name: warehouse.Name, Type: warehouse.Type, Address: warehouse.Address})
}

// @Summary      Update warehouse
// @Description  Updates an existing warehouse
// @Tags         Warehouses
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id       path      int                         true  "Warehouse ID"
// @Param        request  body      dto.UpdateWarehouseRequest  true  "Updated details"
// @Success      200      {object}  response.Response{data=dto.WarehouseResponse}
// @Failure      404      {object}  response.Response
// @Router       /warehouses/{id} [put]
func (h *WarehouseHandler) Update(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "Invalid warehouse ID")
		return
	}
	var req dto.UpdateWarehouseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body")
		return
	}
	var name, address *string
	if req.Name != "" {
		name = &req.Name
	}
	if req.Address != "" {
		address = &req.Address
	}
	warehouse, err := h.warehouseService.Update(c.Request.Context(), id, name, &req.Type, address)
	if err != nil {
		if err == domainErrors.ErrWarehouseNotFound {
			response.NotFound(c, "Warehouse not found")
		} else {
			response.InternalErrorDebug(c, "Failed to update warehouse", err)
		}
		return
	}
	response.OK(c, "Warehouse updated", dto.WarehouseResponse{ID: warehouse.ID, Name: warehouse.Name, Type: warehouse.Type, Address: warehouse.Address})
}

// @Summary      Delete warehouse
// @Description  Deletes a warehouse by ID
// @Tags         Warehouses
// @Security     BearerAuth
// @Param        id   path  int  true  "Warehouse ID"
// @Success      204  "No Content"
// @Failure      404  {object}  response.Response
// @Router       /warehouses/{id} [delete]
func (h *WarehouseHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "Invalid warehouse ID")
		return
	}
	if err := h.warehouseService.Delete(c.Request.Context(), id); err != nil {
		if err == domainErrors.ErrWarehouseNotFound {
			response.NotFound(c, "Warehouse not found")
		} else {
			response.InternalErrorDebug(c, "Failed to delete warehouse", err)
		}
		return
	}
	response.NoContent(c)
}
