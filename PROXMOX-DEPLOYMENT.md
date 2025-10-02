# Proxmox LXC Container Deployment Guide

This guide walks you through deploying the Gestión de Actividad Laboral application to a Proxmox LXC container using Docker.

## Prerequisites

- Proxmox VE 7.x or later
- LXC container with:
  - Ubuntu 22.04 LTS (recommended) or Debian 11/12
  - Minimum 2 CPU cores
  - Minimum 4GB RAM (8GB recommended)
  - Minimum 20GB storage (40GB recommended)
  - Network connectivity to SQL Server (192.168.0.30:1433)

## Part 1: Create and Configure Proxmox LXC Container

### 1.1 Create LXC Container

1. Log into Proxmox web interface
2. Click "Create CT" button
3. Configure the container:

**General:**
- CT ID: (auto or custom, e.g., 100)
- Hostname: `gestion-actividad`
- Password: Set a secure root password
- Unprivileged container: ✓ (recommended)

**Template:**
- Storage: local
- Template: ubuntu-22.04-standard

**Root Disk:**
- Storage: local-lvm
- Disk size: 40 GB

**CPU:**
- Cores: 2 (or more)

**Memory:**
- Memory: 4096 MB (4GB)
- Swap: 2048 MB

**Network:**
- Bridge: vmbr0
- IPv4: DHCP or Static (e.g., 192.168.0.50/24)
- Gateway: 192.168.0.1

4. Click "Finish" to create the container

### 1.2 Enable Nesting and Features

For Docker to work in LXC, enable nesting:

1. Select the container in Proxmox
2. Go to **Options**
3. Double-click **Features**
4. Enable:
   - ✓ nesting
   - ✓ keyctl (optional, for some features)
5. Click "OK"

### 1.3 Start the Container

```bash
# From Proxmox host
pct start 100
```

Or click "Start" in the web interface.

## Part 2: Install Docker in LXC Container

### 2.1 Access the Container

```bash
# From Proxmox host
pct enter 100

# Or via SSH (if configured)
ssh root@192.168.0.50
```

### 2.2 Update System

```bash
apt update && apt upgrade -y
```

### 2.3 Install Docker

```bash
# Install prerequisites
apt install -y ca-certificates curl gnupg lsb-release

# Add Docker's official GPG key
mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Set up Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Verify installation
docker --version
docker compose version
```

### 2.4 Install Additional Tools

```bash
# Install git, unzip, and other utilities
apt install -y git unzip htop net-tools vim

# Optional: Install Node.js for local debugging
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs
```

## Part 3: Deploy Application

### 3.1 Create Application Directory

```bash
# Create directory structure
mkdir -p /opt/gestion-actividad
cd /opt/gestion-actividad

# Create data directories for volumes
mkdir -p data/redis logs/{backend,frontend,proxy} uploads
mkdir -p monitoring/{prometheus,grafana,loki}
```

### 3.2 Transfer Application Files

**Option A: Using Git (recommended)**

```bash
cd /opt/gestion-actividad
git clone <your-repository-url> .
```

**Option B: Using SCP from development machine**

```bash
# From your Windows development machine
# Install WinSCP or use PowerShell SCP

# Using PowerShell (requires OpenSSH)
scp -r E:\PROJECTES\GESTION-ACTV-CLAUDE root@192.168.0.50:/opt/gestion-actividad/
```

**Option C: Using File Upload via Proxmox**

1. Compress the project directory on Windows
2. Upload via Proxmox web interface
3. Extract in the container

### 3.3 Configure Secrets

```bash
cd /opt/gestion-actividad

# Run the setup script
chmod +x scripts/setup-secrets.sh
./scripts/setup-secrets.sh
```

Enter your production values when prompted:
- SQL Server password: `KBNYERNCK8EKK7389RXB7CEQZTF39GCT.` (from your .env.example)
- Azure AD credentials (from your Azure portal)
- Generate strong passwords for Redis, JWT, and Session

### 3.4 Configure Environment Variables

```bash
# Edit production environment file
nano .env.production
```

Update the following values:
```bash
# Update with your Proxmox container IP
FRONTEND_URL=http://192.168.0.50:8080
AZURE_AD_REDIRECT_URI=http://192.168.0.50:3000/auth/callback

# Verify database settings
DB_HOST=192.168.0.30
DB_PORT=1433
DB_USERNAME=rp-gestorjornadas
DB_NAME=RP_GESTOR_JORNADAS
```

### 3.5 Test Database Connectivity

Before starting Docker containers, verify SQL Server connection:

```bash
# Install SQL Server tools for testing
curl https://packages.microsoft.com/keys/microsoft.asc | apt-key add -
curl https://packages.microsoft.com/config/ubuntu/22.04/prod.list | tee /etc/apt/sources.list.d/mssql-release.list
apt update
ACCEPT_EULA=Y apt install -y mssql-tools unixodbc-dev

# Test connection
/opt/mssql-tools/bin/sqlcmd -S 192.168.0.30 -U rp-gestorjornadas -P 'KBNYERNCK8EKK7389RXB7CEQZTF39GCT.' -Q "SELECT @@VERSION"
```

If successful, you should see SQL Server version information.

## Part 4: Build and Start Containers

### 4.1 Build Docker Images

```bash
cd /opt/gestion-actividad

# Build all images
docker compose build

# This will:
# - Build optimized backend image with SQL Server drivers
# - Build optimized frontend image with nginx
# - Pull Redis image
```

### 4.2 Start Core Services

```bash
# Start backend, frontend, and redis
docker compose up -d

# Check status
docker compose ps

# View logs
docker compose logs -f
```

Expected output:
```
NAME                   IMAGE                        STATUS         PORTS
gestion-backend        gestion-actividad-backend    Up (healthy)   127.0.0.1:3000->3000/tcp
gestion-frontend       gestion-actividad-frontend   Up (healthy)   0.0.0.0:8080->8080/tcp
gestion-redis          redis:7.2-alpine             Up (healthy)   127.0.0.1:6379->6379/tcp
```

### 4.3 Verify Services

```bash
# Check backend health
curl http://localhost:3000/health

# Expected: {"status":"ok","timestamp":"..."}

# Check frontend
curl http://localhost:8080

# Expected: HTML content

# Check container logs
docker compose logs backend
docker compose logs frontend
docker compose logs redis
```

### 4.4 Start Monitoring Stack (Optional)

```bash
# Start monitoring services
docker compose --profile monitoring up -d

# This starts:
# - Prometheus (metrics collection)
# - Grafana (visualization)
# - Loki (log aggregation)

# Access Grafana at: http://192.168.0.50:3001
# Default login: admin / <password from secrets>
```

## Part 5: Configure Firewall and Access

### 5.1 Configure Proxmox Firewall

If using Proxmox firewall, add these rules:

1. Go to Datacenter → Firewall → Add
2. Add rules:

```
Direction: IN, Action: ACCEPT, Protocol: tcp, Dest port: 8080 (Frontend)
Direction: IN, Action: ACCEPT, Protocol: tcp, Dest port: 3001 (Grafana - optional)
```

### 5.2 Configure Container Firewall (ufw)

```bash
# Install ufw
apt install -y ufw

# Allow SSH (important - don't lock yourself out!)
ufw allow 22/tcp

# Allow application ports
ufw allow 8080/tcp comment 'Frontend Web'
ufw allow 3001/tcp comment 'Grafana Monitoring'

# Enable firewall
ufw --force enable

# Check status
ufw status
```

### 5.3 Access the Application

Open your web browser:
- **Application**: http://192.168.0.50:8080
- **Grafana**: http://192.168.0.50:3001 (if monitoring enabled)
- **Backend API**: http://192.168.0.50:3000/api-docs (Swagger docs)

## Part 6: Production Hardening

### 6.1 Enable Auto-Start on Boot

```bash
# Enable Docker service
systemctl enable docker

# Containers will auto-start with restart policies
docker compose up -d
```

### 6.2 Set Up Log Rotation

```bash
# Create logrotate configuration
cat > /etc/logrotate.d/gestion-actividad <<EOF
/opt/gestion-actividad/logs/*/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0640 root root
    sharedscripts
    postrotate
        docker compose -f /opt/gestion-actividad/docker-compose.yml kill -s HUP frontend backend
    endscript
}
EOF
```

### 6.3 Set Up Backup Script

```bash
# Create backup script
cat > /opt/gestion-actividad/backup.sh <<'EOF'
#!/bin/bash
BACKUP_DIR="/opt/backups/gestion-actividad"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

# Backup Redis data
docker compose exec -T redis redis-cli SAVE
tar -czf "$BACKUP_DIR/redis_$TIMESTAMP.tar.gz" -C /opt/gestion-actividad/data redis

# Backup logs
tar -czf "$BACKUP_DIR/logs_$TIMESTAMP.tar.gz" -C /opt/gestion-actividad logs

# Backup uploads
tar -czf "$BACKUP_DIR/uploads_$TIMESTAMP.tar.gz" -C /opt/gestion-actividad uploads

# Keep only last 7 days
find "$BACKUP_DIR" -type f -mtime +7 -delete

echo "Backup completed: $TIMESTAMP"
EOF

chmod +x /opt/gestion-actividad/backup.sh

# Add to crontab (daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/gestion-actividad/backup.sh >> /var/log/gestion-backup.log 2>&1") | crontab -
```

### 6.4 Configure Reverse Proxy with SSL (Optional)

If you want HTTPS access, install nginx on the host:

```bash
apt install -y nginx certbot python3-certbot-nginx

# Create nginx config
cat > /etc/nginx/sites-available/gestion-actividad <<'EOF'
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/ {
        proxy_pass http://localhost:3000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Enable site
ln -s /etc/nginx/sites-available/gestion-actividad /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx

# Get SSL certificate (if you have a domain)
# certbot --nginx -d your-domain.com
```

## Part 7: Maintenance and Troubleshooting

### 7.1 Common Commands

```bash
# View logs
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs --tail=100

# Restart services
docker compose restart backend
docker compose restart frontend

# Stop all services
docker compose down

# Start all services
docker compose up -d

# Update application
git pull
docker compose build
docker compose up -d

# Check resource usage
docker stats

# Access container shell
docker compose exec backend sh
docker compose exec frontend sh
```

### 7.2 Troubleshooting

**Backend not connecting to SQL Server:**
```bash
# Check network connectivity
docker compose exec backend ping 192.168.0.30

# Check SQL Server connection
docker compose exec backend sh
# Inside container:
nc -zv 192.168.0.30 1433
```

**Frontend can't reach backend:**
```bash
# Check backend health
curl http://localhost:3000/health

# Check frontend nginx config
docker compose exec frontend cat /etc/nginx/conf.d/app.conf

# Check backend logs
docker compose logs backend
```

**Out of memory errors:**
```bash
# Check container memory usage
docker stats

# Increase container limits in docker-compose.yml
# Or increase Proxmox container RAM allocation
```

### 7.3 Performance Tuning

**For LXC container:**
```bash
# Edit container config in Proxmox host
# Add swap if needed
pct set 100 -swap 4096
```

**For Docker:**
```bash
# Edit docker daemon settings
nano /etc/docker/daemon.json

{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "storage-driver": "overlay2"
}

systemctl restart docker
```

### 7.4 Monitoring

**Check disk usage:**
```bash
df -h
docker system df
```

**Clean up unused resources:**
```bash
# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune

# Remove all unused resources
docker system prune -a --volumes
```

## Part 8: Upgrade and Rollback

### 8.1 Application Update

```bash
cd /opt/gestion-actividad

# Backup current state
./backup.sh

# Pull latest code
git pull

# Rebuild and restart
docker compose build
docker compose up -d

# Check health
docker compose ps
docker compose logs -f
```

### 8.2 Rollback

```bash
# Stop current version
docker compose down

# Restore from git
git checkout <previous-commit-hash>

# Rebuild
docker compose build
docker compose up -d
```

## Part 9: Security Checklist

- [ ] Changed all default passwords
- [ ] Secrets stored securely in `secrets/` directory
- [ ] Firewall configured (ufw enabled)
- [ ] SSL/TLS enabled (if using reverse proxy)
- [ ] Regular backups scheduled
- [ ] Log rotation configured
- [ ] Monitoring enabled
- [ ] Azure AD configured correctly
- [ ] SQL Server credentials secured
- [ ] Container auto-start enabled
- [ ] Non-root user for SSH access
- [ ] SSH key authentication (disable password auth)

## Support and Resources

- **Docker Documentation**: https://docs.docker.com
- **Proxmox Documentation**: https://pve.proxmox.com/wiki/Main_Page
- **Application Logs**: `/opt/gestion-actividad/logs/`
- **Container Logs**: `docker compose logs`

## Summary

You now have a production-ready deployment running in a Proxmox LXC container with:
- Docker containerized application (backend + frontend)
- Redis cache for performance
- Connection to external SQL Server
- Proper security hardening
- Automated backups
- Monitoring (optional)
- SSL/HTTPS ready (with reverse proxy)

The application is accessible at: **http://192.168.0.50:8080**
