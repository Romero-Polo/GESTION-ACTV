#!/bin/bash

# Deployment Script for Gestión de Actividad Laboral
# This script handles building and deploying both backend and frontend

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="gestion-actividad-laboral"
BACKEND_PORT=${BACKEND_PORT:-3000}
FRONTEND_PORT=${FRONTEND_PORT:-5173}
NODE_ENV=${NODE_ENV:-production}

echo -e "${BLUE}🚀 Starting deployment for ${PROJECT_NAME}${NC}"
echo -e "${BLUE}Environment: ${NODE_ENV}${NC}"

# Function to print status
print_status() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Check if node_modules exist and install dependencies if needed
check_and_install_deps() {
    local dir=$1
    local name=$2

    echo -e "${BLUE}📦 Checking dependencies for ${name}...${NC}"

    if [ ! -d "$dir/node_modules" ]; then
        echo -e "${YELLOW}Installing dependencies for ${name}...${NC}"
        cd "$dir"
        npm ci --production=false
        cd ..
        print_status "Dependencies installed for ${name}"
    else
        print_status "Dependencies already exist for ${name}"
    fi
}

# Build backend
build_backend() {
    echo -e "${BLUE}🏗️ Building backend...${NC}"
    cd backend

    # Install dependencies
    check_and_install_deps "." "backend"

    # Run TypeScript compilation
    npm run build

    # Check if build was successful
    if [ -d "dist" ]; then
        print_status "Backend build completed successfully"
    else
        print_error "Backend build failed"
        exit 1
    fi

    cd ..
}

# Build frontend
build_frontend() {
    echo -e "${BLUE}🏗️ Building frontend...${NC}"
    cd frontend

    # Install dependencies
    check_and_install_deps "." "frontend"

    # Run build
    npm run build

    # Check if build was successful
    if [ -d "dist" ]; then
        print_status "Frontend build completed successfully"
    else
        print_error "Frontend build failed"
        exit 1
    fi

    cd ..
}

# Run tests
run_tests() {
    if [ "$SKIP_TESTS" = "true" ]; then
        print_warning "Skipping tests (SKIP_TESTS=true)"
        return
    fi

    echo -e "${BLUE}🧪 Running tests...${NC}"

    # Backend tests
    cd backend
    if npm test; then
        print_status "Backend tests passed"
    else
        print_error "Backend tests failed"
        exit 1
    fi
    cd ..

    # Frontend tests
    cd frontend
    if npm test -- --watchAll=false; then
        print_status "Frontend tests passed"
    else
        print_error "Frontend tests failed"
        exit 1
    fi
    cd ..
}

# Database migration
run_migrations() {
    echo -e "${BLUE}🗃️ Running database migrations...${NC}"
    cd backend

    if npm run migration:run; then
        print_status "Database migrations completed"
    else
        print_error "Database migrations failed"
        exit 1
    fi

    cd ..
}

# Start services in production mode
start_services() {
    echo -e "${BLUE}🚀 Starting services...${NC}"

    # Check if PM2 is installed
    if ! command -v pm2 &> /dev/null; then
        print_warning "PM2 not found. Installing PM2..."
        npm install -g pm2
    fi

    # Start backend with PM2
    cd backend
    pm2 start dist/index.js --name "${PROJECT_NAME}-backend" --env production || pm2 restart "${PROJECT_NAME}-backend"
    cd ..

    print_status "Backend started with PM2"

    # For frontend in production, files should be served by a web server (Nginx, Apache)
    print_warning "Frontend build is in frontend/dist/ - serve these files with your web server"
    print_status "Deployment completed successfully!"
}

# Health check
health_check() {
    echo -e "${BLUE}🏥 Running health check...${NC}"

    # Wait a moment for services to start
    sleep 5

    # Check backend health
    if curl -f "http://localhost:${BACKEND_PORT}/health" > /dev/null 2>&1; then
        print_status "Backend health check passed"
    else
        print_error "Backend health check failed"
        exit 1
    fi
}

# Clean up old builds
cleanup() {
    echo -e "${BLUE}🧹 Cleaning up old builds...${NC}"

    # Clean backend dist
    if [ -d "backend/dist" ]; then
        rm -rf backend/dist
        print_status "Cleaned backend dist directory"
    fi

    # Clean frontend dist
    if [ -d "frontend/dist" ]; then
        rm -rf frontend/dist
        print_status "Cleaned frontend dist directory"
    fi
}

# Main deployment process
main() {
    echo -e "${BLUE}================================================${NC}"
    echo -e "${BLUE}🎯 Gestión de Actividad Laboral - Deployment${NC}"
    echo -e "${BLUE}================================================${NC}"

    # Check if we're in the right directory
    if [ ! -f "package.json" ] || [ ! -d "backend" ] || [ ! -d "frontend" ]; then
        print_error "Please run this script from the project root directory"
        exit 1
    fi

    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-tests)
                export SKIP_TESTS=true
                shift
                ;;
            --skip-cleanup)
                export SKIP_CLEANUP=true
                shift
                ;;
            --build-only)
                export BUILD_ONLY=true
                shift
                ;;
            --help)
                echo "Usage: $0 [OPTIONS]"
                echo "Options:"
                echo "  --skip-tests     Skip running tests"
                echo "  --skip-cleanup   Skip cleaning old builds"
                echo "  --build-only     Only build, don't start services"
                echo "  --help           Show this help message"
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                echo "Use --help for usage information"
                exit 1
                ;;
        esac
    done

    # Cleanup old builds
    if [ "$SKIP_CLEANUP" != "true" ]; then
        cleanup
    fi

    # Run tests
    if [ "$NODE_ENV" = "production" ]; then
        run_tests
    else
        print_warning "Skipping tests in non-production environment"
    fi

    # Build applications
    build_backend
    build_frontend

    # Run database migrations
    if [ "$NODE_ENV" = "production" ]; then
        run_migrations
    else
        print_warning "Skipping migrations in non-production environment"
    fi

    # Start services (unless build-only)
    if [ "$BUILD_ONLY" != "true" ]; then
        start_services
        health_check
    else
        print_status "Build completed successfully (services not started due to --build-only flag)"
    fi

    echo -e "${GREEN}================================================${NC}"
    echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
    echo -e "${GREEN}================================================${NC}"

    if [ "$BUILD_ONLY" != "true" ]; then
        echo -e "${BLUE}📋 Service Status:${NC}"
        pm2 list | grep "${PROJECT_NAME}"
        echo ""
        echo -e "${BLUE}🔗 URLs:${NC}"
        echo -e "Backend API: http://localhost:${BACKEND_PORT}"
        echo -e "API Documentation: http://localhost:${BACKEND_PORT}/api-docs"
        echo -e "Health Check: http://localhost:${BACKEND_PORT}/health"
        echo ""
        echo -e "${BLUE}📝 Next Steps:${NC}"
        echo -e "1. Configure your web server to serve frontend/dist/"
        echo -e "2. Set up SSL certificates for production"
        echo -e "3. Configure monitoring and backups"
        echo -e "4. Update DNS records to point to your server"
    fi
}

# Run main function
main "$@"