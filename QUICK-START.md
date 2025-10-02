# Quick Start Guide - Production Deployment

This is a condensed version of the deployment guide. For detailed instructions, see [PROXMOX-DEPLOYMENT.md](PROXMOX-DEPLOYMENT.md).

## Prerequisites

- Proxmox LXC container (Ubuntu 22.04, 4GB RAM, 2 CPU)
- Docker and Docker Compose installed
- Network access to SQL Server at 192.168.0.30:1433

## Quick Deployment Steps

### 1. Clone or Transfer Files

```bash
# SSH into your Proxmox container
ssh root@your-proxmox-ip

# Create application directory
mkdir -p /opt/gestion-actividad
cd /opt/gestion-actividad

# Option A: Clone from git
git clone <your-repo-url> .

# Option B: Use SCP to transfer files
# From your Windows machine:
# scp -r E:\PROJECTES\GESTION-ACTV-CLAUDE root@your-proxmox-ip:/opt/gestion-actividad/
```

### 2. Set Up Secrets

```bash
cd /opt/gestion-actividad

# Make script executable
chmod +x scripts/setup-secrets.sh

# Run setup script
./scripts/setup-secrets.sh
```

Enter when prompted:
- SQL Server password: `KBNYERNCK8EKK7389RXB7CEQZTF39GCT.`
- Azure AD Client ID: (from Azure portal)
- Azure AD Client Secret: (from Azure portal)
- Azure AD Tenant ID: (from Azure portal)
- Other secrets will be auto-generated if left empty

### 3. Configure Environment

```bash
# Edit production environment
nano .env.production
```

Update these values:
```bash
FRONTEND_URL=http://your-proxmox-ip:8080
AZURE_AD_REDIRECT_URI=http://your-proxmox-ip:3000/auth/callback
```

### 4. Create Required Directories

```bash
mkdir -p data/redis logs/{backend,frontend,proxy} uploads
```

### 5. Build and Start

```bash
# Build images
docker compose build

# Start services
docker compose up -d

# Check status
docker compose ps

# View logs
docker compose logs -f
```

### 6. Verify Deployment

```bash
# Check backend health
curl http://localhost:3000/health

# Check frontend
curl http://localhost:8080

# Run full health check
chmod +x healthcheck.sh
./healthcheck.sh
```

### 7. Access Application

Open in your browser:
- **Application**: http://your-proxmox-ip:8080
- **API Docs**: http://your-proxmox-ip:3000/api-docs

## Using Makefile (Simplified Commands)

If you have `make` installed:

```bash
# Set up secrets and directories
make setup

# Build images
make build

# Start services
make up

# Check health
make health

# View logs
make logs-f

# Restart services
make restart

# Stop services
make down
```

## Troubleshooting

### Backend won't start
```bash
# Check logs
docker compose logs backend

# Verify SQL Server connection
docker compose exec backend sh
nc -zv 192.168.0.30 1433
```

### Frontend not accessible
```bash
# Check if nginx is running
docker compose ps frontend

# Check logs
docker compose logs frontend

# Verify backend is accessible
curl http://localhost:3000/health
```

### Database connection failed
```bash
# Test SQL Server connectivity
telnet 192.168.0.30 1433

# Or using nc
nc -zv 192.168.0.30 1433

# Check if credentials are correct in secrets/db_password.txt
```

## Common Commands

```bash
# View all logs
docker compose logs

# View specific service logs
docker compose logs backend
docker compose logs frontend
docker compose logs redis

# Restart a service
docker compose restart backend

# Stop all services
docker compose down

# Update and restart
git pull
docker compose build
docker compose up -d

# Access container shell
docker compose exec backend sh
```

## Security Checklist

- [ ] All secrets configured in `secrets/` directory
- [ ] `.env.production` updated with production URLs
- [ ] Firewall configured (UFW enabled)
- [ ] Only port 8080 exposed to network
- [ ] Database password changed from example
- [ ] Azure AD configured correctly

## Backup

```bash
# Create manual backup
mkdir -p /opt/backups
tar -czf /opt/backups/backup-$(date +%Y%m%d).tar.gz \
    /opt/gestion-actividad/data \
    /opt/gestion-actividad/logs \
    /opt/gestion-actividad/uploads \
    /opt/gestion-actividad/secrets

# Set up automatic daily backups
chmod +x /opt/gestion-actividad/backup.sh
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/gestion-actividad/backup.sh") | crontab -
```

## Next Steps

1. Configure SSL/TLS (see PROXMOX-DEPLOYMENT.md Part 6.4)
2. Set up monitoring (optional): `docker compose --profile monitoring up -d`
3. Configure log rotation
4. Test authentication with Azure AD
5. Train users on the application

## Support

For detailed instructions, troubleshooting, and advanced configuration:
- See: [PROXMOX-DEPLOYMENT.md](PROXMOX-DEPLOYMENT.md)
- See: [DEPLOYMENT-CHECKLIST.md](DEPLOYMENT-CHECKLIST.md)

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Proxmox Container                     │
│  ┌────────────────────────────────────────────────────┐ │
│  │                   Docker Network                    │ │
│  │                                                     │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐        │ │
│  │  │ Frontend │  │ Backend  │  │  Redis   │        │ │
│  │  │  :8080   │◄─┤  :3000   │◄─┤  :6379   │        │ │
│  │  │  Nginx   │  │ Node.js  │  │  Cache   │        │ │
│  │  └────┬─────┘  └────┬─────┘  └──────────┘        │ │
│  │       │             │                              │ │
│  └───────┼─────────────┼──────────────────────────────┘ │
│          │             │                                 │
│   Port 8080            └──────────────┐                 │
└──────────┼────────────────────────────┼─────────────────┘
           │                            │
      [Internet]              [SQL Server 192.168.0.30]
                                   [Azure AD]
```

Production URL: **http://your-proxmox-ip:8080**
