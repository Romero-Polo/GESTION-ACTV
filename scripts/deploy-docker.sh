#!/bin/bash

# Docker Deployment Script for Gestión de Actividad Laboral
# This script handles Docker-based deployment with proper environment setup

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
PROJECT_NAME="gestion-actividad-laboral"
DOCKER_COMPOSE_FILE="docker-compose.yml"

print_status() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    print_info "Checking prerequisites..."

    # Check Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi

    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi

    # Check if we're in the right directory
    if [ ! -f "$DOCKER_COMPOSE_FILE" ]; then
        print_error "docker-compose.yml not found. Please run this script from the project root directory."
        exit 1
    fi

    print_status "Prerequisites check passed"
}

# Create required directories
create_directories() {
    print_info "Creating required directories..."

    # Create SSL directory if it doesn't exist
    mkdir -p ssl
    mkdir -p backend/logs
    mkdir -p monitoring

    # Create a basic monitoring configuration
    if [ ! -f "monitoring/prometheus.yml" ]; then
        cat > monitoring/prometheus.yml << EOF
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'gestion-backend'
    static_configs:
      - targets: ['backend:3000']
    metrics_path: '/api/metrics/prometheus'
    scrape_interval: 30s
EOF
    fi

    print_status "Directories created"
}

# Generate SSL certificates (self-signed for development)
generate_ssl_certificates() {
    if [ "$GENERATE_SSL" = "true" ]; then
        print_info "Generating self-signed SSL certificates..."

        if [ ! -f "ssl/cert.pem" ] || [ ! -f "ssl/key.pem" ]; then
            openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
                -keyout ssl/key.pem \
                -out ssl/cert.pem \
                -subj "/C=ES/ST=Madrid/L=Madrid/O=GestionActividad/CN=localhost"

            print_status "SSL certificates generated"
            print_warning "These are self-signed certificates. Use proper certificates in production."
        else
            print_status "SSL certificates already exist"
        fi
    fi
}

# Build and start services
start_services() {
    print_info "Building and starting Docker services..."

    # Build and start services
    if command -v docker-compose &> /dev/null; then
        docker-compose down --remove-orphans
        docker-compose build --no-cache
        docker-compose up -d
    else
        docker compose down --remove-orphans
        docker compose build --no-cache
        docker compose up -d
    fi

    print_status "Services started successfully"
}

# Start with monitoring
start_with_monitoring() {
    print_info "Starting services with monitoring..."

    if command -v docker-compose &> /dev/null; then
        docker-compose --profile monitoring up -d
    else
        docker compose --profile monitoring up -d
    fi

    print_status "Services with monitoring started successfully"
}

# Wait for services to be healthy
wait_for_services() {
    print_info "Waiting for services to be healthy..."

    # Wait for database
    print_info "Waiting for database to be ready..."
    timeout=60
    while [ $timeout -gt 0 ]; do
        if docker exec gestion-db /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P YourStrongPassword123! -Q "SELECT 1" &> /dev/null; then
            print_status "Database is ready"
            break
        fi
        sleep 2
        timeout=$((timeout - 2))
    done

    if [ $timeout -le 0 ]; then
        print_error "Database failed to start within timeout"
        exit 1
    fi

    # Wait for backend
    print_info "Waiting for backend to be ready..."
    timeout=90
    while [ $timeout -gt 0 ]; do
        if curl -f http://localhost:3000/health &> /dev/null; then
            print_status "Backend is ready"
            break
        fi
        sleep 3
        timeout=$((timeout - 3))
    done

    if [ $timeout -le 0 ]; then
        print_error "Backend failed to start within timeout"
        exit 1
    fi

    # Wait for frontend
    print_info "Waiting for frontend to be ready..."
    timeout=30
    while [ $timeout -gt 0 ]; do
        if curl -f http://localhost/ &> /dev/null; then
            print_status "Frontend is ready"
            break
        fi
        sleep 2
        timeout=$((timeout - 2))
    done

    if [ $timeout -le 0 ]; then
        print_error "Frontend failed to start within timeout"
        exit 1
    fi
}

# Show service status
show_status() {
    print_info "Service Status:"
    echo ""

    if command -v docker-compose &> /dev/null; then
        docker-compose ps
    else
        docker compose ps
    fi

    echo ""
    print_info "Service URLs:"
    echo -e "Frontend: ${GREEN}http://localhost/${NC}"
    echo -e "Backend API: ${GREEN}http://localhost:3000${NC}"
    echo -e "API Documentation: ${GREEN}http://localhost:3000/api-docs${NC}"
    echo -e "Health Check: ${GREEN}http://localhost:3000/health${NC}"

    if docker ps | grep -q gestion-monitoring; then
        echo -e "Monitoring: ${GREEN}http://localhost:9090${NC}"
    fi
}

# Stop services
stop_services() {
    print_info "Stopping services..."

    if command -v docker-compose &> /dev/null; then
        docker-compose down
    else
        docker compose down
    fi

    print_status "Services stopped"
}

# Clean up everything
cleanup() {
    print_info "Cleaning up Docker resources..."

    if command -v docker-compose &> /dev/null; then
        docker-compose down --volumes --remove-orphans
    else
        docker compose down --volumes --remove-orphans
    fi

    # Remove images
    docker images | grep "$PROJECT_NAME" | awk '{print $3}' | xargs -r docker rmi

    print_status "Cleanup completed"
}

# Show logs
show_logs() {
    local service=$1
    if [ -z "$service" ]; then
        if command -v docker-compose &> /dev/null; then
            docker-compose logs -f
        else
            docker compose logs -f
        fi
    else
        if command -v docker-compose &> /dev/null; then
            docker-compose logs -f "$service"
        else
            docker compose logs -f "$service"
        fi
    fi
}

# Show help
show_help() {
    echo "Docker Deployment Script for Gestión de Actividad Laboral"
    echo ""
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  start          Start all services (default)"
    echo "  start-monitor  Start with monitoring enabled"
    echo "  stop           Stop all services"
    echo "  restart        Restart all services"
    echo "  cleanup        Stop services and remove volumes/images"
    echo "  status         Show service status"
    echo "  logs [service] Show logs (all services or specific service)"
    echo "  help           Show this help message"
    echo ""
    echo "Options:"
    echo "  --generate-ssl Generate self-signed SSL certificates"
    echo ""
    echo "Examples:"
    echo "  $0 start --generate-ssl"
    echo "  $0 logs backend"
    echo "  $0 start-monitor"
}

# Main function
main() {
    local command=${1:-start}

    # Parse options
    while [[ $# -gt 0 ]]; do
        case $1 in
            --generate-ssl)
                export GENERATE_SSL=true
                shift
                ;;
            help|--help|-h)
                show_help
                exit 0
                ;;
            *)
                if [[ $1 != start* ]] && [[ $1 != stop ]] && [[ $1 != restart ]] && [[ $1 != cleanup ]] && [[ $1 != status ]] && [[ $1 != logs ]]; then
                    if [[ $1 == -* ]]; then
                        shift
                        continue
                    fi
                fi
                command=$1
                shift
                ;;
        esac
    done

    echo -e "${BLUE}============================================${NC}"
    echo -e "${BLUE}🐳 Docker Deployment - Gestión Actividad${NC}"
    echo -e "${BLUE}============================================${NC}"

    case $command in
        start)
            check_prerequisites
            create_directories
            generate_ssl_certificates
            start_services
            wait_for_services
            show_status
            ;;
        start-monitor)
            check_prerequisites
            create_directories
            generate_ssl_certificates
            start_with_monitoring
            wait_for_services
            show_status
            ;;
        stop)
            stop_services
            ;;
        restart)
            stop_services
            sleep 2
            start_services
            wait_for_services
            show_status
            ;;
        cleanup)
            cleanup
            ;;
        status)
            show_status
            ;;
        logs)
            show_logs "$2"
            ;;
        *)
            print_error "Unknown command: $command"
            show_help
            exit 1
            ;;
    esac

    if [[ $command == start* ]]; then
        echo ""
        echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
        echo -e "${BLUE}📝 Next Steps:${NC}"
        echo -e "1. Access the application at http://localhost"
        echo -e "2. Check the API documentation at http://localhost:3000/api-docs"
        echo -e "3. Configure Azure AD settings in environment variables"
        echo -e "4. Set up proper SSL certificates for production"
        echo ""
        echo -e "${YELLOW}💡 Tips:${NC}"
        echo -e "- Run '$0 logs' to view all service logs"
        echo -e "- Run '$0 logs backend' to view only backend logs"
        echo -e "- Run '$0 status' to check service health"
        echo -e "- Run '$0 stop' to stop all services"
    fi
}

# Run main function
main "$@"