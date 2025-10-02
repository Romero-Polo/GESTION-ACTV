@echo off
setlocal enabledelayedexpansion

REM Production Environment Setup Script for Gestión de Actividad Laboral (Windows)
REM This script sets up the production environment with proper secrets and configurations

echo ============================================================
echo Production Environment Setup for Gestion de Actividad Laboral
echo ============================================================
echo.

REM Check if Docker is running
echo [INFO] Checking Docker...
docker info >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not running. Please start Docker and try again.
    pause
    exit /b 1
)
echo [SUCCESS] Docker is running

REM Check if Docker Compose is available
echo [INFO] Checking Docker Compose...
docker-compose --version >nul 2>&1
if errorlevel 1 (
    docker compose version >nul 2>&1
    if errorlevel 1 (
        echo [ERROR] Docker Compose is not available. Please install Docker Compose and try again.
        pause
        exit /b 1
    )
)
echo [SUCCESS] Docker Compose is available

REM Create secrets directory
echo [INFO] Creating secrets directory...
if not exist "secrets" mkdir secrets
echo [SUCCESS] Secrets directory created

REM Generate secrets if they don't exist
echo [INFO] Generating production secrets...

if not exist "secrets\db_sa_password.txt" (
    powershell -Command "([System.Web.Security.Membership]::GeneratePassword(32,8)) | Out-File -FilePath 'secrets\db_sa_password.txt' -Encoding ascii -NoNewline"
    echo [SUCCESS] Database password generated
) else (
    echo [WARNING] Database password already exists, skipping
)

if not exist "secrets\redis_password.txt" (
    powershell -Command "([System.Web.Security.Membership]::GeneratePassword(32,8)) | Out-File -FilePath 'secrets\redis_password.txt' -Encoding ascii -NoNewline"
    echo [SUCCESS] Redis password generated
) else (
    echo [WARNING] Redis password already exists, skipping
)

if not exist "secrets\jwt_secret.txt" (
    powershell -Command "([System.Web.Security.Membership]::GeneratePassword(64,16)) | Out-File -FilePath 'secrets\jwt_secret.txt' -Encoding ascii -NoNewline"
    echo [SUCCESS] JWT secret generated
) else (
    echo [WARNING] JWT secret already exists, skipping
)

if not exist "secrets\session_secret.txt" (
    powershell -Command "([System.Web.Security.Membership]::GeneratePassword(64,16)) | Out-File -FilePath 'secrets\session_secret.txt' -Encoding ascii -NoNewline"
    echo [SUCCESS] Session secret generated
) else (
    echo [WARNING] Session secret already exists, skipping
)

if not exist "secrets\grafana_admin_password.txt" (
    powershell -Command "([System.Web.Security.Membership]::GeneratePassword(24,6)) | Out-File -FilePath 'secrets\grafana_admin_password.txt' -Encoding ascii -NoNewline"
    echo [SUCCESS] Grafana admin password generated
) else (
    echo [WARNING] Grafana admin password already exists, skipping
)

REM Create SSL directory
echo [INFO] Creating SSL directory...
if not exist "ssl" mkdir ssl

REM Generate self-signed certificate if it doesn't exist
if not exist "ssl\cert.pem" (
    echo [INFO] Generating self-signed SSL certificate for development...
    powershell -Command "$cert = New-SelfSignedCertificate -DnsName 'localhost' -CertStoreLocation 'cert:\CurrentUser\My' -KeyUsage DigitalSignature,KeyEncipherment -KeyAlgorithm RSA -KeyLength 2048 -Provider 'Microsoft RSA SChannel Cryptographic Provider' -HashAlgorithm SHA256 -NotAfter (Get-Date).AddYears(1); $certPath = 'ssl\cert.pem'; $keyPath = 'ssl\key.pem'; $certBytes = $cert.Export('Cert'); $certPem = '-----BEGIN CERTIFICATE-----' + [Environment]::NewLine + [Convert]::ToBase64String($certBytes, 'InsertLineBreaks') + [Environment]::NewLine + '-----END CERTIFICATE-----'; $certPem | Out-File -FilePath $certPath -Encoding ascii; $keyBytes = $cert.PrivateKey.ExportPkcs8PrivateKey(); $keyPem = '-----BEGIN PRIVATE KEY-----' + [Environment]::NewLine + [Convert]::ToBase64String($keyBytes, 'InsertLineBreaks') + [Environment]::NewLine + '-----END PRIVATE KEY-----'; $keyPem | Out-File -FilePath $keyPath -Encoding ascii"
    echo [SUCCESS] Self-signed SSL certificate generated
    echo [WARNING] Replace with proper SSL certificates for production use
) else (
    echo [WARNING] SSL certificates already exist, skipping
)

REM Create production environment file
echo [INFO] Creating production environment configuration...
(
echo # Production Environment Configuration
echo # Generated on %date% %time%
echo.
echo # Application
echo NODE_ENV=production
echo COMPOSE_PROJECT_NAME=gestion-actividad-prod
echo.
echo # Database
echo DB_HOST=database
echo DB_PORT=1433
echo DB_USERNAME=sa
echo DB_NAME=gestion_actividad
echo DB_SYNCHRONIZE=false
echo DB_LOGGING=false
echo.
echo # Redis
echo REDIS_HOST=redis
echo REDIS_PORT=6379
echo REDIS_DB=0
echo.
echo # Frontend
echo FRONTEND_URL=http://localhost:8080
echo.
echo # API Configuration
echo RATE_LIMIT_WINDOW_MS=900000
echo RATE_LIMIT_MAX_REQUESTS=100
echo HEALTH_CHECK_TIMEOUT=5000
echo.
echo # Logging
echo LOG_LEVEL=info
echo LOG_FORMAT=json
echo.
echo # Monitoring
echo METRICS_ENABLED=true
echo.
echo # Security
echo SESSION_MAX_AGE=3600000
echo.
echo # Timezone
echo TZ=Europe/Madrid
) > .env.production

echo [SUCCESS] Production environment file created

REM Validate Docker Compose configuration
echo [INFO] Validating configuration...
docker-compose -f docker-compose.yml config >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Invalid docker-compose.yml configuration
    pause
    exit /b 1
)
echo [SUCCESS] Docker Compose configuration is valid

REM Ask user if they want to build and start services
set /p "build_choice=Do you want to build and start the services now? (y/N): "
if /i "!build_choice!"=="y" (
    echo [INFO] Building Docker images...
    docker-compose build --no-cache
    if errorlevel 1 (
        echo [ERROR] Failed to build Docker images
        pause
        exit /b 1
    )
    echo [SUCCESS] Docker images built successfully

    set /p "monitoring_choice=Do you want to start with monitoring stack (Prometheus, Grafana)? (y/N): "
    if /i "!monitoring_choice!"=="y" (
        echo [INFO] Starting production services with monitoring...
        docker-compose --profile monitoring up -d
    ) else (
        echo [INFO] Starting production services...
        docker-compose up -d
    )

    if errorlevel 1 (
        echo [ERROR] Failed to start services
        pause
        exit /b 1
    )

    echo [SUCCESS] Services started

    echo.
    echo ============================================================
    echo Production environment setup complete!
    echo ============================================================
    echo.
    echo === Connection Information ===
    echo Frontend:     http://localhost:8080
    echo Backend API:  http://localhost:3000
    if /i "!monitoring_choice!"=="y" (
        echo Prometheus:   http://localhost:9090
        echo Grafana:      http://localhost:3001
    )
    echo.
    echo === Credentials ===
    for /f "usebackq delims=" %%i in ("secrets\db_sa_password.txt") do set "db_password=%%i"
    for /f "usebackq delims=" %%i in ("secrets\grafana_admin_password.txt") do set "grafana_password=%%i"
    echo Database SA password: !db_password!
    echo Grafana admin password: !grafana_password!
    echo.
    echo === Useful Commands ===
    echo View logs:           docker-compose logs -f
    echo Stop services:       docker-compose down
    echo Start with monitoring: docker-compose --profile monitoring up -d
    echo Restart service:     docker-compose restart ^<service_name^>
    echo.
    echo [WARNING] Remember to replace self-signed certificates with proper SSL certificates for production!
) else (
    echo [INFO] Environment configured. Run 'docker-compose up -d' to start services.
)

echo.
echo Setup complete. Press any key to exit...
pause >nul