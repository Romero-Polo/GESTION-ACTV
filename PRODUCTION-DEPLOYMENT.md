# Production Deployment Guide

This guide provides comprehensive instructions for deploying the Gestión de Actividad Laboral application in a production environment using Docker.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Quick Start](#quick-start)
4. [Manual Setup](#manual-setup)
5. [Security Configuration](#security-configuration)
6. [Monitoring and Logging](#monitoring-and-logging)
7. [Backup and Recovery](#backup-and-recovery)
8. [Troubleshooting](#troubleshooting)
9. [Performance Tuning](#performance-tuning)
10. [Maintenance](#maintenance)

## Architecture Overview

The production deployment consists of the following components:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Load Balancer │    │    Frontend     │    │     Backend     │
│     (Nginx)     │◄──►│   (React/Nginx) │◄──►│   (Node.js)     │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
                       ┌─────────────────┐              │
                       │     Redis       │◄─────────────┤
                       │    (Cache)      │              │
                       └─────────────────┘              │
                                                        │
                       ┌─────────────────┐              │
                       │   SQL Server    │◄─────────────┘
                       │   (Database)    │
                       └─────────────────┘

┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Prometheus    │    │     Grafana     │    │      Loki       │
│   (Metrics)     │    │ (Visualization) │    │   (Logging)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Network Architecture

- **Frontend Network**: Handles public traffic and frontend-backend communication
- **Backend Network**: Internal network for database and cache communication (isolated)
- **Monitoring Network**: Isolated network for monitoring stack

## Prerequisites

### System Requirements

- **CPU**: Minimum 4 cores, recommended 8+ cores
- **RAM**: Minimum 8GB, recommended 16GB+
- **Storage**: Minimum 50GB SSD, recommended 100GB+ SSD
- **Network**: Stable internet connection for Docker image pulls

### Software Requirements

- Docker Engine 20.10+
- Docker Compose 2.0+
- Git
- OpenSSL (for certificate generation)

### Operating System Support

- Linux (Ubuntu 20.04+, CentOS 7+, RHEL 8+)
- Windows 10/11 with Docker Desktop
- macOS 10.15+ with Docker Desktop

## Quick Start

### Automated Setup

Use our automated setup script for quick deployment:

**Linux/macOS:**
```bash
chmod +x scripts/setup-production.sh
./scripts/setup-production.sh
```

**Windows:**
```cmd
scripts\setup-production.bat
```

The script will:
1. Generate secure secrets
2. Create SSL certificates
3. Build Docker images
4. Start all services
5. Display connection information

## Manual Setup

### 1. Clone and Prepare

```bash
git clone <repository-url>
cd gestion-actividad-laboral
```

### 2. Generate Secrets

Create the secrets directory and generate secure passwords:

```bash
mkdir -p secrets
chmod 700 secrets

# Generate database password
openssl rand -base64 32 | tr -d "\n" > secrets/db_sa_password.txt

# Generate Redis password
openssl rand -base64 32 | tr -d "\n" > secrets/redis_password.txt

# Generate JWT secret
openssl rand -base64 64 | tr -d "\n" > secrets/jwt_secret.txt

# Generate session secret
openssl rand -base64 64 | tr -d "\n" > secrets/session_secret.txt

# Generate Grafana admin password
openssl rand -base64 24 | tr -d "\n" > secrets/grafana_admin_password.txt

# Set proper permissions
chmod 600 secrets/*.txt
```

### 3. SSL Certificates

For development/testing, generate self-signed certificates:

```bash
mkdir -p ssl
openssl req -x509 -newkey rsa:4096 -keyout ssl/key.pem -out ssl/cert.pem -days 365 -nodes \
    -subj "/C=ES/ST=Madrid/L=Madrid/O=Gestion Actividad/OU=IT Department/CN=localhost"
chmod 600 ssl/*.pem
```

**For production, replace with proper SSL certificates from a trusted CA.**

### 4. Build and Deploy

```bash
# Build images
docker-compose build --no-cache

# Start core services
docker-compose up -d

# Or start with monitoring
docker-compose --profile monitoring up -d
```

## Security Configuration

### Network Security

The deployment uses multiple isolated networks:

- **backend-network**: Internal only, no external access
- **frontend-network**: Public facing
- **monitoring-network**: Internal monitoring communication

### Container Security

All containers run with:
- Non-root users
- Read-only filesystems where possible
- Security options (`no-new-privileges`)
- Resource limits
- Proper capability restrictions

### Secrets Management

Secrets are managed using Docker secrets with file-based providers. For enhanced security in production:

1. **Use external secret management**:
   - Azure Key Vault
   - AWS Secrets Manager
   - HashiCorp Vault

2. **Implement secret rotation**:
   ```bash
   # Example secret rotation
   echo -n "new_password" > secrets/db_sa_password.txt
   docker-compose up -d --force-recreate database
   ```

### SSL/TLS Configuration

1. **Obtain proper certificates** for production
2. **Configure HTTPS redirect** in nginx proxy
3. **Enable HSTS headers** for security
4. **Use strong cipher suites**

## Monitoring and Logging

### Prometheus Metrics

Access Prometheus at `http://localhost:9090` (with monitoring profile).

**Key metrics monitored**:
- Application performance
- Database connections
- Redis cache hit rates
- HTTP request rates and latencies
- System resources

### Grafana Dashboards

Access Grafana at `http://localhost:3001` (with monitoring profile).

**Default credentials**:
- Username: `admin`
- Password: Check `secrets/grafana_admin_password.txt`

### Log Aggregation

Loki aggregates logs from all containers. Access via Grafana's Explore feature.

**Log retention**: 31 days (configurable in `monitoring/loki-config.yaml`)

### Health Checks

All services include comprehensive health checks:

```bash
# Check service health
docker-compose ps

# View health check logs
docker-compose logs <service-name>
```

## Backup and Recovery

### Database Backup

```bash
# Create database backup
docker-compose exec database /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P "$(cat secrets/db_sa_password.txt)" -Q "BACKUP DATABASE gestion_actividad TO DISK = '/var/opt/mssql/backup/gestion_actividad.bak'"

# Copy backup from container
docker cp gestion-db:/var/opt/mssql/backup/gestion_actividad.bak ./backups/
```

### Redis Backup

Redis automatically saves data with the configured persistence settings. Manual backup:

```bash
# Force Redis save
docker-compose exec redis redis-cli -a "$(cat secrets/redis_password.txt)" BGSAVE

# Copy Redis dump
docker cp gestion-redis:/data/dump.rdb ./backups/
```

### Volume Backup

```bash
# Create volume backups
docker run --rm -v gestion-actividad_db_data:/source -v $(pwd)/backups:/backup alpine tar czf /backup/db_data.tar.gz -C /source .
docker run --rm -v gestion-actividad_redis_data:/source -v $(pwd)/backups:/backup alpine tar czf /backup/redis_data.tar.gz -C /source .
```

### Automated Backup Script

```bash
#!/bin/bash
# backup.sh - Automated backup script

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups/$DATE"
mkdir -p "$BACKUP_DIR"

# Database backup
docker-compose exec -T database /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P "$(cat secrets/db_sa_password.txt)" -Q "BACKUP DATABASE gestion_actividad TO DISK = '/var/opt/mssql/backup/gestion_actividad_$DATE.bak'"
docker cp gestion-db:/var/opt/mssql/backup/gestion_actividad_$DATE.bak "$BACKUP_DIR/"

# Redis backup
docker-compose exec -T redis redis-cli -a "$(cat secrets/redis_password.txt)" BGSAVE
docker cp gestion-redis:/data/dump.rdb "$BACKUP_DIR/redis_dump_$DATE.rdb"

# Compress backups
tar czf "backups/complete_backup_$DATE.tar.gz" -C "$BACKUP_DIR" .
rm -rf "$BACKUP_DIR"

echo "Backup completed: backups/complete_backup_$DATE.tar.gz"
```

## Troubleshooting

### Common Issues

1. **Services not starting**:
   ```bash
   # Check logs
   docker-compose logs <service-name>

   # Check resource usage
   docker stats

   # Verify network connectivity
   docker-compose exec backend ping database
   ```

2. **Database connection issues**:
   ```bash
   # Test database connection
   docker-compose exec backend curl -f http://localhost:3000/health

   # Check database logs
   docker-compose logs database
   ```

3. **Frontend not loading**:
   ```bash
   # Check nginx configuration
   docker-compose exec frontend nginx -t

   # Test backend connectivity
   docker-compose exec frontend curl -f http://backend:3000/health
   ```

### Performance Issues

1. **Monitor resource usage**:
   ```bash
   docker stats --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"
   ```

2. **Database performance**:
   - Check query performance in application logs
   - Monitor database metrics in Grafana
   - Consider adding database indexes

3. **Memory issues**:
   - Increase container memory limits
   - Enable swap if necessary
   - Monitor for memory leaks

### Log Analysis

```bash
# View recent logs
docker-compose logs --tail=100 -f

# Search for errors
docker-compose logs | grep -i error

# Application-specific logs
docker-compose logs backend | grep -E "(ERROR|WARN)"
```

## Performance Tuning

### Database Optimization

1. **Memory allocation**:
   ```yaml
   # In docker-compose.yml
   environment:
     - MSSQL_MEMORY_LIMIT_MB=4096  # Adjust based on available RAM
   ```

2. **Connection pooling**:
   - Configure optimal connection pool size in backend
   - Monitor connection usage

### Redis Optimization

1. **Memory settings**:
   ```yaml
   command: >
     redis-server
     --maxmemory 512mb
     --maxmemory-policy allkeys-lru
   ```

2. **Persistence settings**:
   - Adjust save intervals based on requirements
   - Consider RDB vs AOF trade-offs

### Application Optimization

1. **Node.js settings**:
   ```yaml
   environment:
     - NODE_OPTIONS="--max-old-space-size=1024"
     - UV_THREADPOOL_SIZE=4
   ```

2. **Nginx optimization**:
   ```nginx
   worker_processes auto;
   worker_connections 1024;

   # Enable compression
   gzip on;
   gzip_comp_level 6;
   ```

### Container Resource Limits

```yaml
deploy:
  resources:
    limits:
      memory: 1G
      cpus: '1.0'
    reservations:
      memory: 512M
      cpus: '0.5'
```

## Maintenance

### Regular Tasks

1. **Update container images**:
   ```bash
   docker-compose pull
   docker-compose up -d
   ```

2. **Clean up unused resources**:
   ```bash
   docker system prune -f
   docker volume prune -f
   ```

3. **Monitor disk usage**:
   ```bash
   df -h
   du -sh /var/lib/docker/
   ```

### Security Updates

1. **Update base images regularly**
2. **Scan for vulnerabilities**:
   ```bash
   docker scout cves <image-name>
   ```

3. **Review security logs**
4. **Update application dependencies**

### Scaling

For horizontal scaling:

1. **Load balancer configuration**:
   - Add multiple backend instances
   - Configure session affinity if needed

2. **Database scaling**:
   - Consider read replicas
   - Implement connection pooling

3. **Monitoring scaling**:
   - Add resource monitoring
   - Set up alerts for resource thresholds

### Disaster Recovery

1. **Regular backup testing**
2. **Document recovery procedures**
3. **Maintain offline backups**
4. **Test restoration in staging environment**

## Production Checklist

Before going live:

- [ ] Proper SSL certificates installed
- [ ] All secrets generated and secured
- [ ] Database performance tuned
- [ ] Monitoring and alerting configured
- [ ] Backup strategy implemented
- [ ] Security hardening applied
- [ ] Load testing completed
- [ ] Disaster recovery plan tested
- [ ] Documentation updated
- [ ] Team training completed

## Support

For additional support:
- Check application logs: `docker-compose logs -f`
- Review monitoring dashboards
- Consult troubleshooting section
- Contact system administrators

---

**Remember**: This is a production system. Always test changes in a staging environment first and follow your organization's change management procedures.