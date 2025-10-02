#!/bin/bash
# ===========================================
# Deploy to Proxmox Container Script
# ===========================================
# This script deploys the application directly to a Proxmox LXC container
# Run this script INSIDE the Proxmox container, not on Windows

set -e

echo "=================================="
echo "Gestión Actividad - Proxmox Deploy"
echo "=================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="/opt/gestion-actividad"
REPO_URL="https://github.com/Romero-Polo/GESTION-ACTV.git"

# Functions
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "Please run as root (use sudo)"
    exit 1
fi

# Step 1: Update system
echo ""
print_info "Step 1: Updating system packages..."
apt update && apt upgrade -y
print_success "System updated"

# Step 2: Install Docker and Docker Compose
echo ""
print_info "Step 2: Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
    print_success "Docker installed"
else
    print_success "Docker already installed"
fi

if ! command -v docker &> /dev/null; then
    print_error "Docker installation failed"
    exit 1
fi

# Install Docker Compose plugin
if ! docker compose version &> /dev/null; then
    print_info "Installing Docker Compose plugin..."
    apt install -y docker-compose-plugin
    print_success "Docker Compose installed"
else
    print_success "Docker Compose already installed"
fi

# Step 3: Install Git
echo ""
print_info "Step 3: Installing Git..."
if ! command -v git &> /dev/null; then
    apt install -y git
    print_success "Git installed"
else
    print_success "Git already installed"
fi

# Step 4: Clone repository
echo ""
print_info "Step 4: Cloning repository..."
if [ -d "$PROJECT_DIR" ]; then
    print_warning "Directory $PROJECT_DIR already exists"
    read -p "Do you want to remove it and re-clone? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -rf "$PROJECT_DIR"
        git clone "$REPO_URL" "$PROJECT_DIR"
        print_success "Repository cloned"
    else
        print_info "Using existing directory"
    fi
else
    git clone "$REPO_URL" "$PROJECT_DIR"
    print_success "Repository cloned"
fi

cd "$PROJECT_DIR"

# Step 5: Create necessary directories
echo ""
print_info "Step 5: Creating directories..."
mkdir -p secrets
mkdir -p data/redis
mkdir -p logs/backend
mkdir -p logs/frontend
mkdir -p logs/proxy
mkdir -p uploads
mkdir -p backups
print_success "Directories created"

# Step 6: Configure secrets
echo ""
print_info "Step 6: Configuring secrets..."
echo "Please enter the following credentials:"

# Database password
if [ ! -f "secrets/db_password.txt" ]; then
    read -sp "SQL Server password: " DB_PASSWORD
    echo
    echo "$DB_PASSWORD" > secrets/db_password.txt
fi

# Redis password
if [ ! -f "secrets/redis_password.txt" ]; then
    REDIS_PASSWORD=$(openssl rand -base64 32)
    echo "$REDIS_PASSWORD" > secrets/redis_password.txt
fi

# JWT Secret
if [ ! -f "secrets/jwt_secret.txt" ]; then
    JWT_SECRET=$(openssl rand -base64 64)
    echo "$JWT_SECRET" > secrets/jwt_secret.txt
fi

# Session Secret
if [ ! -f "secrets/session_secret.txt" ]; then
    SESSION_SECRET=$(openssl rand -base64 64)
    echo "$SESSION_SECRET" > secrets/session_secret.txt
fi

# Azure AD credentials
if [ ! -f "secrets/azure_client_id.txt" ]; then
    read -p "Azure AD Client ID: " AZURE_CLIENT_ID
    echo "$AZURE_CLIENT_ID" > secrets/azure_client_id.txt
fi

if [ ! -f "secrets/azure_client_secret.txt" ]; then
    read -sp "Azure AD Client Secret: " AZURE_CLIENT_SECRET
    echo
    echo "$AZURE_CLIENT_SECRET" > secrets/azure_client_secret.txt
fi

if [ ! -f "secrets/azure_tenant_id.txt" ]; then
    read -p "Azure AD Tenant ID: " AZURE_TENANT_ID
    echo "$AZURE_TENANT_ID" > secrets/azure_tenant_id.txt
fi

# n8n (optional)
if [ ! -f "secrets/n8n_api_key.txt" ]; then
    read -p "n8n API Key (press Enter to skip): " N8N_API_KEY
    echo "${N8N_API_KEY:-skip}" > secrets/n8n_api_key.txt
fi

if [ ! -f "secrets/n8n_webhook_secret.txt" ]; then
    N8N_WEBHOOK_SECRET=$(openssl rand -base64 32)
    echo "$N8N_WEBHOOK_SECRET" > secrets/n8n_webhook_secret.txt
fi

# Grafana admin password (optional)
if [ ! -f "secrets/grafana_admin_password.txt" ]; then
    GRAFANA_PASSWORD=$(openssl rand -base64 16)
    echo "$GRAFANA_PASSWORD" > secrets/grafana_admin_password.txt
fi

# Set permissions
chmod 600 secrets/*
print_success "Secrets configured"

# Step 7: Configure environment
echo ""
print_info "Step 7: Configuring environment..."

# Get container IP
CONTAINER_IP=$(hostname -I | awk '{print $1}')
print_info "Container IP detected: $CONTAINER_IP"

read -p "Is this IP correct? (Y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Nn]$ ]]; then
    read -p "Enter the correct IP address: " CONTAINER_IP
fi

# Update .env.production
if [ -f ".env.production" ]; then
    sed -i "s|FRONTEND_URL=.*|FRONTEND_URL=http://${CONTAINER_IP}:8080|g" .env.production
    sed -i "s|AZURE_AD_REDIRECT_URI=.*|AZURE_AD_REDIRECT_URI=http://${CONTAINER_IP}:3000/auth/callback|g" .env.production
    print_success "Environment configured with IP: $CONTAINER_IP"
else
    print_error ".env.production file not found"
    exit 1
fi

# Step 8: Configure firewall
echo ""
print_info "Step 8: Configuring firewall..."
if command -v ufw &> /dev/null; then
    ufw --force enable
    ufw default deny incoming
    ufw default allow outgoing
    ufw allow 22/tcp comment 'SSH'
    ufw allow 8080/tcp comment 'Application Frontend'
    ufw --force reload
    print_success "Firewall configured"
else
    apt install -y ufw
    ufw --force enable
    ufw default deny incoming
    ufw default allow outgoing
    ufw allow 22/tcp comment 'SSH'
    ufw allow 8080/tcp comment 'Application Frontend'
    ufw --force reload
    print_success "Firewall installed and configured"
fi

# Step 9: Build Docker images
echo ""
print_info "Step 9: Building Docker images (this may take several minutes)..."
docker compose build
print_success "Docker images built"

# Step 10: Start services
echo ""
print_info "Step 10: Starting services..."
docker compose up -d
print_success "Services started"

# Wait for services to start
echo ""
print_info "Waiting for services to start (30 seconds)..."
sleep 30

# Step 11: Check health
echo ""
print_info "Step 11: Checking service health..."

# Check if containers are running
if docker compose ps | grep -q "Up"; then
    print_success "Containers are running"
else
    print_error "Some containers failed to start"
    docker compose ps
    echo ""
    print_error "Check logs with: docker compose logs"
    exit 1
fi

# Step 12: Enable auto-start
echo ""
print_info "Step 12: Enabling auto-start on boot..."
systemctl enable docker
print_success "Auto-start enabled"

# Step 13: Setup backup cron job
echo ""
print_info "Step 13: Setting up automated backups..."
cat > /etc/cron.daily/gestion-backup << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/gestion-actividad/backups"
DATE=$(date +%Y%m%d_%H%M%S)
cd /opt/gestion-actividad
docker compose exec -T redis redis-cli --no-auth-warning -a $(cat secrets/redis_password.txt) SAVE
tar -czf "$BACKUP_DIR/backup_$DATE.tar.gz" data/ uploads/
find "$BACKUP_DIR" -name "backup_*.tar.gz" -mtime +7 -delete
EOF

chmod +x /etc/cron.daily/gestion-backup
print_success "Backup cron job created (runs daily)"

# Final summary
echo ""
echo "=================================="
print_success "Deployment completed successfully!"
echo "=================================="
echo ""
echo "Application URLs:"
echo "  Main Application: http://${CONTAINER_IP}:8080"
echo "  API Documentation: http://${CONTAINER_IP}:3000/api-docs"
echo "  Grafana (optional): http://${CONTAINER_IP}:3001"
echo ""
echo "Useful commands:"
echo "  Check status:    cd $PROJECT_DIR && docker compose ps"
echo "  View logs:       cd $PROJECT_DIR && docker compose logs -f"
echo "  Restart:         cd $PROJECT_DIR && docker compose restart"
echo "  Stop:            cd $PROJECT_DIR && docker compose down"
echo "  Start:           cd $PROJECT_DIR && docker compose up -d"
echo ""
echo "Next steps:"
echo "  1. Update Azure AD redirect URI to: http://${CONTAINER_IP}:3000/auth/callback"
echo "  2. Test the application by accessing: http://${CONTAINER_IP}:8080"
echo "  3. Check logs if there are any issues: docker compose logs"
echo ""
print_warning "Important: Make sure your SQL Server at 192.168.0.30:1433 is accessible from this container"
echo ""
