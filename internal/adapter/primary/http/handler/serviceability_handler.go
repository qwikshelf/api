package handler

import (
	"io"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/qwikshelf/api/internal/application/service"
	"github.com/qwikshelf/api/internal/domain/entity"
	"github.com/qwikshelf/api/pkg/response"
)

type ServiceabilityHandler struct {
	deliveryService *service.DeliveryService
}

func NewServiceabilityHandler(deliveryService *service.DeliveryService) *ServiceabilityHandler {
	return &ServiceabilityHandler{deliveryService: deliveryService}
}

// Zones
func (h *ServiceabilityHandler) CreateZone(c *gin.Context) {
	var zone entity.DeliveryZone
	if err := c.ShouldBindJSON(&zone); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	if err := h.deliveryService.CreateZone(c.Request.Context(), &zone); err != nil {
		response.InternalErrorDebug(c, "Failed to create zone", err)
		return
	}

	response.Created(c, "Zone created", zone)
}

func (h *ServiceabilityHandler) ListZones(c *gin.Context) {
	zones, err := h.deliveryService.ListZones(c.Request.Context())
	if err != nil {
		response.InternalErrorDebug(c, "Failed to list zones", err)
		return
	}
	response.OK(c, "Zones retrieved", zones)
}

func (h *ServiceabilityHandler) UpdateZone(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	var zone entity.DeliveryZone
	if err := c.ShouldBindJSON(&zone); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	zone.ID = id

	if err := h.deliveryService.UpdateZone(c.Request.Context(), &zone); err != nil {
		response.InternalErrorDebug(c, "Failed to update zone", err)
		return
	}

	response.OK(c, "Zone updated", zone)
}

// Mapping
func (h *ServiceabilityHandler) MapPincode(c *gin.Context) {
	var req struct {
		Pincode string `json:"pincode" binding:"required"`
		ZoneID  int64  `json:"zone_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	if err := h.deliveryService.MapPincodeToZone(c.Request.Context(), req.Pincode, req.ZoneID); err != nil {
		response.InternalErrorDebug(c, "Failed to map pincode", err)
		return
	}

	response.OK(c, "Pincode mapped to zone", nil)
}

// GeoData
func (h *ServiceabilityHandler) SaveGeoData(c *gin.Context) {
	var geo entity.PincodeGeoData
	if err := c.ShouldBindJSON(&geo); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	if err := h.deliveryService.SaveGeoData(c.Request.Context(), &geo); err != nil {
		response.InternalErrorDebug(c, "Failed to save geodata", err)
		return
	}

	response.OK(c, "GeoData saved", nil)
}

// Import
func (h *ServiceabilityHandler) ImportPincodes(c *gin.Context) {
	zoneID, _ := strconv.ParseInt(c.PostForm("zone_id"), 10, 64)
	file, err := c.FormFile("file")
	if err != nil {
		response.BadRequest(c, "File is required")
		return
	}

	f, err := file.Open()
	if err != nil {
		response.InternalErrorDebug(c, "Failed to open file", err)
		return
	}
	defer f.Close()

	data, err := io.ReadAll(f)
	if err != nil {
		response.InternalErrorDebug(c, "Failed to read file", err)
		return
	}

	if err := h.deliveryService.ImportPincodesFromGeoJSON(c.Request.Context(), data, zoneID); err != nil {
		response.InternalErrorDebug(c, "Failed to import pincodes", err)
		return
	}

	response.OK(c, "Import completed successfully", nil)
}

func (h *ServiceabilityHandler) ListGeoData(c *gin.Context) {
	data, err := h.deliveryService.ListGeoData(c.Request.Context())
	if err != nil {
		response.InternalErrorDebug(c, "Failed to list geodata", err)
		return
	}
	response.OK(c, "GeoData retrieved", data)
}
