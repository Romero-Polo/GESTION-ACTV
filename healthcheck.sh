#!/bin/bash
# ===========================================
# Health Check Script for All Services
# ===========================================

set -e

echo "=========================================="
echo "Gestión de Actividad - Health Check"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check HTTP endpoint
check_http() {
    local name=$1
    local url=$2
    local expected_code=${3:-200}

    echo -n "Checking $name... "

    response=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")

    if [ "$response" = "$expected_code" ] || [ "$response" = "200" ]; then
        echo -e "${GREEN}OK${NC} (HTTP $response)"
        return 0
    else
        echo -e "${RED}FAILED${NC} (HTTP $response)"
        return 1
    fi
}

# Function to check container status
check_container() {
    local container=$1

    echo -n "Checking container $container... "

    if docker ps --filter "name=$container" --filter "status=running" | grep -q "$container"; then
        health=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "none")

        if [ "$health" = "healthy" ]; then
            echo -e "${GREEN}RUNNING (healthy)${NC}"
            return 0
        elif [ "$health" = "none" ]; then
            echo -e "${YELLOW}RUNNING (no healthcheck)${NC}"
            return 0
        else
            echo -e "${RED}RUNNING (unhealthy)${NC}"
            return 1
        fi
    else
        echo -e "${RED}NOT RUNNING${NC}"
        return 1
    fi
}

# Function to check database connectivity
check_database() {
    echo -n "Checking SQL Server connectivity... "

    if docker compose exec -T backend sh -c 'nc -zv $DB_HOST $DB_PORT' 2>&1 | grep -q "succeeded"; then
        echo -e "${GREEN}OK${NC}"
        return 0
    else
        echo -e "${RED}FAILED${NC}"
        return 1
    fi
}

# Initialize counters
total=0
passed=0

# Check containers
echo "Container Status:"
echo "----------------------------------------"

for container in gestion-backend gestion-frontend gestion-redis; do
    ((total++))
    if check_container "$container"; then
        ((passed++))
    fi
done

echo ""

# Check HTTP endpoints
echo "HTTP Endpoints:"
echo "----------------------------------------"

endpoints=(
    "Backend Health:http://localhost:3000/health"
    "Backend API:http://localhost:3000/api/health"
    "Frontend:http://localhost:8080/health-check"
)

for endpoint in "${endpoints[@]}"; do
    IFS=':' read -r name url <<< "$endpoint"
    ((total++))
    if check_http "$name" "$url"; then
        ((passed++))
    fi
done

echo ""

# Check external dependencies
echo "External Dependencies:"
echo "----------------------------------------"

((total++))
if check_database; then
    ((passed++))
fi

echo ""

# Summary
echo "=========================================="
echo "Summary: $passed/$total checks passed"
echo "=========================================="

if [ "$passed" -eq "$total" ]; then
    echo -e "${GREEN}All systems operational!${NC}"
    exit 0
elif [ "$passed" -gt $((total / 2)) ]; then
    echo -e "${YELLOW}Some issues detected.${NC}"
    exit 1
else
    echo -e "${RED}Critical failures detected!${NC}"
    exit 2
fi
