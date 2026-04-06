package entity

import "time"

// ExpenseCategory represents a category for business expenses
type ExpenseCategory struct {
	ID          int64  `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description,omitempty"`
}

// Expense represents a recorded business expense
type Expense struct {
	ID                int64     `json:"id"`
	CategoryID        int64     `json:"category_id"`
	CategoryName      string    `json:"category_name,omitempty"`
	Amount            float64   `json:"amount"`
	Description       string    `json:"description,omitempty"`
	Date              time.Time `json:"date"`
	RecordedByUserID  int64     `json:"recorded_by_user_id"`
	RecordedByUsername string   `json:"recorded_by_username,omitempty"`
	WarehouseID       *int64    `json:"warehouse_id,omitempty"`
	WarehouseName     string    `json:"warehouse_name,omitempty"`
	AttachmentURL     string    `json:"attachment_url,omitempty"`
	CreatedAt         time.Time `json:"created_at"`
}
