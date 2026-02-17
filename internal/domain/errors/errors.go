package errors

import "errors"

// Domain errors
var (
	// General errors
	ErrNotFound      = errors.New("resource not found")
	ErrAlreadyExists = errors.New("resource already exists")
	ErrInvalidInput  = errors.New("invalid input")
	ErrUnauthorized  = errors.New("unauthorized")
	ErrForbidden     = errors.New("forbidden")

	// Authentication errors
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrUserInactive       = errors.New("user account is inactive")
	ErrTokenExpired       = errors.New("token has expired")
	ErrInvalidToken       = errors.New("invalid token")

	// User errors
	ErrUserNotFound       = errors.New("user not found")
	ErrUsernameExists     = errors.New("username already exists")
	ErrRoleNotFound       = errors.New("role not found")
	ErrPermissionNotFound = errors.New("permission not found")

	// Product errors
	ErrCategoryNotFound       = errors.New("category not found")
	ErrProductFamilyNotFound  = errors.New("product family not found")
	ErrProductVariantNotFound = errors.New("product variant not found")
	ErrSKUExists              = errors.New("SKU already exists")
	ErrBarcodeExists          = errors.New("barcode already exists")

	// Warehouse errors
	ErrWarehouseNotFound = errors.New("warehouse not found")

	// Supplier errors
	ErrSupplierNotFound = errors.New("supplier not found")

	// Inventory errors
	ErrInsufficientStock = errors.New("insufficient stock")
	ErrInvalidQuantity   = errors.New("invalid quantity")
	ErrTransferNotFound  = errors.New("transfer not found")
	ErrSameWarehouse     = errors.New("source and destination warehouse cannot be the same")

	// Procurement errors
	ErrProcurementNotFound = errors.New("procurement not found")

	// Production errors
	ErrProductionRunNotFound = errors.New("production run not found")
)

// IsNotFound checks if the error is a not found error
func IsNotFound(err error) bool {
	return errors.Is(err, ErrNotFound) ||
		errors.Is(err, ErrUserNotFound) ||
		errors.Is(err, ErrRoleNotFound) ||
		errors.Is(err, ErrPermissionNotFound) ||
		errors.Is(err, ErrCategoryNotFound) ||
		errors.Is(err, ErrProductFamilyNotFound) ||
		errors.Is(err, ErrProductVariantNotFound) ||
		errors.Is(err, ErrWarehouseNotFound) ||
		errors.Is(err, ErrSupplierNotFound) ||
		errors.Is(err, ErrTransferNotFound) ||
		errors.Is(err, ErrProcurementNotFound) ||
		errors.Is(err, ErrProductionRunNotFound)
}

// IsConflict checks if the error is a conflict error
func IsConflict(err error) bool {
	return errors.Is(err, ErrAlreadyExists) ||
		errors.Is(err, ErrUsernameExists) ||
		errors.Is(err, ErrSKUExists) ||
		errors.Is(err, ErrBarcodeExists)
}
