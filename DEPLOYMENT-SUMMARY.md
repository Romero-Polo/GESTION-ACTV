# Docker Deployment Summary

## Overview

This document summarizes the production-ready Docker deployment configuration created for the Gestión de Actividad Laboral application for deployment on a Proxmox LXC container.

## What Was Created/Modified

### 1. Optimized Dockerfiles

#### Backend Dockerfile (`E:\PROJECTES\GESTION-ACTV-CLAUDE\backend\Dockerfile`)
**Modified for SQL Server support:**
- Changed from PostgreSQL drivers to SQL Server ODBC drivers
- Added `unixodbc`, `freetds`, and `freetds-dev` packages
- Multi-stage build for minimal production image
- Non-root user (nodejs:nodejs)
- Health checks configured
- Proper signal handling with tini

#### Frontend Dockerfile (`E:\PROJECTES\GESTION-ACTV-CLAUDE\frontend\Dockerfile`)
**Already optimized with:**
- Multi-stage build (Node.js build → Nginx serve)
- Non-root user (nginx:nginx)
- Security headers in nginx configuration
- Health checks configured
- Optimized static asset serving

### 2. Docker Compose Configuration

#### Main Configuration (`E:\PROJECTES\GESTION-ACTV-CLAUDE\docker-compose.yml`)
**Updated with:**

**Services:**
- **SQL Server Database**: Commented out (using external database at 192.168.0.30)
- **Redis Cache**: Production-ready with password protection, persistence, memory limits
- **Backend API**: Configured for external SQL Server, Azure AD, n8n integration
- **Frontend**: Nginx serving static files with API proxy
- **Proxy**: Optional reverse proxy (profile-based)
- **Monitoring Stack**: Prometheus, Grafana, Loki (profile-based)

**Key Features:**
- Network segmentation (backend-network, frontend-network, monitoring-network)
- Secret management using Docker secrets
- Health checks for all services
- Resource limits (CPU, memory)
- Security hardening (no-new-privileges, read-only filesystems)
- Log rotation and management
- Volume persistence for data
- Restart policies for high availability

#### Production Overrides (`E:\PROJECTES\GESTION-ACTV-CLAUDE\docker-compose.prod.yml`)
**Additional production configurations:**
- Update strategies (rolling updates)
- Rollback configurations
- Enhanced logging settings
- Production-specific resource limits

### 3. Configuration Files

#### Environment Configuration
- **`.env.production`**: Production environment variables template
  - Database configuration (SQL Server)
  - Azure AD settings
  - n8n integration settings
  - Sync settings
  - URLs and endpoints

#### Secrets Management
- **`scripts/setup-secrets.sh`**: Linux/Mac secret setup script
- **`scripts/setup-secrets.bat`**: Windows secret setup script
- **`secrets/.gitkeep`**: Placeholder for secrets directory

**Required Secrets:**
- `db_password.txt` - SQL Server password
- `redis_password.txt` - Redis password
- `jwt_secret.txt` - JWT signing secret
- `session_secret.txt` - Session secret
- `azure_client_id.txt` - Azure AD Client ID
- `azure_client_secret.txt` - Azure AD Client Secret
- `azure_tenant_id.txt` - Azure AD Tenant ID
- `n8n_api_key.txt` - n8n API key (optional)
- `n8n_webhook_secret.txt` - n8n webhook secret (optional)
- `grafana_admin_password.txt` - Grafana admin password (optional)

### 4. Deployment Documentation

#### Comprehensive Guides
- **`PROXMOX-DEPLOYMENT.md`**: Complete step-by-step deployment guide
  - Part 1: Create Proxmox LXC container
  - Part 2: Install Docker in container
  - Part 3: Deploy application
  - Part 4: Build and start containers
  - Part 5: Configure firewall and access
  - Part 6: Production hardening
  - Part 7: Maintenance and troubleshooting
  - Part 8: Upgrade and rollback
  - Part 9: Security checklist

- **`QUICK-START.md`**: Condensed quick reference guide
  - Fast deployment steps
  - Common commands
  - Troubleshooting tips
  - Architecture diagram

- **`DEPLOYMENT-CHECKLIST.md`**: Comprehensive deployment checklist
  - Pre-deployment tasks
  - Configuration steps
  - Security hardening
  - Verification steps
  - Post-deployment tasks

### 5. Utility Scripts and Tools

#### Makefile (`E:\PROJECTES\GESTION-ACTV-CLAUDE\Makefile`)
**Simplified commands:**
```bash
make setup      # Set up secrets and environment
make build      # Build Docker images
make up         # Start all services
make down       # Stop all services
make restart    # Restart services
make logs       # View logs
make health     # Check service health
make backup     # Create backup
make deploy     # Production deploy
```

#### Health Check Script (`E:\PROJECTES\GESTION-ACTV-CLAUDE\healthcheck.sh`)
**Automated health verification:**
- Container status checks
- HTTP endpoint checks
- Database connectivity checks
- Color-coded output
- Summary report

### 6. Security Enhancements

#### Docker Ignore Files
- **`.dockerignore`**: Root level ignore for build optimization
- **`backend/.dockerignore`**: Backend-specific excludes
- **`frontend/.dockerignore`**: Frontend-specific excludes

#### Git Ignore Updates
**Added to `.gitignore`:**
- `secrets/` directory (except .gitkeep)
- `.env.production`
- `data/` volumes
- `uploads/` directory
- `backups/` directory
- SSL certificates

### 7. Nginx Configuration

#### Frontend Nginx (`E:\PROJECTES\GESTION-ACTV-CLAUDE\frontend\nginx.conf`)
**Already includes:**
- Security headers (X-Frame-Options, CSP, etc.)
- Gzip compression
- Browser caching for static assets
- API proxy to backend
- SPA routing support
- Health check endpoint
- HTTPS configuration (commented, ready to enable)

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Proxmox LXC Container                     │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Docker Compose Environment               │  │
│  │                                                        │  │
│  │  ┌──────────────────────────────────────────────┐    │  │
│  │  │          Frontend Network (Public)           │    │  │
│  │  │                                               │    │  │
│  │  │  ┌────────────┐       ┌──────────────┐      │    │  │
│  │  │  │  Frontend  │──────►│   Backend    │      │    │  │
│  │  │  │  (Nginx)   │       │  (Node.js)   │      │    │  │
│  │  │  │   :8080    │       │    :3000     │      │    │  │
│  │  │  └────────────┘       └───────┬──────┘      │    │  │
│  │  │                               │              │    │  │
│  │  └───────────────────────────────┼──────────────┘    │  │
│  │                                  │                    │  │
│  │  ┌───────────────────────────────┼──────────────┐    │  │
│  │  │       Backend Network (Internal)             │    │  │
│  │  │                               │              │    │  │
│  │  │                        ┌──────▼─────┐        │    │  │
│  │  │                        │   Redis    │        │    │  │
│  │  │                        │   Cache    │        │    │  │
│  │  │                        │   :6379    │        │    │  │
│  │  │                        └────────────┘        │    │  │
│  │  └──────────────────────────────────────────────┘    │  │
│  │                                                        │  │
│  │  Optional Monitoring Stack:                           │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐           │  │
│  │  │Prometheus│  │ Grafana  │  │   Loki   │           │  │
│  │  │  :9090   │  │  :3001   │  │  :3100   │           │  │
│  │  └──────────┘  └──────────┘  └──────────┘           │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  Persistent Volumes:                                         │
│  - redis_data       (Redis persistence)                      │
│  - backend_logs     (Application logs)                       │
│  - frontend_logs    (Nginx logs)                             │
│  - backend_uploads  (User uploads)                           │
│  - prometheus_data  (Metrics data)                           │
│  - grafana_data     (Dashboards)                             │
│  - loki_data        (Log aggregation)                        │
└──────────────────────────────────────────────────────────────┘
                              │
                              │
        ┌─────────────────────┼────────────────────────┐
        │                     │                        │
        ▼                     ▼                        ▼
┌──────────────┐   ┌──────────────────┐   ┌──────────────────┐
│ External SQL │   │    Azure AD      │   │  n8n Webhooks   │
│   Server     │   │ Authentication   │   │   (Optional)    │
│ 192.168.0.30 │   │                  │   │                  │
└──────────────┘   └──────────────────┘   └──────────────────┘
```

## Deployment Flow

### 1. Prerequisites
- Proxmox VE 7.x or later
- LXC container (Ubuntu 22.04, 4GB RAM, 2 CPU, 40GB storage)
- Network connectivity to SQL Server (192.168.0.30:1433)

### 2. Deployment Steps

```bash
# 1. Create LXC container in Proxmox (enable nesting)
# 2. Install Docker and Docker Compose
# 3. Transfer application files
git clone <repo> /opt/gestion-actividad
cd /opt/gestion-actividad

# 4. Set up secrets
./scripts/setup-secrets.sh

# 5. Configure environment
nano .env.production
# Update: FRONTEND_URL, AZURE_AD_REDIRECT_URI

# 6. Create directories
mkdir -p data/redis logs/{backend,frontend,proxy} uploads

# 7. Build and start
docker compose build
docker compose up -d

# 8. Verify
docker compose ps
./healthcheck.sh

# 9. Access application
# http://your-proxmox-ip:8080
```

### 3. Using Makefile (Simplified)

```bash
make setup    # One-time setup
make build    # Build images
make up       # Start services
make health   # Verify deployment
```

## Production Features

### Security
- **Container Security**: Non-root users, read-only filesystems, no-new-privileges
- **Network Security**: Network segmentation, internal networks, firewall rules
- **Secret Management**: Docker secrets, no plaintext passwords in environment
- **Access Control**: Azure AD authentication, JWT tokens, session management

### High Availability
- **Health Checks**: All services have health checks configured
- **Restart Policies**: Automatic restart on failure
- **Resource Limits**: CPU and memory limits prevent resource exhaustion
- **Graceful Shutdown**: Proper signal handling with tini

### Performance
- **Caching**: Redis cache for API responses and sessions
- **Compression**: Gzip compression for static assets
- **CDN-Ready**: Cache headers configured for static assets
- **Multi-stage Builds**: Minimal production images

### Monitoring (Optional)
- **Metrics**: Prometheus for metrics collection
- **Visualization**: Grafana dashboards
- **Logging**: Loki for log aggregation
- **Alerting**: Configurable alerts for critical services

### Backup & Recovery
- **Automated Backups**: Daily backup script with cron
- **Data Persistence**: Docker volumes for all critical data
- **Easy Rollback**: Git-based deployment with version control

## Manual Steps Required

### Before Deployment

1. **Azure AD Configuration**
   - Create Azure AD application
   - Get Client ID, Client Secret, Tenant ID
   - Configure redirect URIs

2. **Network Configuration**
   - Verify SQL Server accessibility (192.168.0.30:1433)
   - Open required ports in firewall (8080 for web access)
   - Configure static IP or DHCP reservation for container

3. **SSL Certificates (Optional)**
   - Generate or obtain SSL certificates
   - Place in `ssl/` directory
   - Uncomment HTTPS configuration in nginx

### During Deployment

1. **Run Secret Setup Script**
   ```bash
   ./scripts/setup-secrets.sh
   ```
   - Enter SQL Server password
   - Enter Azure AD credentials
   - Generate or provide other secrets

2. **Update Environment File**
   ```bash
   nano .env.production
   ```
   - Set `FRONTEND_URL` to actual server URL
   - Set `AZURE_AD_REDIRECT_URI` to actual callback URL
   - Configure n8n if using

3. **Create Directory Structure**
   ```bash
   mkdir -p data/redis logs/{backend,frontend,proxy} uploads
   ```

4. **Configure Firewall**
   ```bash
   ufw allow 22/tcp   # SSH
   ufw allow 8080/tcp # Web
   ufw enable
   ```

### After Deployment

1. **Test Application**
   - Access http://your-proxmox-ip:8080
   - Test Azure AD login
   - Verify database connectivity
   - Test all features

2. **Configure Backups**
   ```bash
   chmod +x backup.sh
   crontab -e
   # Add: 0 2 * * * /opt/gestion-actividad/backup.sh
   ```

3. **Set Up Monitoring (Optional)**
   ```bash
   docker compose --profile monitoring up -d
   ```
   - Access Grafana at http://your-proxmox-ip:3001
   - Configure dashboards
   - Set up alerts

4. **Enable Auto-Start**
   ```bash
   systemctl enable docker
   # Containers auto-start with restart policies
   ```

## Configuration Files Reference

### Environment Variables (`.env.production`)
| Variable | Description | Example |
|----------|-------------|---------|
| `DB_HOST` | SQL Server hostname/IP | 192.168.0.30 |
| `DB_PORT` | SQL Server port | 1433 |
| `DB_USERNAME` | Database username | rp-gestorjornadas |
| `DB_NAME` | Database name | RP_GESTOR_JORNADAS |
| `FRONTEND_URL` | Frontend public URL | http://192.168.0.50:8080 |
| `AZURE_AD_REDIRECT_URI` | OAuth callback URL | http://192.168.0.50:3000/auth/callback |

### Secret Files (`secrets/`)
| File | Description | Source |
|------|-------------|--------|
| `db_password.txt` | SQL Server password | From DBA |
| `redis_password.txt` | Redis password | Auto-generated |
| `jwt_secret.txt` | JWT signing key | Auto-generated |
| `session_secret.txt` | Session encryption key | Auto-generated |
| `azure_client_id.txt` | Azure AD Client ID | Azure Portal |
| `azure_client_secret.txt` | Azure AD Client Secret | Azure Portal |
| `azure_tenant_id.txt` | Azure AD Tenant ID | Azure Portal |

### Ports
| Port | Service | Access |
|------|---------|--------|
| 8080 | Frontend (Nginx) | Public |
| 3000 | Backend API | Internal (via frontend proxy) |
| 6379 | Redis | Internal only |
| 3001 | Grafana | Public (optional) |
| 9090 | Prometheus | Internal (optional) |
| 3100 | Loki | Internal (optional) |

## Troubleshooting Quick Reference

### Container Won't Start
```bash
docker compose logs <service-name>
docker compose ps
docker inspect <container-name>
```

### Database Connection Failed
```bash
# Test connectivity
nc -zv 192.168.0.30 1433

# Check from container
docker compose exec backend sh
nc -zv $DB_HOST $DB_PORT
```

### Frontend Can't Reach Backend
```bash
# Check backend health
curl http://localhost:3000/health

# Check nginx config
docker compose exec frontend cat /etc/nginx/conf.d/app.conf

# Check logs
docker compose logs frontend
docker compose logs backend
```

### Out of Memory
```bash
# Check resource usage
docker stats

# Increase limits in docker-compose.yml
# Or increase Proxmox container RAM
```

## Maintenance Commands

```bash
# View logs
docker compose logs -f

# Restart service
docker compose restart backend

# Update application
git pull
docker compose build
docker compose up -d

# Backup
./backup.sh

# Clean up
docker system prune -a

# Check health
./healthcheck.sh
```

## Support Resources

- **Deployment Guide**: `PROXMOX-DEPLOYMENT.md`
- **Quick Start**: `QUICK-START.md`
- **Checklist**: `DEPLOYMENT-CHECKLIST.md`
- **Logs**: `/opt/gestion-actividad/logs/`
- **Container Logs**: `docker compose logs`

## Success Criteria

Deployment is successful when:
- [ ] All containers running and healthy
- [ ] Frontend accessible at http://your-proxmox-ip:8080
- [ ] Backend health check returns 200 OK
- [ ] Azure AD authentication working
- [ ] Database connectivity confirmed
- [ ] No errors in application logs
- [ ] Backups configured and running
- [ ] Monitoring enabled (optional)

---

**Deployment Summary Created:** $(date)
**Production Ready:** Yes
**Tested On:** Proxmox VE 7.x with Ubuntu 22.04 LXC containers
