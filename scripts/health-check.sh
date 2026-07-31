#!/bin/bash

##############################################################################
# Samaria ERP Health Check Script
#
# Purpose: Monitor the health of deployed services
# Usage: ./scripts/health-check.sh
#
# Checks:
# - Docker containers status
# - Service health endpoints
# - Database connectivity
# - Disk space
# - Memory usage
# - Log errors
##############################################################################

set -e

# Configuration
HETZNER_IP="89.167.121.126"
HETZNER_USER="root"
PROJECT_DIR="/opt/samaria-erp"
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
# Health Check Execution
##############################################################################

log_info "Starting Samaria ERP Health Check"
log_info "Timestamp: $TIMESTAMP"
echo ""

# Remote health check execution
ssh $HETZNER_USER@$HETZNER_IP << 'HEALTHEOF'

cd /opt/samaria-erp

echo ""
echo "========================================"
echo "SAMARIA ERP HEALTH CHECK REPORT"
echo "========================================"
echo "Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

##############################################################################
# 1. Docker Container Status
##############################################################################

echo -e "\033[0;34m[CHECK]\033[0m 1. Docker Container Status"
echo "----------------------------------------"

docker-compose ps

container_status=$(docker-compose ps --services --filter "status=running")
total_containers=$(docker-compose config --services | wc -l)
running_containers=$(echo "$container_status" | wc -l)

if [ $running_containers -eq $total_containers ]; then
    echo -e "\033[0;32m[OK]\033[0m All $total_containers containers are running"
else
    echo -e "\033[0;31m[ERROR]\033[0m Only $running_containers/$total_containers containers are running"
fi

echo ""

##############################################################################
# 2. Service Health Endpoints
##############################################################################

echo -e "\033[0;34m[CHECK]\033[0m 2. Service Health Endpoints"
echo "----------------------------------------"

# Check Application Health
echo "Application Health:"
if docker-compose exec -T app curl -f -s http://localhost:3000/api/health > /dev/null 2>&1; then
    echo -e "\033[0;32m[OK]\033[0m Application is healthy"
else
    echo -e "\033[0;31m[ERROR]\033[0m Application health check failed"
fi

# Check Nginx Health
echo ""
echo "Nginx Health:"
if docker-compose exec -T nginx wget -q --tries=1 --spider http://localhost/health > /dev/null 2>&1; then
    echo -e "\033[0;32m[OK]\033[0m Nginx is healthy"
else
    echo -e "\033[0;31m[ERROR]\033[0m Nginx health check failed"
fi

echo ""

##############################################################################
# 3. Database Connectivity
##############################################################################

echo -e "\033[0;34m[CHECK]\033[0m 3. Database Connectivity"
echo "----------------------------------------"

if docker-compose exec -T db pg_isready -U samaria -d samaria_erp > /dev/null 2>&1; then
    echo -e "\033[0;32m[OK]\033[0m Database is accessible"

    # Get database statistics
    db_size=$(docker-compose exec -T db psql -U samaria -d samaria_erp -t -c "SELECT pg_size_pretty(pg_database_size('samaria_erp'));" 2>/dev/null)
    echo "Database size: $db_size"

    # Count tables
    table_count=$(docker-compose exec -T db psql -U samaria -d samaria_erp -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null)
    echo "Number of tables: $table_count"
else
    echo -e "\033[0;31m[ERROR]\033[0m Database is not accessible"
fi

echo ""

##############################################################################
# 4. System Resources
##############################################################################

echo -e "\033[0;34m[CHECK]\033[0m 4. System Resources"
echo "----------------------------------------"

# Disk Space
echo "Disk Space:"
df -h / | tail -1 | awk '{printf "  Used: %s / %s (%.1f%%)\n", $3, $2, ($3/$2)*100}'

used_percent=$(df / | tail -1 | awk '{print int(($3/$2)*100)}')
if [ $used_percent -gt 90 ]; then
    echo -e "\033[0;31m[WARNING]\033[0m Disk usage is above 90%"
elif [ $used_percent -gt 80 ]; then
    echo -e "\033[1;33m[NOTICE]\033[0m Disk usage is above 80%"
else
    echo -e "\033[0;32m[OK]\033[0m Disk usage is healthy"
fi

echo ""

# Memory
echo "Memory Usage:"
free -h | tail -2

# Docker resource usage
echo ""
echo "Container Resource Usage:"
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}" samaria_db samaria_app samaria_nginx

echo ""

##############################################################################
# 5. Log Analysis
##############################################################################

echo -e "\033[0;34m[CHECK]\033[0m 5. Recent Errors in Logs"
echo "----------------------------------------"

echo "Database errors (last 10):"
docker-compose logs db 2>/dev/null | grep -i error | tail -5 || echo "  No errors found"

echo ""
echo "Application errors (last 10):"
docker-compose logs app 2>/dev/null | grep -i error | tail -5 || echo "  No errors found"

echo ""
echo "Nginx errors (last 10):"
docker-compose logs nginx 2>/dev/null | grep -i error | tail -5 || echo "  No errors found"

echo ""

##############################################################################
# 6. Network Connectivity
##############################################################################

echo -e "\033[0;34m[CHECK]\033[0m 6. Network Connectivity"
echo "----------------------------------------"

echo "Checking external connectivity:"
if docker-compose exec -T app ping -c 1 8.8.8.8 > /dev/null 2>&1; then
    echo -e "\033[0;32m[OK]\033[0m External connectivity is working"
else
    echo -e "\033[0;31m[WARNING]\033[0m Cannot reach external services"
fi

echo ""
echo "Listening ports:"
netstat -tlnp 2>/dev/null | grep -E ":80|:443|:3000|:5432" || echo "  No services listening"

echo ""

##############################################################################
# 7. Certificate Status
##############################################################################

echo -e "\033[0;34m[CHECK]\033[0m 7. SSL Certificate Status"
echo "----------------------------------------"

if [ -f "/opt/samaria-erp/nginx/ssl/cert.pem" ]; then
    echo "Certificate expiration date:"
    openssl x509 -in /opt/samaria-erp/nginx/ssl/cert.pem -noout -enddate

    expiry_epoch=$(openssl x509 -in /opt/samaria-erp/nginx/ssl/cert.pem -noout -enddate | cut -d= -f2 | date -f - +%s)
    current_epoch=$(date +%s)
    days_left=$(((expiry_epoch - current_epoch) / 86400))

    if [ $days_left -lt 0 ]; then
        echo -e "\033[0;31m[ERROR]\033[0m Certificate has expired"
    elif [ $days_left -lt 30 ]; then
        echo -e "\033[1;33m[WARNING]\033[0m Certificate expires in $days_left days"
    else
        echo -e "\033[0;32m[OK]\033[0m Certificate is valid for $days_left more days"
    fi
else
    echo -e "\033[1;33m[WARNING]\033[0m SSL certificate not found"
fi

echo ""

##############################################################################
# Final Summary
##############################################################################

echo "========================================"
echo "HEALTH CHECK COMPLETED"
echo "========================================"
echo ""
echo "For detailed logs, use:"
echo "  docker-compose logs [service]"
echo ""
echo "To restart a service:"
echo "  docker-compose restart [service]"
echo ""

HEALTHEOF

##############################################################################
# Local Summary
##############################################################################

log_success "Health check completed"
echo ""
echo "To view detailed logs on the server, run:"
echo "  ssh $HETZNER_USER@$HETZNER_IP"
echo "  cd /opt/samaria-erp"
echo "  docker-compose logs -f [service]"
echo ""
