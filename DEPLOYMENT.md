# Deployment Guide

Comprehensive deployment guide for the Gestión de Actividad Laboral system with multiple deployment options.

## 🚀 Quick Start

### Option 1: Traditional Deployment (Recommended for Production)
```bash
# Make sure you have Node.js 18+, SQL Server, and optionally Redis installed
./scripts/deploy.sh
```

### Option 2: Docker Deployment (Easiest Setup)
```bash
# Requires Docker and Docker Compose
./scripts/deploy-docker.sh
```

### Option 3: Manual Deployment
See [Manual Deployment](#manual-deployment) section below.

## 📋 Prerequisites

### For Traditional Deployment
- **Node.js 18+** and npm
- **SQL Server 2019+** (local, remote, or Azure)
- **Redis Server** (optional but recommended)
- **PM2** (for production process management)
- **Nginx/Apache** (for serving frontend in production)

### For Docker Deployment
- **Docker 20.10+**
- **Docker Compose 2.0+**
- 4GB+ RAM available for containers
- Port access: 80, 443, 1433, 3000, 6379, 9090

### Common Requirements
- **Azure Active Directory** application configured
- **SSL certificates** (for production)
- **Firewall rules** configured for required ports

## 🏗️ Deployment Options

### 1. Traditional Deployment with Scripts

This method deploys directly to the host system using Node.js.

```bash
# 1. Clone and navigate to project
git clone <repository-url>
cd gestion-actividad-laboral

# 2. Configure environment variables
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
# Edit both .env files with your configurations

# 3. Run deployment script
./scripts/deploy.sh

# Available options:
./scripts/deploy.sh --skip-tests      # Skip running tests
./scripts/deploy.sh --build-only      # Only build, don't start services
./scripts/deploy.sh --skip-cleanup    # Don't clean old builds
```

#### What the script does:
1. ✅ Validates prerequisites
2. ✅ Installs dependencies for backend and frontend
3. ✅ Runs tests (skippable)
4. ✅ Builds both applications
5. ✅ Runs database migrations
6. ✅ Starts backend with PM2
7. ✅ Provides frontend build files for web server
8. ✅ Performs health checks

### 2. Docker Deployment with Scripts

This method uses Docker containers for all services.

```bash
# 1. Clone and navigate to project
git clone <repository-url>
cd gestion-actividad-laboral

# 2. Run Docker deployment script
./scripts/deploy-docker.sh

# Available commands:
./scripts/deploy-docker.sh start                    # Start all services (default)
./scripts/deploy-docker.sh start-monitor           # Start with monitoring
./scripts/deploy-docker.sh stop                    # Stop all services
./scripts/deploy-docker.sh restart                 # Restart services
./scripts/deploy-docker.sh status                  # Show service status
./scripts/deploy-docker.sh logs [service]          # View logs
./scripts/deploy-docker.sh cleanup                 # Remove all containers and volumes
./scripts/deploy-docker.sh --generate-ssl          # Generate self-signed SSL certificates
```

#### What the Docker deployment includes:
- 🗃️ **SQL Server** container with automatic database creation
- 🚀 **Redis** container for caching and sessions
- ⚡ **Backend** container with Node.js application
- 🌐 **Frontend** container with Nginx serving React app
- 📊 **Monitoring** container with Prometheus (optional)

### 3. Manual Deployment

For custom deployment scenarios or troubleshooting.

#### Backend Manual Deployment
```bash
cd backend

# Install dependencies
npm ci --production=false

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Build application
npm run build

# Run database migrations
npm run migration:run

# Start application
npm start
# Or with PM2: pm2 start dist/index.js --name gestion-backend
```

#### Frontend Manual Deployment
```bash
cd frontend

# Install dependencies
npm ci --production=false

# Configure environment
cp .env.example .env
# Edit .env with backend API URL

# Build application
npm run build

# Serve with your web server
# Files will be in dist/ directory
```

## 🔧 Configuration Guide

### Environment Variables

#### Backend Configuration (.env)
```env
# Database (Required)
DB_HOST=localhost
DB_PORT=1433
DB_USERNAME=sa
DB_PASSWORD=YourStrongPassword123!
DB_NAME=gestion_actividad

# Azure AD (Required for authentication)
AZURE_AD_CLIENT_ID=your-client-id
AZURE_AD_CLIENT_SECRET=your-client-secret
AZURE_AD_TENANT_ID=your-tenant-id

# Security (Required)
JWT_SECRET=your-super-secure-jwt-secret-at-least-32-characters
SESSION_SECRET=your-super-secure-session-secret

# Optional but recommended
REDIS_URL=redis://localhost:6379
FRONTEND_URL=http://localhost:5173
```

#### Frontend Configuration (.env)
```env
# API URL (Required)
VITE_API_URL=http://localhost:3000

# Optional
VITE_APP_TITLE=Gestión de Actividad Laboral
VITE_ENABLE_GPS_FEATURES=false
VITE_ENABLE_METRICS_PAGE=true
```

### Azure Active Directory Setup

1. **Register Application** in Azure Portal
2. **Set Redirect URIs**:
   - Development: `http://localhost:3000/auth/callback`
   - Production: `https://yourdomain.com/auth/callback`
3. **Generate Client Secret**
4. **Configure API Permissions** (if needed)
5. **Note down**: Client ID, Client Secret, Tenant ID

### Database Setup

#### SQL Server (Local/Remote)
```sql
-- Create database
CREATE DATABASE gestion_actividad;
CREATE DATABASE gestion_actividad_test; -- For testing

-- Create user (optional)
CREATE LOGIN gestion_user WITH PASSWORD = 'SecurePassword123!';
USE gestion_actividad;
CREATE USER gestion_user FOR LOGIN gestion_user;
ALTER ROLE db_owner ADD MEMBER gestion_user;
```

#### SQL Server (Docker)
```bash
docker run -e "ACCEPT_EULA=Y" -e "SA_PASSWORD=YourStrongPassword123!" \
  -p 1433:1433 --name sql-server \
  -d mcr.microsoft.com/mssql/server:2019-latest
```

## 🌐 Production Deployment

### Web Server Configuration (Nginx)

Create `/etc/nginx/sites-available/gestion-actividad`:
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /path/to/your/cert.pem;
    ssl_certificate_key /path/to/your/key.pem;

    # Frontend
    location / {
        root /path/to/gestion-actividad-laboral/frontend/dist;
        try_files $uri $uri/ /index.html;

        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Authentication
    location /auth/ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/gestion-actividad /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Process Management (PM2)

```bash
# Install PM2 globally
npm install -g pm2

# Start application
cd backend
pm2 start dist/index.js --name gestion-backend

# Configure auto-restart on server reboot
pm2 startup
pm2 save
```

### SSL Certificates

#### With Let's Encrypt (Certbot)
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

#### With custom certificates
```bash
# Copy certificates to appropriate location
sudo cp cert.pem /etc/ssl/certs/gestion-actividad.pem
sudo cp key.pem /etc/ssl/private/gestion-actividad.key
sudo chown root:root /etc/ssl/certs/gestion-actividad.pem
sudo chown root:ssl-cert /etc/ssl/private/gestion-actividad.key
sudo chmod 644 /etc/ssl/certs/gestion-actividad.pem
sudo chmod 640 /etc/ssl/private/gestion-actividad.key
```

## 📊 Monitoring and Maintenance

### Health Checks
```bash
# Application health
curl http://localhost:3000/health

# Detailed system health (requires admin token)
curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
     http://localhost:3000/api/metrics/health
```

### Log Management
```bash
# PM2 logs
pm2 logs gestion-backend

# Application logs (if LOG_DIR configured)
tail -f /path/to/logs/application.log

# Docker logs
docker logs gestion-backend -f
```

### Database Maintenance
```bash
# Backup database
sqlcmd -S localhost -U sa -P "YourPassword" \
  -Q "BACKUP DATABASE gestion_actividad TO DISK='/backup/gestion_actividad.bak'"

# Run migrations (if needed)
cd backend && npm run migration:run
```

### Performance Monitoring
- **Application metrics**: `/api/metrics/performance` (admin only)
- **System health**: `/api/metrics/health`
- **Prometheus metrics**: Port 9090 (if enabled)
- **PM2 monitoring**: `pm2 monit`

## 🔧 Troubleshooting

### Common Issues

#### Backend Won't Start
1. Check environment variables in `.env`
2. Verify database connectivity
3. Check port availability: `netstat -tlnp | grep :3000`
4. Review logs: `pm2 logs` or `docker logs`

#### Database Connection Issues
```bash
# Test SQL Server connectivity
telnet localhost 1433

# Test with sqlcmd
sqlcmd -S localhost -U sa -P "YourPassword" -Q "SELECT 1"
```

#### Authentication Issues
1. Verify Azure AD configuration
2. Check redirect URIs match exactly
3. Validate client secret hasn't expired
4. Review backend logs for auth errors

#### Frontend Not Loading
1. Check if backend API is accessible
2. Verify CORS configuration
3. Check browser console for errors
4. Validate environment variables

#### Performance Issues
1. Enable Redis caching
2. Check database query performance
3. Review application logs for slow operations
4. Monitor system resources

### Getting Help

For additional support:
- Check application logs first
- Review this deployment guide
- Check the main [README.md](README.md) for detailed information
- Use health check endpoints to diagnose issues
- Enable debug logging temporarily: `LOG_LEVEL=debug`

## ✅ Deployment Checklist

### Pre-deployment
- [ ] Azure AD application configured
- [ ] SSL certificates obtained (production)
- [ ] Database server accessible
- [ ] Redis server running (recommended)
- [ ] Firewall rules configured
- [ ] Environment variables configured

### Post-deployment
- [ ] Health checks passing
- [ ] Authentication working
- [ ] Database migrations applied
- [ ] SSL certificates valid
- [ ] Monitoring enabled
- [ ] Backups configured
- [ ] Log rotation configured

### Security Checklist
- [ ] Strong passwords used
- [ ] JWT secrets are secure and unique
- [ ] Database access restricted
- [ ] HTTPS enabled in production
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Regular security updates planned

---

**Need Help?** Check the troubleshooting section above or refer to the main [README.md](README.md) for detailed system documentation.