#!/bin/bash

# Production Environment Setup Script for Gestión de Actividad Laboral
# This script sets up the production environment with proper secrets and configurations

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to generate secure password
generate_password() {
    local length=${1:-32}
    openssl rand -base64 $length | tr -d "\n"
}

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
    print_success "Docker is running"
}

# Function to check if Docker Compose is available
check_docker_compose() {
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        print_error "Docker Compose is not available. Please install Docker Compose and try again."
        exit 1
    fi
    print_success "Docker Compose is available"
}

# Function to create secrets directory
create_secrets_directory() {
    print_status "Creating secrets directory..."
    mkdir -p ./secrets
    chmod 700 ./secrets
    print_success "Secrets directory created"
}

# Function to generate secrets
generate_secrets() {
    print_status "Generating production secrets..."

    # Generate database password
    if [ ! -f "./secrets/db_sa_password.txt" ]; then
        generate_password 32 > ./secrets/db_sa_password.txt
        print_success "Database password generated"
    else
        print_warning "Database password already exists, skipping"
    fi

    # Generate Redis password
    if [ ! -f "./secrets/redis_password.txt" ]; then
        generate_password 32 > ./secrets/redis_password.txt
        print_success "Redis password generated"
    else
        print_warning "Redis password already exists, skipping"
    fi

    # Generate JWT secret
    if [ ! -f "./secrets/jwt_secret.txt" ]; then
        generate_password 64 > ./secrets/jwt_secret.txt
        print_success "JWT secret generated"
    else
        print_warning "JWT secret already exists, skipping"
    fi

    # Generate session secret
    if [ ! -f "./secrets/session_secret.txt" ]; then
        generate_password 64 > ./secrets/session_secret.txt
        print_success "Session secret generated"
    else
        print_warning "Session secret already exists, skipping"
    fi

    # Generate Grafana admin password
    if [ ! -f "./secrets/grafana_admin_password.txt" ]; then
        generate_password 24 > ./secrets/grafana_admin_password.txt
        print_success "Grafana admin password generated"
    else
        print_warning "Grafana admin password already exists, skipping"
    fi

    # Set proper permissions on secrets
    chmod 600 ./secrets/*.txt
    print_success "Secret file permissions set"
}

# Function to create SSL directory
create_ssl_directory() {
    print_status "Creating SSL directory..."
    mkdir -p ./ssl
    chmod 700 ./ssl

    # Create self-signed certificate for development
    if [ ! -f "./ssl/cert.pem" ] || [ ! -f "./ssl/key.pem" ]; then
        print_status "Generating self-signed SSL certificate for development..."
        openssl req -x509 -newkey rsa:4096 -keyout ./ssl/key.pem -out ./ssl/cert.pem -days 365 -nodes \
            -subj "/C=ES/ST=Madrid/L=Madrid/O=Gestion Actividad/OU=IT Department/CN=localhost"
        chmod 600 ./ssl/*.pem
        print_success "Self-signed SSL certificate generated"
        print_warning "Replace with proper SSL certificates for production use"
    else
        print_warning "SSL certificates already exist, skipping"
    fi
}

# Function to create production environment file
create_production_env() {
    print_status "Creating production environment configuration..."

    # Create production .env file
    cat > .env.production << EOF
# Production Environment Configuration
# Generated on $(date)

# Application
NODE_ENV=production
COMPOSE_PROJECT_NAME=gestion-actividad-prod

# Database
DB_HOST=database
DB_PORT=1433
DB_USERNAME=sa
DB_NAME=gestion_actividad
DB_SYNCHRONIZE=false
DB_LOGGING=false

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_DB=0

# Frontend
FRONTEND_URL=http://localhost:8080

# API Configuration
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
HEALTH_CHECK_TIMEOUT=5000

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# Monitoring
METRICS_ENABLED=true

# Security
SESSION_MAX_AGE=3600000

# Timezone
TZ=Europe/Madrid
EOF

    print_success "Production environment file created"
}

# Function to validate configuration
validate_configuration() {
    print_status "Validating configuration..."

    # Check if all required secret files exist
    required_secrets=("db_sa_password.txt" "redis_password.txt" "jwt_secret.txt" "session_secret.txt" "grafana_admin_password.txt")

    for secret in "${required_secrets[@]}"; do
        if [ ! -f "./secrets/$secret" ]; then
            print_error "Missing required secret file: $secret"
            exit 1
        fi
    done

    print_success "All required secrets are present"

    # Validate docker-compose.yml
    if ! docker-compose -f docker-compose.yml config > /dev/null 2>&1; then
        print_error "Invalid docker-compose.yml configuration"
        exit 1
    fi

    print_success "Docker Compose configuration is valid"
}

# Function to build images
build_images() {
    print_status "Building Docker images..."

    docker-compose build --no-cache

    print_success "Docker images built successfully"
}

# Function to start services
start_services() {
    local profile=${1:-""}

    print_status "Starting production services..."

    if [ -n "$profile" ]; then
        docker-compose --profile "$profile" up -d
    else
        docker-compose up -d
    fi

    print_success "Services started"

    # Wait for services to be healthy
    print_status "Waiting for services to be healthy..."
    sleep 30

    # Check service health
    check_service_health
}

# Function to check service health
check_service_health() {
    print_status "Checking service health..."

    services=("database" "redis" "backend" "frontend")

    for service in "${services[@]}"; do
        if docker-compose ps -q "$service" > /dev/null 2>&1; then
            if [ "$(docker-compose ps -q "$service" | xargs docker inspect --format '{{.State.Health.Status}}')" == "healthy" ]; then
                print_success "$service is healthy"
            else
                print_warning "$service is not healthy yet"
            fi
        else
            print_warning "$service is not running"
        fi
    done
}

# Function to display connection information
display_connection_info() {
    print_status "Production environment setup complete!"
    echo ""
    echo "=== Connection Information ==="
    echo "Frontend:     http://localhost:8080"
    echo "Backend API:  http://localhost:3000"
    echo "Prometheus:   http://localhost:9090 (with --profile monitoring)"
    echo "Grafana:      http://localhost:3001 (with --profile monitoring)"
    echo ""
    echo "=== Credentials ==="
    echo "Database SA password: $(cat ./secrets/db_sa_password.txt)"
    echo "Grafana admin password: $(cat ./secrets/grafana_admin_password.txt)"
    echo ""
    echo "=== Useful Commands ==="
    echo "View logs:           docker-compose logs -f"
    echo "Stop services:       docker-compose down"
    echo "Start with monitoring: docker-compose --profile monitoring up -d"
    echo "Restart service:     docker-compose restart <service_name>"
    echo ""
    print_warning "Remember to replace self-signed certificates with proper SSL certificates for production!"
}

# Main execution
main() {
    print_status "Setting up production environment for Gestión de Actividad Laboral"
    echo ""

    check_docker
    check_docker_compose
    create_secrets_directory
    generate_secrets
    create_ssl_directory
    create_production_env
    validate_configuration

    # Ask user if they want to build and start services
    read -p "Do you want to build and start the services now? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        build_images

        # Ask if user wants monitoring
        read -p "Do you want to start with monitoring stack (Prometheus, Grafana)? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            start_services "monitoring"
        else
            start_services
        fi

        display_connection_info
    else
        print_status "Environment configured. Run 'docker-compose up -d' to start services."
    fi
}

# Run main function
main "$@"