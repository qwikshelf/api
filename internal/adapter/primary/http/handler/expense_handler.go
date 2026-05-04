package handler

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/qwikshelf/api/internal/application/service"
	"github.com/qwikshelf/api/internal/domain/entity"
	"github.com/qwikshelf/api/internal/domain/repository"
)

// ExpenseHandler handles API requests for expenses
type ExpenseHandler struct {
	service *service.ExpenseService
}

// NewExpenseHandler creates a new expense handler
func NewExpenseHandler(service *service.AuditService, expenseService *service.ExpenseService) *ExpenseHandler {
	return &ExpenseHandler{
		service: expenseService,
	}
}

// --- Categories ---

func (h *ExpenseHandler) CreateCategory(c *gin.Context) {
	var req struct {
		Name        string `json:"name" binding:"required"`
		Description string `json:"description"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	category := &entity.ExpenseCategory{
		Name:        req.Name,
		Description: req.Description,
	}

	if err := h.service.CreateCategory(c.Request.Context(), category); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, category)
}

func (h *ExpenseHandler) ListCategories(c *gin.Context) {
	categories, err := h.service.ListCategories(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, categories)
}

func (h *ExpenseHandler) UpdateCategory(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	var req struct {
		Name        string `json:"name" binding:"required"`
		Description string `json:"description"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	category := &entity.ExpenseCategory{
		ID:          id,
		Name:        req.Name,
		Description: req.Description,
	}

	if err := h.service.UpdateCategory(c.Request.Context(), category); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, category)
}

func (h *ExpenseHandler) DeleteCategory(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	if err := h.service.DeleteCategory(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusNoContent, nil)
}

// --- Expenses ---

func (h *ExpenseHandler) CreateExpense(c *gin.Context) {
	var req struct {
		CategoryID    int64     `json:"category_id" binding:"required"`
		Amount        float64   `json:"amount" binding:"required"`
		Description   string    `json:"description"`
		Date          time.Time `json:"date"`
		WarehouseID   *int64    `json:"warehouse_id"`
		AttachmentURL string    `json:"attachment_url"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get recorder from context (set by Auth middleware)
	userID := c.GetInt64("user_id")

	expense := &entity.Expense{
		CategoryID:       req.CategoryID,
		Amount:           req.Amount,
		Description:      req.Description,
		Date:             req.Date,
		RecordedByUserID: userID,
		WarehouseID:      req.WarehouseID,
		AttachmentURL:    req.AttachmentURL,
	}

	if err := h.service.CreateExpense(c.Request.Context(), expense); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, expense)
}

func (h *ExpenseHandler) ListExpenses(c *gin.Context) {
	filter := repository.ExpenseFilter{
		Limit:  10,
		Offset: 0,
	}

	if limit, err := strconv.Atoi(c.DefaultQuery("limit", "10")); err == nil {
		filter.Limit = limit
	}
	if offset, err := strconv.Atoi(c.DefaultQuery("offset", "0")); err == nil {
		filter.Offset = offset
	}
	if cid, err := strconv.ParseInt(c.Query("category_id"), 10, 64); err == nil {
		filter.CategoryID = &cid
	}
	if wid, err := strconv.ParseInt(c.Query("warehouse_id"), 10, 64); err == nil {
		filter.WarehouseID = &wid
	}
	if uid, err := strconv.ParseInt(c.Query("user_id"), 10, 64); err == nil {
		filter.UserID = &uid
	}
	if start, err := time.Parse("2006-01-02", c.Query("start_date")); err == nil {
		filter.StartDate = &start
	}
	if end, err := time.Parse("2006-01-02", c.Query("end_date")); err == nil {
		filter.EndDate = &end
	}

	expenses, total, err := h.service.ListExpenses(c.Request.Context(), filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":  expenses,
		"total": total,
	})
}

func (h *ExpenseHandler) DeleteExpense(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	if err := h.service.DeleteExpense(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusNoContent, nil)
}
