# Production Deployment Checklist

Use this checklist to ensure all steps are completed for a successful production deployment.

## Pre-Deployment

### Infrastructure
- [ ] Proxmox container created with sufficient resources (4GB RAM, 2 CPU, 40GB storage)
- [ ] Container has network connectivity to SQL Server (192.168.0.30:1433)
- [ ] Container nesting enabled for Docker support
- [ ] Static IP assigned or DHCP reservation configured
- [ ] Firewall rules configured in Proxmox

### Software Installation
- [ ] Docker Engine installed and running
- [ ] Docker Compose plugin installed
- [ ] Git installed (if using git deployment)
- [ ] Required system packages installed (curl, unzip, etc.)

### Database
- [ ] SQL Server accessible from container (test with telnet/nc)
- [ ] Database credentials verified
- [ ] Database schema exists (RP_GESTOR_JORNADAS)
- [ ] Database user has appropriate permissions
- [ ] Test connection with sqlcmd or similar tool

### Azure Active Directory
- [ ] Azure AD application registered
- [ ] Client ID obtained
- [ ] Client Secret generated
- [ ] Tenant ID noted
- [ ] Redirect URIs configured correctly
- [ ] Required API permissions granted

## Configuration

### Secrets Setup
- [ ] Run `scripts/setup-secrets.sh` or `scripts/setup-secrets.bat`
- [ ] `secrets/db_password.txt` created with SQL Server password
- [ ] `secrets/redis_password.txt` created with strong password
- [ ] `secrets/jwt_secret.txt` created (min 32 characters)
- [ ] `secrets/session_secret.txt` created (min 32 characters)
- [ ] `secrets/azure_client_id.txt` created
- [ ] `secrets/azure_client_secret.txt` created
- [ ] `secrets/azure_tenant_id.txt` created
- [ ] Optional: `secrets/n8n_api_key.txt` created (if using n8n)
- [ ] Optional: `secrets/n8n_webhook_secret.txt` created
- [ ] Optional: `secrets/grafana_admin_password.txt` created
- [ ] All secret files have 600 permissions (readable only by owner)
- [ ] Secrets directory has 700 permissions

### Environment Variables
- [ ] `.env.production` file created from template
- [ ] `DB_HOST` set to correct SQL Server IP
- [ ] `DB_PORT` set to 1433
- [ ] `DB_USERNAME` set to correct username
- [ ] `DB_NAME` set to RP_GESTOR_JORNADAS
- [ ] `FRONTEND_URL` updated with production URL/IP
- [ ] `AZURE_AD_REDIRECT_URI` updated with production URL
- [ ] n8n settings configured (if applicable)
- [ ] Sync settings configured as needed

### Directory Structure
- [ ] Application directory created (`/opt/gestion-actividad`)
- [ ] Data directories created (`data/redis`)
- [ ] Log directories created (`logs/backend`, `logs/frontend`, `logs/proxy`)
- [ ] Uploads directory created (`uploads/`)
- [ ] Backup directory created (`/opt/backups/gestion-actividad`)
- [ ] All directories have correct permissions

## Docker Deployment

### Build Phase
- [ ] All application files transferred to container
- [ ] `.dockerignore` files in place
- [ ] `docker compose build` completes without errors
- [ ] Backend image built successfully
- [ ] Frontend image built successfully
- [ ] Images tagged correctly

### Start Phase
- [ ] `docker compose up -d` executes successfully
- [ ] Redis container starts and becomes healthy
- [ ] Backend container starts and becomes healthy
- [ ] Frontend container starts and becomes healthy
- [ ] No error messages in `docker compose logs`

### Verification
- [ ] `docker compose ps` shows all containers as "Up"
- [ ] Backend health check responds: `curl http://localhost:3000/health`
- [ ] Frontend responds: `curl http://localhost:8080`
- [ ] Backend API documentation accessible: http://localhost:3000/api-docs
- [ ] No errors in backend logs: `docker compose logs backend`
- [ ] No errors in frontend logs: `docker compose logs frontend`

## Security Hardening

### Container Security
- [ ] Containers running as non-root users
- [ ] Read-only root filesystems where applicable
- [ ] Security options configured (no-new-privileges)
- [ ] Resource limits set (memory, CPU)
- [ ] Health checks configured for all services
- [ ] Restart policies set to `unless-stopped` or `always`

### Network Security
- [ ] Backend and Redis not exposed to public network
- [ ] Frontend exposed only on required port (8080)
- [ ] UFW firewall enabled and configured
- [ ] Only necessary ports open (22 for SSH, 8080 for web)
- [ ] Network segmentation between backend and frontend networks

### Access Control
- [ ] SSH access secured (key-based authentication recommended)
- [ ] Root password changed from default
- [ ] Non-root user created for administration
- [ ] Sudo access configured appropriately
- [ ] Azure AD authentication working correctly

### Data Protection
- [ ] Secrets directory protected (700 permissions)
- [ ] Secret files protected (600 permissions)
- [ ] Database credentials not in environment variables (using secrets)
- [ ] `.env.production` not committed to git
- [ ] `secrets/` directory in `.gitignore`

## Monitoring and Maintenance

### Logging
- [ ] Log rotation configured (`/etc/logrotate.d/gestion-actividad`)
- [ ] Application logs writing correctly
- [ ] Docker logs configured with size and rotation limits
- [ ] Log aggregation working (if using Loki)

### Backups
- [ ] Backup script created and executable
- [ ] Backup cron job configured (daily recommended)
- [ ] Test backup script execution
- [ ] Verify backup files are created
- [ ] Backup retention policy configured (7 days default)
- [ ] Offsite backup strategy planned

### Monitoring (Optional)
- [ ] Prometheus started (if using monitoring)
- [ ] Grafana accessible and configured
- [ ] Dashboards imported and working
- [ ] Alerts configured for critical services
- [ ] Loki collecting logs

### Auto-Start
- [ ] Docker service enabled on boot: `systemctl enable docker`
- [ ] Containers have restart policies configured
- [ ] Test reboot and verify services start automatically

## Application Functionality

### Frontend Testing
- [ ] Application loads in browser
- [ ] Login page appears
- [ ] Azure AD authentication works
- [ ] Static assets load correctly
- [ ] No console errors in browser
- [ ] API calls succeed
- [ ] Navigation works

### Backend Testing
- [ ] Health endpoint responds correctly
- [ ] Database connection established
- [ ] Redis connection established
- [ ] Authentication endpoints work
- [ ] API endpoints respond correctly
- [ ] Swagger documentation loads
- [ ] CORS configured correctly

### Integration Testing
- [ ] Create test activity
- [ ] View activities list
- [ ] Edit activity
- [ ] Delete activity
- [ ] Test GPS features (if enabled)
- [ ] Test export functionality
- [ ] Test sync functionality (if configured)
- [ ] Verify data persists after restart

## Performance Optimization

### Container Resources
- [ ] Backend memory usage acceptable
- [ ] Frontend memory usage acceptable
- [ ] Redis memory usage within limits
- [ ] CPU usage reasonable under load
- [ ] Disk I/O performing well

### Application Performance
- [ ] Page load times acceptable
- [ ] API response times < 500ms
- [ ] Database queries optimized
- [ ] Redis caching working
- [ ] Static assets served with proper caching headers

## Documentation

### Deployment Documentation
- [ ] Server access details documented
- [ ] IP addresses and ports documented
- [ ] Service URLs documented
- [ ] Azure AD configuration documented
- [ ] Backup procedures documented
- [ ] Recovery procedures documented

### Credentials Management
- [ ] All credentials documented in secure location
- [ ] Password manager configured
- [ ] Secret rotation schedule planned
- [ ] Access shared with team (encrypted)

### Runbooks
- [ ] Restart procedure documented
- [ ] Update procedure documented
- [ ] Rollback procedure documented
- [ ] Troubleshooting guide created
- [ ] Emergency contacts listed

## Post-Deployment

### Communication
- [ ] Stakeholders notified of deployment
- [ ] Users informed of new URL/access method
- [ ] Training scheduled (if needed)
- [ ] Support channels established

### Monitoring Period
- [ ] Monitor for 24 hours after deployment
- [ ] Check logs for errors
- [ ] Monitor resource usage
- [ ] Verify backups running
- [ ] User feedback collected

### Handover
- [ ] Operations team briefed
- [ ] Documentation shared
- [ ] Access credentials transferred
- [ ] Support procedures established
- [ ] Escalation path defined

## Final Verification

- [ ] All checklist items completed
- [ ] No critical errors in logs
- [ ] All services healthy and running
- [ ] Backups configured and tested
- [ ] Monitoring in place
- [ ] Security hardening complete
- [ ] Documentation up to date
- [ ] Team trained and ready

## Sign-Off

**Deployment Date:** _______________

**Deployed By:** _______________

**Verified By:** _______________

**Production URL:** http://_______________:8080

**Notes:**
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
