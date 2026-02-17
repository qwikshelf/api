.PHONY: help build run test clean migrate-up migrate-down docker-up docker-down lint fmt

# Variables
APP_NAME := qwikshelf-api
BUILD_DIR := ./bin
MAIN_PATH := ./cmd/server
MIGRATE_PATH := ./migrations

# Default target
help:
	@echo "QwikShelf API - Available Commands:"
	@echo ""
	@echo "  make build        - Build the application"
	@echo "  make run          - Run the application"
	@echo "  make dev          - Run with hot reload (requires air)"
	@echo "  make test         - Run tests"
	@echo "  make test-cover   - Run tests with coverage"
	@echo "  make lint         - Run linter"
	@echo "  make fmt          - Format code"
	@echo "  make clean        - Clean build artifacts"
	@echo ""
	@echo "  make docker-up    - Start Docker containers"
	@echo "  make docker-down  - Stop Docker containers"
	@echo "  make docker-build - Build Docker image"
	@echo ""
	@echo "  make migrate-up   - Run database migrations"
	@echo "  make migrate-down - Rollback last migration"
	@echo "  make migrate-create NAME=xyz - Create new migration"

# Build
build:
	@echo "Building $(APP_NAME)..."
	@mkdir -p $(BUILD_DIR)
	@go build -o $(BUILD_DIR)/$(APP_NAME) $(MAIN_PATH)
	@echo "Build complete: $(BUILD_DIR)/$(APP_NAME)"

# Run
run: build
	@$(BUILD_DIR)/$(APP_NAME)

dev:
	@air -c .air.toml

# Testing
test:
	@go test ./... -v

test-cover:
	@go test ./... -v -coverprofile=coverage.out
	@go tool cover -html=coverage.out -o coverage.html
	@echo "Coverage report: coverage.html"

test-integration:
	@go test ./... -v -tags=integration

# Code quality
lint:
	@golangci-lint run ./...

fmt:
	@go fmt ./...
	@goimports -w .

# Cleanup
clean:
	@rm -rf $(BUILD_DIR)
	@rm -f coverage.out coverage.html
	@echo "Cleaned build artifacts"

# Docker
docker-up:
	@docker-compose -f docker/docker-compose.yml up -d --build
	@echo "Docker containers started (API on :8080, Adminer on :8081)"

docker-down:
	@docker-compose -f docker/docker-compose.yml down
	@echo "Docker containers stopped"

docker-rebuild:
	@docker-compose -f docker/docker-compose.yml up -d --build --force-recreate
	@echo "Docker containers rebuilt and started"

docker-clean:
	@docker-compose -f docker/docker-compose.yml down -v --rmi local
	@echo "Docker containers, volumes, and images removed"

docker-build:
	@docker build -f docker/Dockerfile -t $(APP_NAME) .

docker-logs:
	@docker-compose -f docker/docker-compose.yml logs -f

docker-logs-api:
	@docker-compose -f docker/docker-compose.yml logs -f api
# Swagger
swagger:
	@swag init -g cmd/server/main.go --parseDependency --parseInternal
	@echo "Swagger docs generated at docs/"

# Database migrations (requires golang-migrate)
migrate-up:
	@migrate -path $(MIGRATE_PATH) -database "$(DATABASE_URL)" up

migrate-down:
	@migrate -path $(MIGRATE_PATH) -database "$(DATABASE_URL)" down 1

migrate-create:
	@migrate create -ext sql -dir $(MIGRATE_PATH) -seq $(NAME)
	@echo "Created migration: $(NAME)"

migrate-force:
	@migrate -path $(MIGRATE_PATH) -database "$(DATABASE_URL)" force $(VERSION)

# Dependencies
deps:
	@go mod download
	@go mod tidy

# Install dev tools
tools:
	@go install github.com/air-verse/air@latest
	@go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest
	@go install golang.org/x/tools/cmd/goimports@latest
	@go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest
	@go install github.com/swaggo/swag/cmd/swag@latest
	@echo "Development tools installed"
