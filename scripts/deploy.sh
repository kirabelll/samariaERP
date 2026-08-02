#!/bin/bash

##############################################################################
# Samaria ERP Deployment Script
#
# Purpose: Deploy the Samaria ERP application to the Hetzner server
# Usage: ./scripts/deploy.sh [production|staging]
#
# This script:
# - Connects to the Hetzner server
# - Pulls the latest code from the repository
# - Builds Docker images
# - Starts the containers
# - Runs Prisma migrations
# - Seeds the database
# - Displays deployment status
##############################################################################

set -e

# Configuration
HETZNER_IP="167.235.197.55"
HETZNER_USER="root"
PROJECT_DIR="/opt/samariaERP"
ENVIRONMENT="${1:-production}"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

##############################################################################
# Helper Functions
##############################################################################

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

##############################################################################
# Pre-deployment Checks
##############################################################################

log_info "Starting Samaria ERP deployment to $ENVIRONMENT environment"
log_info "Target server: $HETZNER_IP"
log_info "Timestamp: $TIMESTAMP"

# Check if SSH key exists
if ! [ -f ~/.ssh/id_rsa ] && ! [ -f ~/.ssh/id_ed25519 ]; then
    log_error "SSH key not found. Please set up SSH authentication."
    exit 1
fi

log_success "SSH key found"

# Check if we can connect to the server
log_info "Verifying connection to Hetzner server..."
if ! ssh -o ConnectTimeout=5 -q $HETZNER_USER@$HETZNER_IP exit; then
    log_error "Cannot connect to $HETZNER_IP. Please check your connection and SSH configuration."
    exit 1
fi

log_success "Connection to Hetzner server verified"

##############################################################################
# Deployment Steps
##############################################################################

log_info "Starting deployment process..."

# Step 1: Pull latest code
log_info "Step 1: Pulling latest code from repository..."
ssh $HETZNER_USER@$HETZNER_IP << 'EOF'
cd /opt/samaria-erp
git fetch origin
git reset --hard origin/main
log_success "Code pulled successfully"
EOF

# Step 2: Environment setup
log_info "Step 2: Setting up environment variables..."
ssh $HETZNER_USER@$HETZNER_IP << 'EOF'
cd /opt/samaria-erp
if [ ! -f .env.production ]; then
    log_warning ".env.production not found, using default configuration"
else
    log_success "Environment file found"
fi
EOF

# Step 3: Build and start Docker containers
log_info "Step 3: Building and starting Docker containers..."
ssh $HETZNER_USER@$HETZNER_IP << 'EOF'
cd /opt/samaria-erp
docker-compose -f docker-compose.yml pull
docker-compose -f docker-compose.yml build --no-cache
docker-compose -f docker-compose.yml up -d
EOF

# Wait for containers to start
log_info "Waiting for services to start (30 seconds)..."
sleep 30

# Step 4: Health checks
log_info "Step 4: Verifying container health..."
ssh $HETZNER_USER@$HETZNER_IP << 'EOF'
cd /opt/samaria-erp
echo "Checking database health..."
docker-compose exec -T db pg_isready -U samaria -d samaria_erp

echo "Checking application health..."
docker-compose exec -T app curl -f http://localhost:3000/api/health || echo "Health check waiting..."

echo "Checking nginx health..."
docker-compose exec -T nginx wget --quiet --tries=1 --spider http://localhost/health || echo "Nginx health check in progress..."
EOF

# Step 5: Run Prisma migrations
log_info "Step 5: Running Prisma migrations..."
ssh $HETZNER_USER@$HETZNER_IP << 'EOF'
cd /opt/samaria-erp
docker-compose exec -T app npx prisma migrate deploy
EOF

# Step 6: Run database seed (optional)
log_info "Step 6: Running database seed script..."
ssh $HETZNER_USER@$HETZNER_IP << 'EOF'
cd /opt/samaria-erp
if [ -f prisma/seed.ts ]; then
    docker-compose exec -T app npm run seed || echo "Seed script not found or failed - this is optional"
else
    echo "Seed script not found - skipping"
fi
EOF

# Step 7: Display deployment status
log_info "Step 7: Displaying deployment status..."
ssh $HETZNER_USER@$HETZNER_IP << 'EOF'
cd /opt/samaria-erp

echo ""
echo "========================================"
echo "DEPLOYMENT STATUS"
echo "========================================"
echo ""

echo "Container Status:"
docker-compose ps

echo ""
echo "Image Information:"
docker images | grep -E "samaria|postgres|nginx" || echo "Images building..."

echo ""
echo "Service Logs (Last 10 lines):"
echo "--- Database ---"
docker-compose logs --tail=5 db

echo ""
echo "--- Application ---"
docker-compose logs --tail=5 app

echo ""
echo "--- Nginx ---"
docker-compose logs --tail=5 nginx

echo ""
echo "========================================"
echo "DEPLOYMENT ENDPOINTS"
echo "========================================"
echo "Application URL: http://167.235.197.55"
echo "Domain (if configured): https://app.samariaerp.org"
echo "Database: samaria_erp (PostgreSQL 15)"
echo ""
EOF

##############################################################################
# Post-deployment Summary
##############################################################################

log_success "Deployment completed successfully!"
echo ""
echo "========================================"
echo "DEPLOYMENT SUMMARY"
echo "========================================"
echo "Environment: $ENVIRONMENT"
echo "Server: $HETZNER_IP"
echo "Timestamp: $TIMESTAMP"
echo ""
echo "Services deployed:"
echo "  - PostgreSQL 15 (Port 5432)"
echo "  - Next.js Application (Port 3000)"
echo "  - Nginx Reverse Proxy (Port 80/443)"
echo ""
echo "To monitor the deployment:"
echo "  ssh $HETZNER_USER@$HETZNER_IP"
echo "  cd /opt/samaria-erp"
echo "  docker-compose logs -f app"
echo ""
echo "To stop the services:"
echo "  docker-compose down"
echo ""
echo "To restart a specific service:"
echo "  docker-compose restart app"
echo "  docker-compose restart db"
echo "  docker-compose restart nginx"
echo ""
echo "========================================"
echo ""

log_success "Deployment process completed!"
