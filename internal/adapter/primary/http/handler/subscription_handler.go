package handler

import (
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

// SubscriptionHandler handles HTTP requests for customer subscriptions
type SubscriptionHandler struct {
	subscriptionService *service.SubscriptionService
}

// NewSubscriptionHandler creates a new SubscriptionHandler
func NewSubscriptionHandler(subscriptionService *service.SubscriptionService) *SubscriptionHandler {
	return &SubscriptionHandler{subscriptionService: subscriptionService}
}

// List godoc
// @Summary      List subscriptions for a customer
// @Description  Returns all subscriptions for a given customer ID
// @Tags         Subscriptions
// @Produce      json
// @Security     BearerAuth
// @Param        customer_id  query  int  true  "Customer ID"
// @Success      200  {object}  response.Response{data=[]dto.SubscriptionResponse}
// @Router       /subscriptions [get]
func (h *SubscriptionHandler) List(c *gin.Context) {
	var filter dto.SubscriptionListFilter
	if err := c.ShouldBindQuery(&filter); err != nil {
		response.BadRequest(c, "Invalid query parameters")
		return
	}

	subs, err := h.subscriptionService.ListFiltered(c.Request.Context(), filter)
	if err != nil {
		response.InternalErrorDebug(c, "Failed to fetch subscriptions", err)
		return
	}

	var resp []dto.SubscriptionResponse
	for _, sub := range subs {
		resp = append(resp, mapSubscriptionToResponse(sub))
	}
	if resp == nil {
		resp = []dto.SubscriptionResponse{}
	}

	response.OK(c, "Subscriptions retrieved", resp)
}

// Create godoc
// @Summary      Create a subscription
// @Description  Creates a new recurring product subscription for a customer
// @Tags         Subscriptions
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        request  body      dto.CreateSubscriptionRequest  true  "Subscription details"
// @Success      201      {object}  response.Response{data=dto.SubscriptionResponse}
// @Failure      400      {object}  response.Response
// @Router       /subscriptions [post]
func (h *SubscriptionHandler) Create(c *gin.Context) {
	var req dto.CreateSubscriptionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body: "+err.Error())
		return
	}

	startDate, err := time.Parse("2006-01-02", req.StartDate)
	if err != nil {
		response.BadRequest(c, "Invalid start_date format, expected YYYY-MM-DD")
		return
	}

	var endDate *time.Time
	if req.EndDate != nil {
		parsed, err := time.Parse("2006-01-02", *req.EndDate)
		if err != nil {
			response.BadRequest(c, "Invalid end_date format, expected YYYY-MM-DD")
			return
		}
		endDate = &parsed
	}

	sub := &entity.Subscription{
		CustomerID:           req.CustomerID,
		Status:               entity.SubscriptionStatusActive,
		Frequency:            entity.SubscriptionFrequency(req.Frequency),
		StartDate:            startDate,
		EndDate:              endDate,
		DeliveryInstructions: req.DeliveryInstructions,
	}

	for _, item := range req.Items {
		sub.Items = append(sub.Items, entity.SubscriptionItem{
			VariantID: item.VariantID,
			Quantity:  decimal.NewFromFloat(item.Quantity),
		})
	}

	created, err := h.subscriptionService.Create(c.Request.Context(), sub)
	if err != nil {
		if err == domainErrors.ErrInvalidInput {
			response.BadRequest(c, "Invalid subscription data")
		} else {
			response.InternalErrorDebug(c, "Failed to create subscription", err)
		}
		return
	}

	response.Created(c, "Subscription created", mapSubscriptionToResponse(created))
}

// Get godoc
// @Summary      Get a subscription
// @Description  Returns a single subscription by ID
// @Tags         Subscriptions
// @Produce      json
// @Security     BearerAuth
// @Param        id   path      int  true  "Subscription ID"
// @Success      200  {object}  response.Response{data=dto.SubscriptionResponse}
// @Failure      404  {object}  response.Response
// @Router       /subscriptions/{id} [get]
func (h *SubscriptionHandler) Get(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "Invalid subscription ID")
		return
	}

	sub, err := h.subscriptionService.GetByID(c.Request.Context(), id)
	if err != nil {
		if domainErrors.IsNotFound(err) {
			response.NotFound(c, "Subscription not found")
		} else {
			response.InternalErrorDebug(c, "Failed to fetch subscription", err)
		}
		return
	}

	response.OK(c, "Subscription retrieved", mapSubscriptionToResponse(sub))
}

// Update godoc
// @Summary      Update a subscription
// @Description  Updates frequency, dates, delivery instructions, and/or items
// @Tags         Subscriptions
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id       path      int                           true  "Subscription ID"
// @Param        request  body      dto.UpdateSubscriptionRequest true  "Updated subscription"
// @Success      200      {object}  response.Response{data=dto.SubscriptionResponse}
// @Failure      404      {object}  response.Response
// @Router       /subscriptions/{id} [put]
func (h *SubscriptionHandler) Update(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "Invalid subscription ID")
		return
	}

	var req dto.UpdateSubscriptionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body: "+err.Error())
		return
	}

	// Fetch the existing subscription to merge
	existing, err := h.subscriptionService.GetByID(c.Request.Context(), id)
	if err != nil {
		if domainErrors.IsNotFound(err) {
			response.NotFound(c, "Subscription not found")
		} else {
			response.InternalErrorDebug(c, "Failed to fetch subscription", err)
		}
		return
	}

	if req.Frequency != "" {
		existing.Frequency = entity.SubscriptionFrequency(req.Frequency)
	}
	if req.StartDate != "" {
		parsed, err := time.Parse("2006-01-02", req.StartDate)
		if err != nil {
			response.BadRequest(c, "Invalid start_date format, expected YYYY-MM-DD")
			return
		}
		existing.StartDate = parsed
	}
	if req.EndDate != nil {
		parsed, err := time.Parse("2006-01-02", *req.EndDate)
		if err != nil {
			response.BadRequest(c, "Invalid end_date format, expected YYYY-MM-DD")
			return
		}
		existing.EndDate = &parsed
	}
	if req.DeliveryInstructions != nil {
		existing.DeliveryInstructions = req.DeliveryInstructions
	}
	if len(req.Items) > 0 {
		existing.Items = nil
		for _, item := range req.Items {
			existing.Items = append(existing.Items, entity.SubscriptionItem{
				VariantID: item.VariantID,
				Quantity:  decimal.NewFromFloat(item.Quantity),
			})
		}
	}

	updated, err := h.subscriptionService.Update(c.Request.Context(), existing)
	if err != nil {
		if domainErrors.IsNotFound(err) {
			response.NotFound(c, "Subscription not found")
		} else {
			response.InternalErrorDebug(c, "Failed to update subscription", err)
		}
		return
	}

	response.OK(c, "Subscription updated", mapSubscriptionToResponse(updated))
}

// UpdateStatus godoc
// @Summary      Update subscription status
// @Description  Changes the status of a subscription (active/paused/cancelled)
// @Tags         Subscriptions
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id       path      int                                  true  "Subscription ID"
// @Param        request  body      dto.UpdateSubscriptionStatusRequest  true  "New status"
// @Success      200      {object}  response.Response
// @Failure      404      {object}  response.Response
// @Router       /subscriptions/{id}/status [patch]
func (h *SubscriptionHandler) UpdateStatus(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "Invalid subscription ID")
		return
	}

	var req dto.UpdateSubscriptionStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body: "+err.Error())
		return
	}

	if err := h.subscriptionService.UpdateStatus(c.Request.Context(), id, req.Status); err != nil {
		if domainErrors.IsNotFound(err) {
			response.NotFound(c, "Subscription not found")
		} else {
			response.InternalErrorDebug(c, "Failed to update subscription status", err)
		}
		return
	}

	response.OK(c, "Subscription status updated", nil)
}

// Delete godoc
// @Summary      Delete a subscription
// @Description  Permanently removes a subscription and all its items
// @Tags         Subscriptions
// @Security     BearerAuth
// @Param        id   path  int  true  "Subscription ID"
// @Success      204  "No Content"
// @Failure      404  {object}  response.Response
// @Router       /subscriptions/{id} [delete]
func (h *SubscriptionHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "Invalid subscription ID")
		return
	}

	if err := h.subscriptionService.Delete(c.Request.Context(), id); err != nil {
		if domainErrors.IsNotFound(err) {
			response.NotFound(c, "Subscription not found")
		} else {
			response.InternalErrorDebug(c, "Failed to delete subscription", err)
		}
		return
	}

	response.NoContent(c)
}

// mapSubscriptionToResponse converts a domain entity to a response DTO
func mapSubscriptionToResponse(sub *entity.Subscription) dto.SubscriptionResponse {
	resp := dto.SubscriptionResponse{
		ID:                   sub.ID,
		CustomerID:           sub.CustomerID,
		Status:               string(sub.Status),
		Frequency:            string(sub.Frequency),
		StartDate:            sub.StartDate,
		EndDate:              sub.EndDate,
		DeliveryInstructions: sub.DeliveryInstructions,
		CreatedAt:            sub.CreatedAt,
		UpdatedAt:            sub.UpdatedAt,
	}

	if sub.Customer != nil {
		resp.CustomerName = sub.Customer.Name
	}

	for _, item := range sub.Items {
		itemResp := dto.SubscriptionItemResponse{
			ID:        item.ID,
			VariantID: item.VariantID,
			Quantity:  item.Quantity.InexactFloat64(),
		}
		if item.Variant != nil {
			itemResp.VariantName = item.Variant.Name
			itemResp.FamilyName = item.Variant.FamilyName
			itemResp.Unit = item.Variant.Unit
		}
		resp.Items = append(resp.Items, itemResp)
	}
	if resp.Items == nil {
		resp.Items = []dto.SubscriptionItemResponse{}
	}

	return resp
}

// mapDeliveryToResponse converts a delivery entity to a DTO
func mapDeliveryToResponse(del *entity.SubscriptionDelivery) *dto.SubscriptionDeliveryResponse {
	if del == nil {
		return nil
	}
	return &dto.SubscriptionDeliveryResponse{
		ID:             del.ID,
		SubscriptionID: del.SubscriptionID,
		DeliveryDate:   del.DeliveryDate,
		Status:         string(del.Status),
		Notes:          del.Notes,
		UnitPrice:      del.UnitPrice.InexactFloat64(),
		RecordedBy:     del.RecordedBy,
		RecordedAt:     del.RecordedAt,
	}
}

// RecordDelivery godoc
// @Summary      Record a daily delivery
// @Description  Create or update a delivery log indicating success/failure for a subscription on a specific date
// @Tags         Subscriptions
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id       path      int                            true  "Subscription ID"
// @Param        request  body      dto.RecordDeliveryRequest      true  "Delivery details"
// @Success      200      {object}  response.Response{data=dto.SubscriptionDeliveryResponse}
// @Router       /subscriptions/{id}/deliveries [post]
func (h *SubscriptionHandler) RecordDelivery(c *gin.Context) {
	subID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "Invalid subscription ID")
		return
	}

	var req dto.RecordDeliveryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body: "+err.Error())
		return
	}

	// Ideally we get 'userID' from the auth middleware
	var recordedBy *int64
	userID, exists := c.Get("userID")
	if exists {
		if id, ok := userID.(int64); ok {
			recordedBy = &id
		}
	}

	delivery, err := h.subscriptionService.RecordDelivery(c.Request.Context(), subID, req.Date, req.Status, func() string {
		if req.Notes == nil {
			return ""
		}
		return *req.Notes
	}(), recordedBy)

	if err != nil {
		response.InternalErrorDebug(c, "Failed to record delivery", err)
		return
	}

	response.OK(c, "Delivery recorded", mapDeliveryToResponse(delivery))
}

// GetDailyRoster godoc
// @Summary      Get daily subscriptions roster
// @Description  Returns all active subscriptions mapping to a given date alongside their current delivery log
// @Tags         Subscriptions
// @Produce      json
// @Security     BearerAuth
// @Param        date   query     string  true  "Date YYYY-MM-DD"
// @Success      200    {object}  response.Response{data=[]dto.DailyRosterItemResponse}
// @Router       /subscriptions/roster [get]
func (h *SubscriptionHandler) GetDailyRoster(c *gin.Context) {
	dateStr := c.Query("date")
	if dateStr == "" {
		dateStr = time.Now().Format("2006-01-02")
	}

	roster, err := h.subscriptionService.GetDailyRoster(c.Request.Context(), dateStr)
	if err != nil {
		response.InternalErrorDebug(c, "Failed to fetch daily roster", err)
		return
	}

	var resp []dto.DailyRosterItemResponse
	for _, item := range roster {
		resp = append(resp, dto.DailyRosterItemResponse{
			Subscription: mapSubscriptionToResponse(item.Subscription),
			Delivery:     mapDeliveryToResponse(item.Delivery),
		})
	}

	if resp == nil {
		resp = []dto.DailyRosterItemResponse{}
	}

	response.OK(c, "Daily roster retrieved", resp)
}

// ==========================================
// Invoices & Billing
// ==========================================

func (h *SubscriptionHandler) ListInvoices(c *gin.Context) {
	var filter dto.InvoiceListFilter
	if err := c.ShouldBindQuery(&filter); err != nil {
		response.BadRequest(c, "Invalid query parameters")
		return
	}

	invoices, err := h.subscriptionService.ListInvoices(c.Request.Context(), filter)
	if err != nil {
		response.InternalErrorDebug(c, "Failed to list invoices", err)
		return
	}

	response.OK(c, "Invoices retrieved", invoices)
}

func (h *SubscriptionHandler) GetInvoice(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "Invalid invoice ID")
		return
	}

	inv, err := h.subscriptionService.GetInvoice(c.Request.Context(), id)
	if err != nil {
		if domainErrors.IsNotFound(err) {
			response.NotFound(c, "Invoice not found")
		} else {
			response.InternalErrorDebug(c, "Failed to get invoice", err)
		}
		return
	}

	response.OK(c, "Invoice retrieved", inv)
}

func (h *SubscriptionHandler) GenerateMonthlyInvoice(c *gin.Context) {
	subID, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	monthStr := c.Query("month") // YYYY-MM
	if monthStr == "" {
		response.BadRequest(c, "Month query parameter required (YYYY-MM)")
		return
	}

	t, err := time.Parse("2006-01", monthStr)
	if err != nil {
		response.BadRequest(c, "Invalid month format")
		return
	}

	inv, err := h.subscriptionService.CreateMonthlyInvoice(c.Request.Context(), subID, t.Year(), t.Month())
	if err != nil {
		response.InternalErrorDebug(c, "Failed to generate invoice", err)
		return
	}

	response.Created(c, "Invoice generated", inv)
}

func (h *SubscriptionHandler) FinalizeInvoice(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	if err := h.subscriptionService.FinalizeInvoice(c.Request.Context(), id); err != nil {
		response.InternalErrorDebug(c, "Failed to finalize invoice", err)
		return
	}
	response.OK(c, "Invoice finalized", nil)
}

func (h *SubscriptionHandler) AddAdjustment(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	var req struct {
		Type   string          `json:"type" binding:"required,oneof=credit debit"`
		Amount decimal.Decimal `json:"amount" binding:"required"`
		Reason string          `json:"reason" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	adj := &entity.InvoiceAdjustment{
		InvoiceID: id,
		Type:      req.Type,
		Amount:    req.Amount,
		Reason:    req.Reason,
	}

	if err := h.subscriptionService.AddAdjustment(c.Request.Context(), adj); err != nil {
		response.InternalErrorDebug(c, "Failed to add adjustment", err)
		return
	}

	response.Created(c, "Adjustment added", adj)
}
