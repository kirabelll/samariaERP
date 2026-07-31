#!/bin/bash

##############################################################################
# Samaria ERP Server Setup Script
#
# Purpose: Initialize and configure the Hetzner server for deployment
# Usage: ./scripts/setup-server.sh <server_ip>
#
# This script:
# - Installs Docker and Docker Compose
# - Creates project directories
# - Configures firewall rules
# - Sets up swap space
# - Prepares for application deployment
##############################################################################

set -e

# Configuration
HETZNER_IP="${1:-89.167.121.126}"
HETZNER_USER="root"
PROJECT_DIR="/opt/samaria-erp"
SWAP_SIZE="2G"
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
# Pre-setup Checks
##############################################################################

log_info "Starting Samaria ERP Server Setup"
log_info "Target server: $HETZNER_IP"
log_info "Timestamp: $TIMESTAMP"
echo ""

# Validate IP address format
if ! [[ $HETZNER_IP =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$ ]]; then
    log_error "Invalid IP address format: $HETZNER_IP"
    exit 1
fi

# Check SSH connectivity
log_info "Verifying SSH connection to $HETZNER_IP..."
if ! ssh -o ConnectTimeout=5 -q $HETZNER_USER@$HETZNER_IP exit; then
    log_error "Cannot connect to $HETZNER_IP. Please verify the IP and your SSH key."
    exit 1
fi

log_success "SSH connection established"

##############################################################################
# Server Setup
##############################################################################

log_info "Beginning server setup process..."
echo ""

# Connect to server and run setup commands
ssh $HETZNER_USER@$HETZNER_IP << 'SETUPEOF'

##############################################################################
# Step 1: System Update
##############################################################################

echo -e "\033[0;34m[INFO]\033[0m Step 1: Updating system packages..."
apt-get update
apt-get upgrade -y
apt-get install -y curl wget git vim nano htop build-essential
log_success() { echo -e "\033[0;32m[SUCCESS]\033[0m $1"; }
log_success "System packages updated"

##############################################################################
# Step 2: Install Docker
##############################################################################

echo ""
echo -e "\033[0;34m[INFO]\033[0m Step 2: Installing Docker..."

# Check if Docker is already installed
if command -v docker &> /dev/null; then
    echo -e "\033[0;32m[SUCCESS]\033[0m Docker is already installed"
    docker --version
else
    # Add Docker repository
    apt-get install -y ca-certificates curl gnupg lsb-release

    # Add Docker's official GPG key
    mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg

    # Add Docker repository
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

    # Install Docker
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

    log_success "Docker installed"
    docker --version
fi

##############################################################################
# Step 3: Install Docker Compose
##############################################################################

echo ""
echo -e "\033[0;34m[INFO]\033[0m Step 3: Installing Docker Compose..."

# Check if docker-compose is already installed
if command -v docker-compose &> /dev/null; then
    echo -e "\033[0;32m[SUCCESS]\033[0m Docker Compose is already installed"
    docker-compose --version
else
    # Download and install Docker Compose
    DOCKER_COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d'"' -f4)
    curl -L "https://github.com/docker/compose/releases/download/${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose

    log_success "Docker Compose installed"
    docker-compose --version
fi

##############################################################################
# Step 4: Create Project Directory
##############################################################################

echo ""
echo -e "\033[0;34m[INFO]\033[0m Step 4: Creating project directory..."

if [ -d "/opt/samaria-erp" ]; then
    echo -e "\033[1;33m[WARNING]\033[0m Directory /opt/samaria-erp already exists"
else
    mkdir -p /opt/samaria-erp
    log_success "Project directory created"
fi

# Create subdirectories
mkdir -p /opt/samaria-erp/uploads
mkdir -p /opt/samaria-erp/logs
mkdir -p /opt/samaria-erp/nginx/conf.d
mkdir -p /opt/samaria-erp/nginx/ssl
mkdir -p /opt/samaria-erp/scripts

# Set proper permissions
chmod -R 755 /opt/samaria-erp
chmod -R 777 /opt/samaria-erp/uploads
chmod -R 777 /opt/samaria-erp/logs

log_success "Subdirectories created with proper permissions"

##############################################################################
# Step 5: Configure Firewall
##############################################################################

echo ""
echo -e "\033[0;34m[INFO]\033[0m Step 5: Configuring firewall (UFW)..."

# Enable UFW
ufw --force enable

# Allow SSH (important - do this first!)
ufw allow 22/tcp

# Allow HTTP and HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Allow PostgreSQL (internal only, but good to have for backups)
# Uncomment if you need external database access
# ufw allow 5432/tcp

# Allow Docker (if needed for remote access)
# ufw allow 2375/tcp

# Reload UFW
ufw reload

log_success "Firewall configured"
ufw status

##############################################################################
# Step 6: Setup Swap Space
##############################################################################

echo ""
echo -e "\033[0;34m[INFO]\033[0m Step 6: Setting up swap space..."

# Check if swap already exists
if [ -f "/swapfile" ]; then
    echo -e "\033[1;33m[WARNING]\033[0m Swap file already exists"
else
    # Create 2GB swap file
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile

    # Make swap persistent
    echo '/swapfile none swap sw 0 0' | tee -a /etc/fstab

    log_success "Swap space created (2GB)"
    free -h
fi

##############################################################################
# Step 7: Start Docker Daemon
##############################################################################

echo ""
echo -e "\033[0;34m[INFO]\033[0m Step 7: Starting Docker daemon..."

systemctl start docker
systemctl enable docker
docker ps

log_success "Docker daemon started and enabled"

##############################################################################
# Step 8: Create Default Nginx Configuration
##############################################################################

echo ""
echo -e "\033[0;34m[INFO]\033[0m Step 8: Creating default nginx configuration..."

cat > /opt/samaria-erp/nginx/conf.d/default.conf << 'NGINXEOF'
# Default Nginx configuration
# This file is managed by Docker Compose

server {
    listen 80;
    server_name _;

    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
NGINXEOF

log_success "Default nginx configuration created"

##############################################################################
# Step 9: Create Placeholder SSL Certificates
##############################################################################

echo ""
echo -e "\033[0;34m[INFO]\033[0m Step 9: Creating placeholder SSL certificates..."

# Generate self-signed certificate (will be replaced with Let's Encrypt)
openssl req -x509 -newkey rsa:4096 -keyout /opt/samaria-erp/nginx/ssl/key.pem -out /opt/samaria-erp/nginx/ssl/cert.pem -days 365 -nodes -subj "/C=DE/ST=NRW/L=Hetzner/O=Samaria/CN=samaria.local"

chmod 644 /opt/samaria-erp/nginx/ssl/cert.pem
chmod 600 /opt/samaria-erp/nginx/ssl/key.pem

log_success "Placeholder SSL certificates created"

##############################################################################
# Step 10: Create Systemd Service (Optional)
##############################################################################

echo ""
echo -e "\033[0;34m[INFO]\033[0m Step 10: Creating systemd service for Docker Compose..."

cat > /etc/systemd/system/samaria-erp.service << 'SERVICEEOF'
[Unit]
Description=Samaria ERP Docker Compose Service
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/samaria-erp
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
SERVICEEOF

systemctl daemon-reload
systemctl enable samaria-erp.service

log_success "Systemd service created"

##############################################################################
# Step 11: Final Summary
##############################################################################

echo ""
echo "========================================"
echo "SERVER SETUP COMPLETED"
echo "========================================"
echo ""
echo "Installed Components:"
echo "  - Docker: $(docker --version)"
echo "  - Docker Compose: $(docker-compose --version)"
echo ""
echo "Firewall Rules (UFW):"
ufw status numbered
echo ""
echo "Disk Space:"
df -h /
echo ""
echo "Memory & Swap:"
free -h
echo ""
echo "Project Directory: /opt/samaria-erp"
echo "Project Structure:"
ls -la /opt/samaria-erp/
echo ""
echo "Next Steps:"
echo "1. Clone the repository: cd /opt/samaria-erp && git clone <repo-url> ."
echo "2. Configure .env.production with secure values"
echo "3. Run deployment script: ./scripts/deploy.sh"
echo ""
echo "Useful Commands:"
echo "  - View logs: docker-compose logs -f"
echo "  - Stop services: docker-compose down"
echo "  - Restart services: docker-compose restart"
echo "  - Check status: docker-compose ps"
echo ""
echo "========================================"

SETUPEOF

##############################################################################
# Post-setup Summary
##############################################################################

log_success "Server setup completed successfully!"
echo ""
echo "========================================"
echo "POST-SETUP INSTRUCTIONS"
echo "========================================"
echo ""
echo "1. SSH into the server:"
echo "   ssh root@$HETZNER_IP"
echo ""
echo "2. Clone your repository:"
echo "   cd /opt/samaria-erp"
echo "   git clone <your-repo-url> ."
echo ""
echo "3. Configure environment variables:"
echo "   nano .env.production"
echo "   # Update NEXTAUTH_SECRET and other secrets"
echo ""
echo "4. Update DNS records (if using domain):"
echo "   Point erp.samariaconstruction.com to $HETZNER_IP"
echo ""
echo "5. Run the deployment script:"
echo "   ./scripts/deploy.sh production"
echo ""
echo "6. Set up SSL certificates with Let's Encrypt:"
echo "   # Install certbot:"
echo "   apt-get install certbot python3-certbot-nginx"
echo "   # Get certificates:"
echo "   certbot certonly --standalone -d erp.samariaconstruction.com"
echo "   # Copy to nginx directory:"
echo "   cp /etc/letsencrypt/live/erp.samariaconstruction.com/fullchain.pem /opt/samaria-erp/nginx/ssl/cert.pem"
echo "   cp /etc/letsencrypt/live/erp.samariaconstruction.com/privkey.pem /opt/samaria-erp/nginx/ssl/key.pem"
echo "   # Restart nginx:"
echo "   docker-compose restart nginx"
echo ""
echo "========================================"
echo ""
