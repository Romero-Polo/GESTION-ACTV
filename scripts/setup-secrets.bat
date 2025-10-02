@echo off
REM ===========================================
REM Setup Production Secrets (Windows)
REM ===========================================
REM This script creates the secrets directory structure

echo ==========================================
echo Production Secrets Setup
echo ==========================================
echo.

REM Create secrets directory if it doesn't exist
if not exist "secrets" mkdir secrets

echo Creating secret files...
echo Please enter the following values:
echo.

REM Database password
set /p DB_PASSWORD="Enter SQL Server database password: "
echo %DB_PASSWORD%> secrets\db_password.txt

REM Redis password
set /p REDIS_PASSWORD="Enter Redis password (or press Enter to auto-generate): "
if "%REDIS_PASSWORD%"=="" set REDIS_PASSWORD=change-me-in-production-%RANDOM%%RANDOM%
echo %REDIS_PASSWORD%> secrets\redis_password.txt

REM JWT secret
set /p JWT_SECRET="Enter JWT secret (min 32 chars, or press Enter to auto-generate): "
if "%JWT_SECRET%"=="" set JWT_SECRET=jwt-secret-%RANDOM%%RANDOM%%RANDOM%%RANDOM%
echo %JWT_SECRET%> secrets\jwt_secret.txt

REM Session secret
set /p SESSION_SECRET="Enter session secret (min 32 chars, or press Enter to auto-generate): "
if "%SESSION_SECRET%"=="" set SESSION_SECRET=session-secret-%RANDOM%%RANDOM%%RANDOM%%RANDOM%
echo %SESSION_SECRET%> secrets\session_secret.txt

echo.
echo Azure Active Directory Configuration:
set /p AZURE_CLIENT_ID="Enter Azure AD Client ID: "
echo %AZURE_CLIENT_ID%> secrets\azure_client_id.txt

set /p AZURE_CLIENT_SECRET="Enter Azure AD Client Secret: "
echo %AZURE_CLIENT_SECRET%> secrets\azure_client_secret.txt

set /p AZURE_TENANT_ID="Enter Azure AD Tenant ID: "
echo %AZURE_TENANT_ID%> secrets\azure_tenant_id.txt

echo.
echo n8n Integration (optional - press Enter to skip):
set /p N8N_API_KEY="Enter n8n API key (optional): "
echo %N8N_API_KEY%> secrets\n8n_api_key.txt

set /p N8N_WEBHOOK_SECRET="Enter n8n webhook secret (optional): "
echo %N8N_WEBHOOK_SECRET%> secrets\n8n_webhook_secret.txt

echo.
echo Monitoring Configuration:
set /p GRAFANA_PASSWORD="Enter Grafana admin password (default: admin): "
if "%GRAFANA_PASSWORD%"=="" set GRAFANA_PASSWORD=admin
echo %GRAFANA_PASSWORD%> secrets\grafana_admin_password.txt

echo.
echo ==========================================
echo All secrets have been created!
echo ==========================================
echo.
echo Secret files are stored in: secrets\
echo.
echo IMPORTANT SECURITY NOTES:
echo 1. Never commit the secrets\ directory to version control
echo 2. Backup these files securely
echo 3. Restrict access to the secrets directory
echo 4. Change default passwords immediately
echo.
echo Next steps:
echo 1. Review and customize .env.production
echo 2. Run: docker-compose up -d
echo.
pause
