#!/bin/bash

# server-deploy.sh
# This script is intended to run on the EC2 instance.

set -e

echo "🚀 Starting deployment on server..."

# Navigate to project root
# Assuming the script is in scripts/ relative to project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "📥 Pulling latest changes from main..."
git fetch origin main
git reset --hard origin main

echo "🏗️ Building and restarting containers..."
# Use the Makefile for consistency. This now automatically rebuilding images.
make up

echo "🔄 Running database migrations inside container..."
make docker-migrate-up

echo "✅ Deployment successful!"
docker ps
