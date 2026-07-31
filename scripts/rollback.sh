#!/bin/bash

##############################################################################
# Samaria ERP Rollback Script
#
# Purpose: Safely rollback to a previous version in case of deployment failure
# Usage: ./scripts/rollback.sh [commit-hash|HEAD~1]
#
# This script:
# - Stops running containers
# - Reverts to a previous git commit
# - Rebuilds Docker images
# - Restarts services
# - Verifies deployment health
##############################################################################

set -e

# Configuration
HETZNER_IP="89.167.121.126"
HETZNER_USER="root"
PROJECT_DIR="/opt/samaria-erp"
ROLLBACK_TARGET="${1:-HEAD~1}"
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
# Pre-rollback Checks
##############################################################################

log_info "Starting Samaria ERP Rollback Process"
log_info "Target: $ROLLBACK_TARGET"
log_info "Timestamp: $TIMESTAMP"
echo ""

# Confirm with user
echo -e "${YELLOW}[WARNING]${NC} This will rollback the deployment to: $ROLLBACK_TARGET"
echo ""
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    log_error "Rollback cancelled by user"
    exit 1
fi

# Check connectivity
log_info "Verifying SSH connection..."
if ! ssh -o ConnectTimeout=5 -q $HETZNER_USER@$HETZNER_IP exit; then
    log_error "Cannot connect to $HETZNER_IP"
    exit 1
fi

log_success "SSH connection verified"

##############################################################################
# Rollback Execution
##############################################################################

log_info "Starting rollback process..."
echo ""

# Execute rollback on server
ssh $HETZNER_USER@$HETZNER_IP << ROLLBACKEOF

cd $PROJECT_DIR

##############################################################################
# Step 1: Create Backup
##############################################################################

echo -e "\033[0;34m[STEP 1]\033[0m Creating backup before rollback..."

backup_dir=".backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "\$backup_dir"

# Backup current state
cp -r .next "\$backup_dir/.next" 2>/dev/null || true
cp docker-compose.yml "\$backup_dir/" || true
cp .env.production "\$backup_dir/" || true

echo -e "\033[0;32m[OK]\033[0m Backup created in \$backup_dir"

##############################################################################
# Step 2: Stop Services
##############################################################################

echo ""
echo -e "\033[0;34m[STEP 2]\033[0m Stopping services..."

docker-compose down --remove-orphans

echo -e "\033[0;32m[OK]\033[0m Services stopped"

##############################################################################
# Step 3: Revert Git Changes
##############################################################################

echo ""
echo -e "\033[0;34m[STEP 3]\033[0m Reverting to commit: $ROLLBACK_TARGET"

current_commit=\$(git rev-parse HEAD)
echo "Current commit: \$current_commit"

git fetch origin
git reset --hard $ROLLBACK_TARGET

new_commit=\$(git rev-parse HEAD)
echo "Rolled back to: \$new_commit"

echo -e "\033[0;32m[OK]\033[0m Git repository reverted"

##############################################################################
# Step 4: Prune Docker Images
##############################################################################

echo ""
echo -e "\033[0;34m[STEP 4]\033[0m Pruning old Docker images..."

docker image prune -af --filter "until=24h"

echo -e "\033[0;32m[OK]\033[0m Docker cleanup completed"

##############################################################################
# Step 5: Rebuild and Start
##############################################################################

echo ""
echo -e "\033[0;34m[STEP 5]\033[0m Rebuilding and starting services..."

docker-compose pull
docker-compose build --no-cache
docker-compose up -d

echo -e "\033[0;32m[OK]\033[0m Services started"

##############################################################################
# Step 6: Wait for Services
##############################################################################

echo ""
echo -e "\033[0;34m[STEP 6]\033[0m Waiting for services to stabilize (30 seconds)..."

sleep 30

##############################################################################
# Step 7: Verify Rollback
##############################################################################

echo ""
echo -e "\033[0;34m[STEP 7]\033[0m Verifying rollback..."

echo "Container status:"
docker-compose ps

if docker-compose exec -T app curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
    echo -e "\033[0;32m[OK]\033[0m Application is healthy"
else
    echo -e "\033[0;31m[ERROR]\033[0m Application health check failed"
fi

##############################################################################
# Step 8: Display Summary
##############################################################################

echo ""
echo "========================================"
echo "ROLLBACK SUMMARY"
echo "========================================"
echo "Target version: $ROLLBACK_TARGET"
echo "Current commit: \$(git rev-parse HEAD)"
echo "Backup location: \$backup_dir"
echo ""
echo "Container Status:"
docker-compose ps
echo ""
echo "Recent logs (last 20 lines):"
echo "--- Application ---"
docker-compose logs --tail=20 app
echo ""

ROLLBACKEOF

##############################################################################
# Post-rollback Summary
##############################################################################

log_success "Rollback completed successfully!"
echo ""
echo "========================================"
echo "ROLLBACK COMPLETED"
echo "========================================"
echo ""
echo "Rolled back to: $ROLLBACK_TARGET"
echo "Timestamp: $TIMESTAMP"
echo ""
echo "Next steps:"
echo "1. Verify the application is working correctly"
echo "2. Review logs for any issues"
echo "3. If issues persist, contact support"
echo ""
echo "To revert this rollback:"
echo "  ./scripts/rollback.sh [previous-commit]"
echo ""
echo "To view recent commits:"
echo "  git log --oneline -10"
echo ""
echo "========================================"
echo ""

log_success "Rollback process completed!"
