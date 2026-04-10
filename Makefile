# ==============================================================================
# QwikShelf API - Consolidated Makefile
# ==============================================================================

# Variables
-include .env

APP_NAME := qwikshelf-api
BUILD_DIR := ./bin
MAIN_PATH := ./cmd/server
MIGRATE_PATH := migrations
DEPLOY_DIR := deploy
COMPOSE_FILE := $(DEPLOY_DIR)/docker-compose.yml
PROJECT_NAME := qwikshelf-ws

# Database URL construction for migrations (Legacy for direct psql access)
DATABASE_URL := postgres://$(DB_USER):$(DB_PASSWORD)@$(DB_HOST):$(DB_PORT)/$(DB_NAME)?sslmode=$(DB_SSL_MODE)

# Migration Environment
MIGRATE_ENV ?= $(APP_ENV)
ifeq ($(MIGRATE_ENV),)
	MIGRATE_ENV := development
endif

# Default target
.PHONY: help
help:
	@echo "QwikShelf API - Available Commands:"
	@echo ""
	@echo "Local Development:"
	@echo "  make build          - Build the application binary"
	@echo "  make run            - Build and run the application"
	@echo "  make dev            - Run with hot reload (requires air)"
	@echo "  make fmt            - Format code and tidy modules"
	@echo "  make lint           - Run linter"
	@echo "  make swagger        - Generate Swagger documentation"
	@echo "  make tools          - Install development tools (air, swag, migrate, etc.)"
	@echo ""
	@echo "Testing:"
	@echo "  make test           - Run all tests"
	@echo "  make test-cover     - Run tests with coverage report"
	@echo ""
	@echo "Database & Migrations:"
	@echo "  make migrate-up     - Run database migrations"
	@echo "  make migrate-down   - Rollback last migration"
	@echo "  make migrate-create NAME=xyz - Create a new migration file"
	@echo ""
	@echo "Docker & Deployment:"
	@echo "  make docker-build   - Build all Docker containers"
	@echo "  make up             - Start containers in background (alias: start)"
	@echo "  make down           - Stop and remove containers (alias: stop)"
	@echo "  make logs           - View live logs from containers"
	@echo "  make ps             - List running containers"
	@echo "  make shell-api      - Open shell in API container"
	@echo "  make shell-db       - Open shell in DB container"
	@echo "  make deploy         - Deploy to EC2 (runs deploy.sh)"
	@echo "  make clean          - Stop containers and remove volumes (WARNING: Data loss)"

# --- Local Development ---

.PHONY: build run dev fmt lint swagger tools

build:
	@echo "Building $(APP_NAME)..."
	@mkdir -p $(BUILD_DIR)
	@go build -o $(BUILD_DIR)/$(APP_NAME) $(MAIN_PATH)
	@echo "Build complete: $(BUILD_DIR)/$(APP_NAME)"

run: build
	@$(BUILD_DIR)/$(APP_NAME)

dev:
	@air -c .air.toml

fmt:
	@go fmt ./...
	@go mod tidy
	@echo "Formatting and module tidy complete"

lint:
	@golangci-lint run ./...

swagger:
	@swag init -g cmd/server/main.go --parseDependency --parseInternal
	@echo "Swagger docs generated at docs/"

tools:
	@echo "Installing development tools..."
	@go install github.com/air-verse/air@latest
	@go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest
	go install golang.org/x/tools/cmd/goimports@latest
	@go install github.com/rubenv/sql-migrate/...@latest
	@go install github.com/swaggo/swag/cmd/swag@latest
	@echo "Tools installed successfully"

# --- Testing ---

.PHONY: test test-cover

test:
	@go test ./... -v

test-cover:
	@go test ./... -v -coverprofile=coverage.out
	@go tool cover -html=coverage.out -o coverage.html
	@echo "Coverage report generated: coverage.html"

# --- Database & Migrations ---

migrate-up:
	@sql-migrate up -env=$(MIGRATE_ENV)

migrate-down:
	@sql-migrate down -env=$(MIGRATE_ENV) -limit=1

migrate-create:
	@sql-migrate new -env=$(MIGRATE_ENV) $(NAME)
	@echo "Created migration: migrations/*_$(NAME).sql"

docker-migrate-up:
	@echo "Running migrations inside the container..."
	docker-compose -f $(COMPOSE_FILE) -p $(PROJECT_NAME) exec -T api sql-migrate up -env=$(MIGRATE_ENV)

migrate-status: build
	@$(BUILD_DIR)/$(APP_NAME) --migrate-status

.PHONY: docker-build up down start stop logs ps shell-api shell-db deploy clean

docker-build:
	@echo "Building Docker containers..."
	docker-compose -f $(COMPOSE_FILE) -p $(PROJECT_NAME) build

up:
	@echo "Starting containers..."
	docker-compose -f $(COMPOSE_FILE) -p $(PROJECT_NAME) up -d --build

start: up

down:
	@echo "Stopping containers..."
	docker-compose -f $(COMPOSE_FILE) -p $(PROJECT_NAME) down

stop: down

logs:
	docker-compose -f $(COMPOSE_FILE) -p $(PROJECT_NAME) logs -f

ps:
	docker-compose -f $(COMPOSE_FILE) -p $(PROJECT_NAME) ps

shell-api:
	docker-compose -f $(COMPOSE_FILE) -p $(PROJECT_NAME) exec api sh

shell-db:
	docker-compose -f $(COMPOSE_FILE) -p $(PROJECT_NAME) exec db bash

deploy:
	@chmod +x deploy.sh
	./deploy.sh

clean:
	@echo "Stopping and removing containers, networks, and volumes..."
	docker-compose -f $(COMPOSE_FILE) -p $(PROJECT_NAME) down -v
	@rm -rf $(BUILD_DIR)
	@echo "Clean complete"
