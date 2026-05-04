package repository

import (
	"context"

	"github.com/qwikshelf/api/internal/application/dto"
	"github.com/qwikshelf/api/internal/domain/entity"
)

// SubscriptionRepository defines the interface for subscription data access
type SubscriptionRepository interface {
	Create(ctx context.Context, sub *entity.Subscription) error
	GetByID(ctx context.Context, id int64) (*entity.Subscription, error)
	ListFiltered(ctx context.Context, filter dto.SubscriptionListFilter) ([]*entity.Subscription, error)
	ListByCustomer(ctx context.Context, customerID int64) ([]*entity.Subscription, error)
	Update(ctx context.Context, sub *entity.Subscription) error
	UpdateStatus(ctx context.Context, id int64, status string) error
	Delete(ctx context.Context, id int64) error

	// Deliveries
	RecordDelivery(ctx context.Context, delivery *entity.SubscriptionDelivery) error
	GetDeliveries(ctx context.Context, subscriptionID int64) ([]*entity.SubscriptionDelivery, error)
	GetDailyRoster(ctx context.Context, date string) ([]*entity.DailyRosterItem, error)

	// Invoices & Billing
	CreateInvoice(ctx context.Context, inv *entity.SubscriptionInvoice) error
	GetInvoiceByID(ctx context.Context, id int64) (*entity.SubscriptionInvoice, error)
	ListInvoices(ctx context.Context, filter dto.InvoiceListFilter) ([]*entity.SubscriptionInvoice, error)
	UpdateInvoiceStatus(ctx context.Context, id int64, status string) error
	AddAdjustment(ctx context.Context, adj *entity.InvoiceAdjustment) error
}
