# Makefile for Gestión de Actividad Laboral
# Simplifies common Docker operations

.PHONY: help setup build up down restart logs clean backup

# Default target
help:
	@echo "Available commands:"
	@echo "  make setup      - Set up secrets and environment"
	@echo "  make build      - Build Docker images"
	@echo "  make up         - Start all services"
	@echo "  make down       - Stop all services"
	@echo "  make restart    - Restart all services"
	@echo "  make logs       - View logs (all services)"
	@echo "  make logs-f     - Follow logs in real-time"
	@echo "  make clean      - Remove containers, volumes, and images"
	@echo "  make backup     - Create backup of data"
	@echo "  make shell-backend  - Open shell in backend container"
	@echo "  make shell-frontend - Open shell in frontend container"
	@echo "  make health     - Check health of all services"
	@echo "  make monitoring - Start with monitoring stack"

# Setup secrets and directories
setup:
	@echo "Setting up production environment..."
	@chmod +x scripts/setup-secrets.sh
	@./scripts/setup-secrets.sh
	@mkdir -p data/redis logs/{backend,frontend,proxy} uploads
	@echo "Setup complete!"

# Build all images
build:
	@echo "Building Docker images..."
	docker compose build --no-cache
	@echo "Build complete!"

# Start services
up:
	@echo "Starting services..."
	docker compose up -d
	@echo "Services started!"
	@make health

# Start with monitoring
monitoring:
	@echo "Starting services with monitoring..."
	docker compose --profile monitoring up -d
	@echo "Services started with monitoring!"

# Stop services
down:
	@echo "Stopping services..."
	docker compose down
	@echo "Services stopped!"

# Restart services
restart:
	@echo "Restarting services..."
	docker compose restart
	@echo "Services restarted!"

# View logs
logs:
	docker compose logs --tail=100

# Follow logs
logs-f:
	docker compose logs -f

# View backend logs
logs-backend:
	docker compose logs -f backend

# View frontend logs
logs-frontend:
	docker compose logs -f frontend

# Clean up
clean:
	@echo "WARNING: This will remove all containers, volumes, and images!"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker compose down -v --rmi all; \
		echo "Cleanup complete!"; \
	fi

# Backup data
backup:
	@echo "Creating backup..."
	@mkdir -p backups
	@TIMESTAMP=$$(date +%Y%m%d_%H%M%S); \
	docker compose exec -T redis redis-cli SAVE; \
	tar -czf backups/backup_$$TIMESTAMP.tar.gz data/ logs/ uploads/ secrets/; \
	echo "Backup created: backups/backup_$$TIMESTAMP.tar.gz"

# Open backend shell
shell-backend:
	docker compose exec backend sh

# Open frontend shell
shell-frontend:
	docker compose exec frontend sh

# Check health
health:
	@echo "Checking service health..."
	@docker compose ps
	@echo ""
	@echo "Backend health:"
	@curl -s http://localhost:3000/health || echo "Backend not responding"
	@echo ""
	@echo "Frontend health:"
	@curl -s http://localhost:8080/health-check || echo "Frontend not responding"

# Update and restart
update:
	@echo "Updating application..."
	git pull
	docker compose build
	docker compose up -d
	@make health
	@echo "Update complete!"

# Production deploy
deploy:
	@echo "Deploying to production..."
	docker compose -f docker-compose.yml -f docker-compose.prod.yml build
	docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
	@make health
	@echo "Production deployment complete!"
