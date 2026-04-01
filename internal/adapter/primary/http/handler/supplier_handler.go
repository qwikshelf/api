package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/qwikshelf/api/internal/application/dto"
	"github.com/qwikshelf/api/internal/application/service"
	"github.com/qwikshelf/api/internal/domain/entity"
	domainErrors "github.com/qwikshelf/api/internal/domain/errors"
	"github.com/qwikshelf/api/pkg/logger"
	"github.com/qwikshelf/api/pkg/response"
)

type SupplierHandler struct {
	supplierService *service.SupplierService
}

func NewSupplierHandler(supplierService *service.SupplierService) *SupplierHandler {
	return &SupplierHandler{supplierService: supplierService}
}

// @Summary      List suppliers
// @Description  Returns a paginated list of suppliers
// @Tags         Suppliers
// @Produce      json
// @Security     BearerAuth
// @Param        page      query  int  false  "Page number"    default(1)
// @Param        per_page  query  int  false  "Items per page" default(20)
// @Success      200  {object}  response.Response{data=[]dto.SupplierResponse}
// @Router       /suppliers [get]
func (h *SupplierHandler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "20"))
	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 100 {
		perPage = 20
	}
	offset := (page - 1) * perPage
	suppliers, total, err := h.supplierService.List(c.Request.Context(), offset, perPage)
	if err != nil {
		response.InternalErrorDebug(c, "Failed to fetch suppliers", err)
		return
	}
	var resp []dto.SupplierResponse
	for _, s := range suppliers {
		var lat, lng float64
		if s.Latitude != nil {
			lat = *s.Latitude
		}
		if s.Longitude != nil {
			lng = *s.Longitude
		}
		resp = append(resp, dto.SupplierResponse{
			ID:        s.ID,
			Name:      s.Name,
			Phone:     s.Phone,
			Location:  s.Location,
			Latitude:  lat,
			Longitude: lng,
			ZoneID:    s.ZoneID,
			ZoneName:  s.ZoneName,
		})
	}
	logger.Info().Interface("suppliers===", resp).Msg("Suppliers retrieved")
	totalPages := int(total) / perPage
	if int(total)%perPage > 0 {
		totalPages++
	}
	response.SuccessWithMeta(c, 200, "Suppliers retrieved", resp, &response.Meta{Page: page, PerPage: perPage, Total: total, TotalPages: totalPages})
}

// @Summary      Create supplier
// @Description  Creates a new supplier
// @Tags         Suppliers
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        request  body      dto.CreateSupplierRequest  true  "Supplier details"
// @Success      201      {object}  response.Response{data=dto.SupplierResponse}
// @Failure      400      {object}  response.Response
// @Router       /suppliers [post]
func (h *SupplierHandler) Create(c *gin.Context) {
	var req dto.CreateSupplierRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body")
		return
	}
	
	if req.ZoneID != nil && *req.ZoneID == 0 {
		req.ZoneID = nil
	}

	supplier, err := h.supplierService.Create(c.Request.Context(), req.Name, req.Phone, req.Location, req.Latitude, req.Longitude, req.ZoneID)
	if err != nil {
		response.InternalErrorDebug(c, "Failed to create supplier", err)
		return
	}
	var lat, lng float64
	if supplier.Latitude != nil {
		lat = *supplier.Latitude
	}
	if supplier.Longitude != nil {
		lng = *supplier.Longitude
	}
	response.Created(c, "Supplier created", dto.SupplierResponse{
		ID:        supplier.ID,
		Name:      supplier.Name,
		Phone:     supplier.Phone,
		Location:  supplier.Location,
		Latitude:  lat,
		Longitude: lng,
		ZoneID:    supplier.ZoneID,
		ZoneName:  supplier.ZoneName,
	})
}

// @Summary      Get supplier
// @Description  Returns a single supplier by ID
// @Tags         Suppliers
// @Produce      json
// @Security     BearerAuth
// @Param        id   path      int  true  "Supplier ID"
// @Success      200  {object}  response.Response{data=dto.SupplierResponse}
// @Failure      404  {object}  response.Response
// @Router       /suppliers/{id} [get]
func (h *SupplierHandler) Get(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "Invalid supplier ID")
		return
	}
	supplier, err := h.supplierService.GetByID(c.Request.Context(), id)
	if err != nil {
		response.NotFound(c, "Supplier not found")
		return
	}
	var lat, lng float64
	if supplier.Latitude != nil {
		lat = *supplier.Latitude
	}
	if supplier.Longitude != nil {
		lng = *supplier.Longitude
	}
	response.OK(c, "Supplier retrieved", dto.SupplierResponse{
		ID:        supplier.ID,
		Name:      supplier.Name,
		Phone:     supplier.Phone,
		Location:  supplier.Location,
		Latitude:  lat,
		Longitude: lng,
		ZoneID:    supplier.ZoneID,
		ZoneName:  supplier.ZoneName,
	})
}

// @Summary      Update supplier
// @Description  Updates an existing supplier
// @Tags         Suppliers
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id       path      int                        true  "Supplier ID"
// @Param        request  body      dto.UpdateSupplierRequest  true  "Updated details"
// @Success      200      {object}  response.Response{data=dto.SupplierResponse}
// @Failure      404      {object}  response.Response
// @Router       /suppliers/{id} [put]
func (h *SupplierHandler) Update(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "Invalid supplier ID")
		return
	}
	var req dto.UpdateSupplierRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body")
		return
	}
	var name, phone, location *string
	if req.Name != "" {
		name = &req.Name
	}
	if req.Phone != "" {
		phone = &req.Phone
	}
	if req.Location != "" {
		location = &req.Location
	}
	
	if req.ZoneID != nil && *req.ZoneID == 0 {
		req.ZoneID = nil
	}

	supplier, err := h.supplierService.Update(c.Request.Context(), id, name, phone, location, req.Latitude, req.Longitude, req.ZoneID)
	if err != nil {
		if err == domainErrors.ErrSupplierNotFound {
			response.NotFound(c, "Supplier not found")
		} else {
			response.InternalErrorDebug(c, "Failed to update supplier", err)
		}
		return
	}
	var lat, lng float64
	if supplier.Latitude != nil {
		lat = *supplier.Latitude
	}
	if supplier.Longitude != nil {
		lng = *supplier.Longitude
	}
	response.OK(c, "Supplier updated", dto.SupplierResponse{
		ID:        supplier.ID,
		Name:      supplier.Name,
		Phone:     supplier.Phone,
		Location:  supplier.Location,
		Latitude:  lat,
		Longitude: lng,
		ZoneID:    supplier.ZoneID,
		ZoneName:  supplier.ZoneName,
	})
}

// @Summary      Delete supplier
// @Description  Deletes a supplier by ID
// @Tags         Suppliers
// @Security     BearerAuth
// @Param        id   path  int  true  "Supplier ID"
// @Success      204  "No Content"
// @Failure      404  {object}  response.Response
// @Router       /suppliers/{id} [delete]
func (h *SupplierHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "Invalid supplier ID")
		return
	}
	if err := h.supplierService.Delete(c.Request.Context(), id); err != nil {
		if err == domainErrors.ErrSupplierNotFound {
			response.NotFound(c, "Supplier not found")
		} else {
			response.InternalErrorDebug(c, "Failed to delete supplier", err)
		}
		return
	}
	response.NoContent(c)
}

// @Summary      List variants for supplier
// @Description  Returns all product variants provided by a supplier
// @Tags         Suppliers
// @Produce      json
// @Security     BearerAuth
// @Param        id   path      int  true  "Supplier ID"
// @Success      200  {object}  response.Response{data=[]dto.SupplierVariantResponse}
// @Failure      404  {object}  response.Response
// @Router       /suppliers/{id}/variants [get]
func (h *SupplierHandler) ListVariants(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "Invalid supplier ID")
		return
	}
	variants, err := h.supplierService.GetVariants(c.Request.Context(), id)
	if err != nil {
		if err == domainErrors.ErrSupplierNotFound {
			response.NotFound(c, "Supplier not found")
		} else {
			response.InternalErrorDebug(c, "Failed to fetch supplier variants", err)
		}
		return
	}
	resp := make([]dto.SupplierVariantResponse, 0)
	for _, sv := range variants {
		item := dto.SupplierVariantResponse{
			SupplierID:  sv.SupplierID,
			VariantID:   sv.VariantID,
			AgreedCost:  sv.AgreedCost,
			IsPreferred: sv.IsPreferred,
		}
		if sv.Supplier != nil {
			var lat, lng float64
			if sv.Supplier.Latitude != nil {
				lat = *sv.Supplier.Latitude
			}
			if sv.Supplier.Longitude != nil {
				lng = *sv.Supplier.Longitude
			}
			item.Supplier = &dto.SupplierResponse{
				ID:        sv.Supplier.ID,
				Name:      sv.Supplier.Name,
				Phone:     sv.Supplier.Phone,
				Location:  sv.Supplier.Location,
				Latitude:  lat,
				Longitude: lng,
				ZoneID:    sv.Supplier.ZoneID,
				ZoneName:  sv.Supplier.ZoneName,
			}
		}
		if sv.Variant != nil {
			item.Variant = &dto.ProductVariantResponse{
				ID:         sv.Variant.ID,
				Name:       sv.Variant.Name,
				SKU:        sv.Variant.SKU,
				FamilyName: sv.Variant.FamilyName,
			}
		}
		resp = append(resp, item)
	}
	response.OK(c, "Supplier variants retrieved", resp)
}

// @Summary      Add variant to supplier
// @Description  Links a product variant to a supplier with cost
// @Tags         Suppliers
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id       path      int                         true  "Supplier ID"
// @Param        request  body      dto.AddSupplierVariantRequest  true  "Variant details"
// @Success      201      {object}  response.Response
// @Failure      400      {object}  response.Response
// @Router       /suppliers/{id}/variants [post]
func (h *SupplierHandler) AddVariant(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "Invalid supplier ID")
		return
	}
	var req dto.AddSupplierVariantRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body")
		return
	}
	sv := &entity.SupplierVariant{
		VariantID:   req.VariantID,
		AgreedCost:  req.AgreedCost,
		IsPreferred: req.IsPreferred,
	}
	if err := h.supplierService.AddVariant(c.Request.Context(), id, sv); err != nil {
		if err == domainErrors.ErrSupplierNotFound {
			response.NotFound(c, "Supplier not found")
		} else {
			response.InternalErrorDebug(c, "Failed to add variant to supplier", err)
		}
		return
	}
	response.Created(c, "Variant added to supplier", nil)
}

// @Summary      Remove variant from supplier
// @Description  Removes the link between a supplier and a product variant
// @Tags         Suppliers
// @Security     BearerAuth
// @Param        id        path  int  true  "Supplier ID"
// @Param        variantId path  int  true  "Variant ID"
// @Success      204  "No Content"
// @Failure      404  {object}  response.Response
// @Failure      500  {object}  response.Response
// @Router       /suppliers/{id}/variants/{variantId} [delete]
func (h *SupplierHandler) RemoveVariant(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "Invalid supplier ID")
		return
	}
	variantID, err := strconv.ParseInt(c.Param("variantId"), 10, 64)
	if err != nil {
		response.BadRequest(c, "Invalid variant ID")
		return
	}

	if err := h.supplierService.RemoveVariant(c.Request.Context(), id, variantID); err != nil {
		if err == domainErrors.ErrSupplierNotFound {
			response.NotFound(c, "Supplier not found")
		} else {
			response.InternalErrorDebug(c, "Failed to remove variant from supplier", err)
		}
		return
	}

	response.NoContent(c)
}
