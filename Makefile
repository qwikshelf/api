# Makefile for QwikShelf Deployment

# Variables
DEPLOY_DIR := deploy
COMPOSE_FILE := $(DEPLOY_DIR)/docker-compose.yml
PROJECT_NAME := qwikshelf-ws

.PHONY: help build up down logs ps shell-api shell-db clean

help:
	@echo "Usage:"
	@echo "  make build      Build all containers"
	@echo "  make up         Start all containers in background (alias: start)"
	@echo "  make down       Stop and remove containers (alias: stop)"
	@echo "  make logs       View logs from all containers"
	@echo "  make ps         List running containers"
	@echo "  make shell-api  Open shell in API container"
	@echo "  make shell-db   Open shell in DB container"
	@echo "  make clean      Stop containers and remove volumes (WARNING: Data loss)"
	@echo "  make deploy     Deploy to EC2 (Requires EC2_IP and optionally SSH_KEY_PATH)"

deploy:
	@chmod +x deploy.sh
	./deploy.sh

start: up
stop: down

build:
	@echo "Building containers..."
	docker-compose -f $(COMPOSE_FILE) -p $(PROJECT_NAME) build

up:
	@echo "Starting containers..."
	docker-compose -f $(COMPOSE_FILE) -p $(PROJECT_NAME) up -d

down:
	@echo "Stopping containers..."
	docker-compose -f $(COMPOSE_FILE) -p $(PROJECT_NAME) down

logs:
	docker-compose -f $(COMPOSE_FILE) -p $(PROJECT_NAME) logs -f

ps:
	docker-compose -f $(COMPOSE_FILE) -p $(PROJECT_NAME) ps

shell-api:
	docker-compose -f $(COMPOSE_FILE) -p $(PROJECT_NAME) exec api sh

shell-db:
	docker-compose -f $(COMPOSE_FILE) -p $(PROJECT_NAME) exec db bash

clean:
	@echo "Stopping and removing containers, networks, and volumes..."
	docker-compose -f $(COMPOSE_FILE) -p $(PROJECT_NAME) down -v
