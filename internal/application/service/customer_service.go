package service

import (
	"context"

	"github.com/qwikshelf/api/internal/adapter/secondary/postgres"
	"github.com/qwikshelf/api/internal/domain/entity"
)

type CustomerService struct {
	customerRepo postgres.CustomerRepository
}

func NewCustomerService(customerRepo *postgres.CustomerRepository) *CustomerService {
	return &CustomerService{
		customerRepo: *customerRepo,
	}
}

func (s *CustomerService) Create(ctx context.Context, req *entity.Customer) (*entity.Customer, error) {
	err := s.customerRepo.Create(ctx, req)
	if err != nil {
		return nil, err
	}
	return req, nil
}

func (s *CustomerService) Update(ctx context.Context, req *entity.Customer) (*entity.Customer, error) {
	err := s.customerRepo.Update(ctx, req)
	if err != nil {
		return nil, err
	}
	return s.customerRepo.GetByID(ctx, req.ID)
}

func (s *CustomerService) GetByID(ctx context.Context, id int64) (*entity.Customer, error) {
	return s.customerRepo.GetByID(ctx, id)
}

func (s *CustomerService) List(ctx context.Context, offset, limit int) ([]*entity.Customer, int64, error) {
	return s.customerRepo.List(ctx, offset, limit)
}

func (s *CustomerService) Delete(ctx context.Context, id int64) error {
	return s.customerRepo.Delete(ctx, id)
}
