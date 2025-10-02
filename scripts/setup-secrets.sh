#!/bin/bash
# ===========================================
# Setup Production Secrets
# ===========================================
# This script creates the secrets directory structure
# and prompts for sensitive values

set -e

echo "=========================================="
echo "Production Secrets Setup"
echo "=========================================="
echo ""

# Create secrets directory if it doesn't exist
SECRETS_DIR="./secrets"
mkdir -p "$SECRETS_DIR"

# Secure the secrets directory
chmod 700 "$SECRETS_DIR"

# Function to create a secret file
create_secret() {
    local secret_name=$1
    local secret_file="$SECRETS_DIR/${secret_name}.txt"
    local prompt_message=$2
    local default_value=$3

    if [ -f "$secret_file" ]; then
        echo "✓ $secret_name already exists"
    else
        echo ""
        if [ -n "$default_value" ]; then
            read -p "$prompt_message [$default_value]: " secret_value
            secret_value=${secret_value:-$default_value}
        else
            read -sp "$prompt_message: " secret_value
            echo ""
        fi

        echo -n "$secret_value" > "$secret_file"
        chmod 600 "$secret_file"
        echo "✓ Created $secret_name"
    fi
}

echo "Creating secret files..."
echo "Note: Press Enter to use default values (if shown)"
echo ""

# Database password
create_secret "db_password" "Enter SQL Server database password" ""

# Redis password
create_secret "redis_password" "Enter Redis password (will be generated if empty)" "$(openssl rand -base64 32 2>/dev/null || echo 'change-me-in-production')"

# JWT secret
create_secret "jwt_secret" "Enter JWT secret (min 32 chars)" "$(openssl rand -base64 48 2>/dev/null || echo 'change-me-to-long-random-string-min-32-chars')"

# Session secret
create_secret "session_secret" "Enter session secret (min 32 chars)" "$(openssl rand -base64 48 2>/dev/null || echo 'change-me-to-long-random-string-min-32-chars')"

# Azure AD credentials
echo ""
echo "Azure Active Directory Configuration:"
create_secret "azure_client_id" "Enter Azure AD Client ID" ""
create_secret "azure_client_secret" "Enter Azure AD Client Secret" ""
create_secret "azure_tenant_id" "Enter Azure AD Tenant ID" ""

# n8n credentials (optional)
echo ""
echo "n8n Integration (optional - press Enter to skip):"
create_secret "n8n_api_key" "Enter n8n API key (optional)" ""
create_secret "n8n_webhook_secret" "Enter n8n webhook secret (optional)" "$(openssl rand -base64 32 2>/dev/null || echo '')"

# Grafana admin password (if using monitoring)
echo ""
echo "Monitoring Configuration (optional):"
create_secret "grafana_admin_password" "Enter Grafana admin password" "$(openssl rand -base64 24 2>/dev/null || echo 'admin')"

echo ""
echo "=========================================="
echo "✓ All secrets have been created!"
echo "=========================================="
echo ""
echo "Secret files are stored in: $SECRETS_DIR"
echo "These files are protected with 600 permissions"
echo ""
echo "IMPORTANT SECURITY NOTES:"
echo "1. Never commit the secrets/ directory to version control"
echo "2. Backup these files securely (encrypted)"
echo "3. Restrict access to the secrets directory"
echo "4. Change default passwords immediately"
echo ""
echo "Next steps:"
echo "1. Review and customize .env.production"
echo "2. Run: docker-compose up -d"
echo ""
