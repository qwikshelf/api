package dto

import "time"

type CustomerResponse struct {
	ID               int64     `json:"id"`
	Name             string    `json:"name"`
	Phone            string    `json:"phone"`
	Email            *string   `json:"email,omitempty"`
	Address          *string   `json:"address,omitempty"`
	GSTNumber        *string   `json:"gst_number,omitempty"`
	CreditLimit      float64   `json:"credit_limit"`
	PaymentTerms     string    `json:"payment_terms"`
	CustomerCategory string    `json:"customer_category"`
	DeliveryRoute    *string   `json:"delivery_route,omitempty"`
	InternalNotes    *string   `json:"internal_notes,omitempty"`
	ZoneID           *int64    `json:"zone_id,omitempty"`
	ZoneName         string    `json:"zone_name"`
	Latitude         *float64  `json:"latitude,omitempty"`
	Longitude        *float64  `json:"longitude,omitempty"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}

type CreateCustomerRequest struct {
	Name             string   `json:"name" binding:"required"`
	Phone            string   `json:"phone" binding:"required"`
	Email            *string  `json:"email"`
	Address          *string  `json:"address"`
	GSTNumber        *string  `json:"gst_number"`
	CreditLimit      float64  `json:"credit_limit"`
	PaymentTerms     string   `json:"payment_terms,omitempty"`
	CustomerCategory string   `json:"customer_category,omitempty"`
	DeliveryRoute    *string  `json:"delivery_route"`
	InternalNotes    *string  `json:"internal_notes"`
	ZoneID           *int64   `json:"zone_id"`
	Latitude         *float64 `json:"latitude"`
	Longitude        *float64 `json:"longitude"`
}

type UpdateCustomerRequest struct {
	Name             string   `json:"name"`
	Phone            string   `json:"phone"`
	Email            *string  `json:"email"`
	Address          *string  `json:"address"`
	GSTNumber        *string  `json:"gst_number"`
	CreditLimit      *float64 `json:"credit_limit"`
	PaymentTerms     string   `json:"payment_terms"`
	CustomerCategory string   `json:"customer_category"`
	DeliveryRoute    *string  `json:"delivery_route"`
	InternalNotes    *string  `json:"internal_notes"`
	ZoneID           *int64   `json:"zone_id"`
	Latitude         *float64 `json:"latitude"`
	Longitude        *float64 `json:"longitude"`
}

type BulkImportError struct {
	Row     int    `json:"row"`
	Message string `json:"message"`
}

type BulkImportResponse struct {
	Total       int               `json:"total"`
	Success     int               `json:"success"`
	Failed      int               `json:"failed"`
	Errors      []BulkImportError `json:"errors,omitempty"`
}
