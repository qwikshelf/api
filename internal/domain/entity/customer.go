package entity

import "time"

type Customer struct {
	ID               int64     `json:"id" db:"id"`
	Name             string    `json:"name" db:"name"`
	Phone            string    `json:"phone" db:"phone"`
	Email            *string   `json:"email" db:"email"`
	Address          *string   `json:"address" db:"address"`
	GSTNumber        *string   `json:"gst_number" db:"gst_number"`
	CreditLimit      float64   `json:"credit_limit" db:"credit_limit"`
	PaymentTerms     string    `json:"payment_terms" db:"payment_terms"`         // cash, net_15, pre_paid
	CustomerCategory string    `json:"customer_category" db:"customer_category"` // retail, wholesale, b2b
	DeliveryRoute    *string   `json:"delivery_route" db:"delivery_route"`
	InternalNotes    *string   `json:"internal_notes" db:"internal_notes"`
	ZoneID           *int64    `json:"zone_id" db:"zone_id"`
	ZoneName         string    `json:"zone_name"` // populated via join
	Latitude         *float64  `json:"latitude" db:"latitude"`
	Longitude        *float64  `json:"longitude" db:"longitude"`
	CreatedAt        time.Time `json:"created_at" db:"created_at"`
	UpdatedAt        time.Time `json:"updated_at" db:"updated_at"`
}
