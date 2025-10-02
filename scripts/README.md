# Scripts Directory

This directory contains utility scripts for deployment and maintenance.

## Available Scripts

### Production Deployment Scripts

#### `setup-secrets.sh` (Linux/Mac)
**Purpose:** Interactive script to create all required secret files for production deployment.

**Usage:**
```bash
chmod +x scripts/setup-secrets.sh
./scripts/setup-secrets.sh
```

**What it does:**
- Creates the `secrets/` directory with proper permissions (700)
- Prompts for all required secrets
- Auto-generates strong passwords for Redis, JWT, and Session secrets
- Creates secret files with secure permissions (600)
- Validates inputs and provides helpful prompts

**Required inputs:**
- SQL Server password
- Azure AD Client ID
- Azure AD Client Secret
- Azure AD Tenant ID
- n8n credentials (optional)
- Grafana admin password (optional)

---

#### `setup-secrets.bat` (Windows)
**Purpose:** Windows equivalent of setup-secrets.sh for local development or Windows servers.

**Usage:**
```cmd
scripts\setup-secrets.bat
```

**What it does:**
- Same functionality as the Linux version
- Uses Windows-compatible commands
- Auto-generates passwords using %RANDOM%
- Creates all necessary secret files

**Note:** For production on Linux/Proxmox, use the .sh version for better security.

## Using the Scripts

### First-Time Setup

1. **On Linux/Mac (Proxmox container):**
   ```bash
   cd /opt/gestion-actividad
   chmod +x scripts/setup-secrets.sh
   ./scripts/setup-secrets.sh
   ```

2. **On Windows (development):**
   ```cmd
   cd E:\PROJECTES\GESTION-ACTV-CLAUDE
   scripts\setup-secrets.bat
   ```

### What Gets Created

After running either script, you'll have:

```
secrets/
├── .gitkeep                    (tracked in git)
├── db_password.txt             (SQL Server password)
├── redis_password.txt          (Redis authentication)
├── jwt_secret.txt              (JWT signing key)
├── session_secret.txt          (Session encryption)
├── azure_client_id.txt         (Azure AD Client ID)
├── azure_client_secret.txt     (Azure AD Client Secret)
├── azure_tenant_id.txt         (Azure AD Tenant ID)
├── n8n_api_key.txt            (n8n API key - optional)
├── n8n_webhook_secret.txt     (n8n webhook secret - optional)
└── grafana_admin_password.txt  (Grafana password - optional)
```

### Security Best Practices

1. **Never commit secrets to git**
   - The `secrets/` directory is in `.gitignore`
   - Only `.gitkeep` file is tracked

2. **Protect secret files**
   - Linux: Files created with 600 permissions (owner read/write only)
   - Directory created with 700 permissions (owner access only)

3. **Backup secrets securely**
   ```bash
   # Create encrypted backup
   tar -czf secrets-backup.tar.gz secrets/
   gpg -c secrets-backup.tar.gz
   rm secrets-backup.tar.gz
   # Store secrets-backup.tar.gz.gpg securely
   ```

4. **Rotate secrets regularly**
   - Change passwords every 90 days
   - Update Azure AD secrets if compromised
   - Regenerate JWT/Session secrets periodically

### Re-running the Scripts

The scripts are idempotent - they won't overwrite existing secrets:
- If a secret file already exists, it's skipped
- Only missing secrets are created
- Safe to re-run if interrupted

To force recreation of a specific secret:
```bash
# Remove the secret file
rm secrets/jwt_secret.txt

# Re-run the script
./scripts/setup-secrets.sh
```

## Adding Custom Scripts

When adding new scripts to this directory:

1. **Make executable:**
   ```bash
   chmod +x scripts/your-script.sh
   ```

2. **Add shebang:**
   ```bash
   #!/bin/bash
   ```

3. **Use set -e for safety:**
   ```bash
   #!/bin/bash
   set -e  # Exit on error
   ```

4. **Document in this README**

## Troubleshooting

### "Permission denied" error
```bash
chmod +x scripts/setup-secrets.sh
```

### Secrets directory not created
```bash
# Manually create with correct permissions
mkdir -p secrets
chmod 700 secrets
```

### Auto-generation not working
If `openssl` is not available for auto-generating passwords:
```bash
# Install openssl
apt install openssl  # Debian/Ubuntu
yum install openssl  # RHEL/CentOS
```

Or manually provide passwords when prompted.

### Lost secrets
If you lose the secrets files and need to recreate:

1. **Database password**: Get from your DBA or database configuration
2. **Azure AD**: Can be retrieved/regenerated from Azure Portal
3. **Generated secrets (Redis, JWT, Session)**: Generate new ones
   ```bash
   openssl rand -base64 32
   ```
4. **Warning**: Changing JWT/Session secrets will log out all users

## Related Documentation

- [PROXMOX-DEPLOYMENT.md](../PROXMOX-DEPLOYMENT.md) - Complete deployment guide
- [QUICK-START.md](../QUICK-START.md) - Quick deployment reference
- [DEPLOYMENT-CHECKLIST.md](../DEPLOYMENT-CHECKLIST.md) - Deployment checklist

## Support

If you encounter issues with these scripts:
1. Check file permissions
2. Verify you have required tools installed (bash, openssl)
3. Review the script output for error messages
4. Check the deployment documentation
