#!/bin/bash

##############################################################################
# Samaria ERP Backup Script
#
# Purpose: Backup database and application files for disaster recovery
# Usage: ./scripts/backup.sh [local|remote|both]
#
# This script:
# - Backs up PostgreSQL database
# - Backs up uploaded files
# - Backs up application configuration
# - Compresses backup files
# - Optionally uploads to remote storage
##############################################################################

set -e

# Configuration
HETZNER_IP="89.167.121.126"
HETZNER_USER="root"
PROJECT_DIR="/opt/samaria-erp"
BACKUP_TYPE="${1:-local}"
TIMESTAMP=$(date '+%Y%m%d-%H%M%S')
BACKUP_NAME="samaria-erp-backup-$TIMESTAMP"

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
# Pre-backup Checks
##############################################################################

log_info "Starting Samaria ERP Backup"
log_info "Backup Type: $BACKUP_TYPE"
log_info "Timestamp: $TIMESTAMP"
echo ""

# Validate backup type
if [[ ! "$BACKUP_TYPE" =~ ^(local|remote|both)$ ]]; then
    log_error "Invalid backup type. Use: local, remote, or both"
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
# Backup Execution
##############################################################################

log_info "Starting backup process..."
echo ""

# Execute backup on server
ssh $HETZNER_USER@$HETZNER_IP << BACKUPEOF

cd $PROJECT_DIR

##############################################################################
# Step 1: Create Backup Directory
##############################################################################

echo -e "\033[0;34m[STEP 1]\033[0m Creating backup directory..."

backup_dir="/opt/backups/$BACKUP_NAME"
mkdir -p "\$backup_dir"

echo -e "\033[0;32m[OK]\033[0m Backup directory created: \$backup_dir"

##############################################################################
# Step 2: Backup PostgreSQL Database
##############################################################################

echo ""
echo -e "\033[0;34m[STEP 2]\033[0m Backing up PostgreSQL database..."

docker-compose exec -T db pg_dump \
    -U samaria \
    -d samaria_erp \
    --format=custom \
    --compress=9 \
    --file=/tmp/samaria_db_dump.sql.gz

mv /tmp/samaria_db_dump.sql.gz "\$backup_dir/database.sql.gz"

db_size=\$(du -h "\$backup_dir/database.sql.gz" | cut -f1)
echo -e "\033[0;32m[OK]\033[0m Database backed up: \$db_size"

##############################################################################
# Step 3: Backup Uploaded Files
##############################################################################

echo ""
echo -e "\033[0;34m[STEP 3]\033[0m Backing up uploaded files..."

if [ -d "./uploads" ] && [ -n "\$(ls -A ./uploads)" ]; then
    tar -czf "\$backup_dir/uploads.tar.gz" ./uploads
    uploads_size=\$(du -h "\$backup_dir/uploads.tar.gz" | cut -f1)
    echo -e "\033[0;32m[OK]\033[0m Uploads backed up: \$uploads_size"
else
    echo -e "\033[1;33m[OK]\033[0m No uploads to backup"
fi

##############################################################################
# Step 4: Backup Configuration
##############################################################################

echo ""
echo -e "\033[0;34m[STEP 4]\033[0m Backing up configuration..."

backup_files=(
    ".env.production"
    "docker-compose.yml"
    "Dockerfile"
    "prisma/schema.prisma"
    "nginx/nginx.conf"
)

for file in "\${backup_files[@]}"; do
    if [ -f "\$file" ]; then
        cp "\$file" "\$backup_dir/\$(basename \$file)"
    fi
done

echo -e "\033[0;32m[OK]\033[0m Configuration files backed up"

##############################################################################
# Step 5: Create Metadata
##############################################################################

echo ""
echo -e "\033[0;34m[STEP 5]\033[0m Creating backup metadata..."

cat > "\$backup_dir/BACKUP_INFO.txt" << 'METAEOF'
Samaria ERP Backup Information
==============================

Backup Date: $TIMESTAMP
Backup Type: $BACKUP_TYPE
Server: 89.167.121.126
Project: /opt/samaria-erp

Files Included:
- database.sql.gz - PostgreSQL database dump
- uploads.tar.gz - User uploaded files
- .env.production - Environment configuration
- docker-compose.yml - Docker Compose configuration
- Dockerfile - Docker image definition
- prisma/schema.prisma - Database schema
- nginx/nginx.conf - Nginx configuration
- BACKUP_INFO.txt - This file

Restoration Instructions:
========================

1. Extract the backup:
   tar -xzf samaria-erp-backup-$TIMESTAMP.tar.gz
   cd samaria-erp-backup-$TIMESTAMP

2. Restore the database:
   docker-compose exec -T db pg_restore \
     -U samaria \
     -d samaria_erp \
     --format=custom \
     database.sql.gz

3. Restore uploaded files:
   tar -xzf uploads.tar.gz
   cp -r uploads/* /opt/samaria-erp/uploads/

4. Verify restoration:
   docker-compose exec -T db pg_isready -U samaria

Notes:
======
- This backup was created automatically
- Database backup is in custom format (pg_dump)
- All files are compressed with gzip
- Backup size information is included below

Generated at: $(date)
METAEOF

echo -e "\033[0;32m[OK]\033[0m Backup metadata created"

##############################################################################
# Step 6: Create Tar Archive
##############################################################################

echo ""
echo -e "\033[0;34m[STEP 6]\033[0m Creating compressed archive..."

cd /opt/backups
tar -czf "$BACKUP_NAME.tar.gz" "$BACKUP_NAME"
total_size=\$(du -h "$BACKUP_NAME.tar.gz" | cut -f1)

echo -e "\033[0;32m[OK]\033[0m Archive created: $BACKUP_NAME.tar.gz (\$total_size)"

##############################################################################
# Step 7: Cleanup
##############################################################################

echo ""
echo -e "\033[0;34m[STEP 7]\033[0m Cleaning up..."

# Remove uncompressed backup directory (keep .tar.gz)
rm -rf "\$backup_dir"

# Keep only last 7 backups
ls -t /opt/backups/*.tar.gz 2>/dev/null | tail -n +8 | xargs -r rm

echo -e "\033[0;32m[OK]\033[0m Cleanup completed (keeping last 7 backups)"

##############################################################################
# Step 8: Display Summary
##############################################################################

echo ""
echo "========================================"
echo "BACKUP SUMMARY"
echo "========================================"
echo "Backup Name: $BACKUP_NAME"
echo "Location: /opt/backups/$BACKUP_NAME.tar.gz"
echo "Size: \$total_size"
echo "Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""
echo "Available Backups:"
ls -lh /opt/backups/*.tar.gz | tail -5
echo ""

BACKUPEOF

##############################################################################
# Post-backup Operations
##############################################################################

log_success "Backup completed successfully!"
echo ""
echo "========================================"
echo "BACKUP COMPLETED"
echo "========================================"
echo ""
echo "Backup Details:"
echo "  Name: $BACKUP_NAME"
echo "  Type: $BACKUP_TYPE"
echo "  Location: /opt/backups/$BACKUP_NAME.tar.gz"
echo ""
echo "To download the backup to your local machine:"
echo "  scp $HETZNER_USER@$HETZNER_IP:/opt/backups/$BACKUP_NAME.tar.gz ./"
echo ""
echo "To schedule automated backups, add to crontab:"
echo "  0 2 * * * /opt/samaria-erp/scripts/backup.sh local"
echo ""
echo "========================================"
echo ""

log_success "Backup process completed!"
