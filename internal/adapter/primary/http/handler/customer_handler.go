package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/qwikshelf/api/internal/application/dto"
	"github.com/qwikshelf/api/internal/application/service"
	"github.com/qwikshelf/api/internal/domain/entity"
	domainErrors "github.com/qwikshelf/api/internal/domain/errors"
	"github.com/qwikshelf/api/pkg/response"
)

type CustomerHandler struct {
	customerService *service.CustomerService
}

func NewCustomerHandler(customerService *service.CustomerService) *CustomerHandler {
	return &CustomerHandler{customerService: customerService}
}

// @Summary      List customers
// @Description  Returns a paginated list of customers
// @Tags         Customers
// @Produce      json
// @Security     BearerAuth
// @Param        page      query  int  false  "Page number"    default(1)
// @Param        per_page  query  int  false  "Items per page" default(20)
// @Success      200  {object}  response.Response{data=[]dto.CustomerResponse}
// @Router       /customers [get]
func (h *CustomerHandler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "20"))
	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 100 {
		perPage = 20
	}
	offset := (page - 1) * perPage

	customers, total, err := h.customerService.List(c.Request.Context(), offset, perPage)
	if err != nil {
		response.InternalErrorDebug(c, "Failed to fetch customers", err)
		return
	}

	var resp []dto.CustomerResponse
	for _, cu := range customers {
		resp = append(resp, mapCustomerToResponse(cu))
	}

	totalPages := int(total) / perPage
	if int(total)%perPage > 0 {
		totalPages++
	}

	response.SuccessWithMeta(c, 200, "Customers retrieved", resp, &response.Meta{Page: page, PerPage: perPage, Total: total, TotalPages: totalPages})
}

// @Summary      Create customer
// @Description  Creates a new customer
// @Tags         Customers
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        request  body      dto.CreateCustomerRequest  true  "Customer details"
// @Success      201      {object}  response.Response{data=dto.CustomerResponse}
// @Failure      400      {object}  response.Response
// @Router       /customers [post]
func (h *CustomerHandler) Create(c *gin.Context) {
	var req dto.CreateCustomerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body")
		return
	}

	customer := &entity.Customer{
		Name:             req.Name,
		Phone:            req.Phone,
		Email:            req.Email,
		Address:          req.Address,
		GSTNumber:        req.GSTNumber,
		CreditLimit:      req.CreditLimit,
		PaymentTerms:     req.PaymentTerms,
		CustomerCategory: req.CustomerCategory,
		DeliveryRoute:    req.DeliveryRoute,
		InternalNotes:    req.InternalNotes,
		ZoneID:           req.ZoneID,
		Latitude:         req.Latitude,
		Longitude:        req.Longitude,
	}

	if customer.PaymentTerms == "" {
		customer.PaymentTerms = "cash"
	}
	if customer.CustomerCategory == "" {
		customer.CustomerCategory = "retail"
	}

	created, err := h.customerService.Create(c.Request.Context(), customer)
	if err != nil {
		if err == domainErrors.ErrInvalidInput {
			response.BadRequest(c, "Phone number already exists or invalid input")
		} else {
			response.InternalErrorDebug(c, "Failed to create customer", err)
		}
		return
	}

	response.Created(c, "Customer created", mapCustomerToResponse(created))
}

// @Summary      Bulk create customers
// @Description  Creates a batch of new customers, handles partial success natively
// @Tags         Customers
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        request  body      []dto.CreateCustomerRequest  true  "Array of Customer details"
// @Success      201      {object}  response.Response{data=dto.BulkImportResponse}
// @Router       /customers/bulk [post]
func (h *CustomerHandler) CreateBulk(c *gin.Context) {
	var reqs []dto.CreateCustomerRequest
	if err := c.ShouldBindJSON(&reqs); err != nil {
		response.BadRequest(c, "Invalid request body array")
		return
	}

	var entities []entity.Customer
	for _, req := range reqs {
		customer := entity.Customer{
			Name:             req.Name,
			Phone:            req.Phone,
			Email:            req.Email,
			Address:          req.Address,
			GSTNumber:        req.GSTNumber,
			CreditLimit:      req.CreditLimit,
			PaymentTerms:     req.PaymentTerms,
			CustomerCategory: req.CustomerCategory,
			DeliveryRoute:    req.DeliveryRoute,
			InternalNotes:    req.InternalNotes,
			ZoneID:           req.ZoneID,
			Latitude:         req.Latitude,
			Longitude:        req.Longitude,
		}
		if customer.PaymentTerms == "" {
			customer.PaymentTerms = "cash"
		}
		if customer.CustomerCategory == "" {
			customer.CustomerCategory = "retail"
		}
		entities = append(entities, customer)
	}

	resp := h.customerService.CreateBulk(c.Request.Context(), entities)
	response.Created(c, "Bulk process completed", resp)
}

// @Summary      Get customer
// @Description  Returns a single customer by ID
// @Tags         Customers
// @Produce      json
// @Security     BearerAuth
// @Param        id   path      int  true  "Customer ID"
// @Success      200  {object}  response.Response{data=dto.CustomerResponse}
// @Failure      404  {object}  response.Response
// @Router       /customers/{id} [get]
func (h *CustomerHandler) Get(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "Invalid customer ID")
		return
	}

	customer, err := h.customerService.GetByID(c.Request.Context(), id)
	if err != nil {
		response.NotFound(c, "Customer not found")
		return
	}

	response.OK(c, "Customer retrieved", mapCustomerToResponse(customer))
}

// @Summary      Update customer
// @Description  Updates an existing customer
// @Tags         Customers
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id       path      int                        true  "Customer ID"
// @Param        request  body      dto.UpdateCustomerRequest  true  "Updated details"
// @Success      200      {object}  response.Response{data=dto.CustomerResponse}
// @Failure      404      {object}  response.Response
// @Router       /customers/{id} [put]
func (h *CustomerHandler) Update(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "Invalid customer ID")
		return
	}

	var req dto.UpdateCustomerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request body")
		return
	}

	// Fetch existing
	customer, err := h.customerService.GetByID(c.Request.Context(), id)
	if err != nil {
		response.NotFound(c, "Customer not found")
		return
	}

	// Update fields selectively
	if req.Name != "" {
		customer.Name = req.Name
	}
	if req.Phone != "" {
		customer.Phone = req.Phone
	}
	if req.Email != nil {
		customer.Email = req.Email
	}
	if req.Address != nil {
		customer.Address = req.Address
	}
	if req.GSTNumber != nil {
		customer.GSTNumber = req.GSTNumber
	}
	if req.CreditLimit != nil {
		customer.CreditLimit = *req.CreditLimit
	}
	if req.PaymentTerms != "" {
		customer.PaymentTerms = req.PaymentTerms
	}
	if req.CustomerCategory != "" {
		customer.CustomerCategory = req.CustomerCategory
	}
	if req.DeliveryRoute != nil {
		customer.DeliveryRoute = req.DeliveryRoute
	}
	if req.InternalNotes != nil {
		customer.InternalNotes = req.InternalNotes
	}
	if req.ZoneID != nil {
		customer.ZoneID = req.ZoneID
	}
	if req.Latitude != nil {
		customer.Latitude = req.Latitude
	}
	if req.Longitude != nil {
		customer.Longitude = req.Longitude
	}

	updated, err := h.customerService.Update(c.Request.Context(), customer)
	if err != nil {
		if err == domainErrors.ErrInvalidInput {
			response.BadRequest(c, "Invalid input or phone already exists")
		} else {
			response.InternalErrorDebug(c, "Failed to update customer", err)
		}
		return
	}

	response.OK(c, "Customer updated", mapCustomerToResponse(updated))
}

// @Summary      Delete customer
// @Description  Deletes a customer by ID
// @Tags         Customers
// @Security     BearerAuth
// @Param        id   path  int  true  "Customer ID"
// @Success      204  "No Content"
// @Failure      404  {object}  response.Response
// @Router       /customers/{id} [delete]
func (h *CustomerHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "Invalid customer ID")
		return
	}

	if err := h.customerService.Delete(c.Request.Context(), id); err != nil {
		if err == domainErrors.ErrCustomerNotFound {
			response.NotFound(c, "Customer not found")
		} else {
			response.InternalErrorDebug(c, "Failed to delete customer", err)
		}
		return
	}

	response.NoContent(c)
}

func mapCustomerToResponse(c *entity.Customer) dto.CustomerResponse {
	return dto.CustomerResponse{
		ID:               c.ID,
		Name:             c.Name,
		Phone:            c.Phone,
		Email:            c.Email,
		Address:          c.Address,
		GSTNumber:        c.GSTNumber,
		CreditLimit:      c.CreditLimit,
		PaymentTerms:     c.PaymentTerms,
		CustomerCategory: c.CustomerCategory,
		DeliveryRoute:    c.DeliveryRoute,
		InternalNotes:    c.InternalNotes,
		ZoneID:           c.ZoneID,
		ZoneName:         c.ZoneName,
		Latitude:         c.Latitude,
		Longitude:        c.Longitude,
		CreatedAt:        c.CreatedAt,
		UpdatedAt:        c.UpdatedAt,
	}
}
