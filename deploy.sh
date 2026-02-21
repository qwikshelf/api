#!/bin/bash

# deploy.sh
# This script triggers a deployment on the remote EC2 instance.

set -e

# Configuration
SSH_USER=${SSH_USER:-ubuntu}
SSH_HOST=${EC2_IP}
SSH_KEY=${SSH_KEY_PATH}

if [ -z "$SSH_HOST" ]; then
    echo "❌ Error: EC2_IP environment variable is not set."
    echo "Usage: EC2_IP=x.x.x.x SSH_KEY_PATH=./key.pem ./deploy.sh"
    exit 1
fi

if [ -z "$SSH_KEY" ]; then
    echo "⚠️ Warning: SSH_KEY_PATH is not set. Assuming SSH agent or default key."
    SSH_CMD="ssh $SSH_USER@$SSH_HOST"
else
    SSH_CMD="ssh -i $SSH_KEY $SSH_USER@$SSH_HOST"
fi

echo "🔌 Connecting to $SSH_HOST..."

# Commands to run on the server
REMOTE_CMD="cd qwikshelf-ws/api && chmod +x scripts/server-deploy.sh && ./scripts/server-deploy.sh"

$SSH_CMD "$REMOTE_CMD"

echo "🎉 Deployment finished!"
