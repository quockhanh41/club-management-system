#!/bin/bash

# Script để chạy E2E tests local với config giống Jenkins CI/CD
# Sử dụng: ./scripts/e2e-local.sh [command]
# Commands:
#   setup   - Build và start tất cả services
#   test    - Chạy E2E tests
#   logs    - Xem logs của tất cả services
#   status  - Kiểm tra status của services
#   clean   - Dừng và xóa tất cả containers
#   restart - Clean và setup lại từ đầu

set -e  # Exit on error

COMPOSE_FILES="-f docker-compose.yml -f docker-compose.e2e.yml -f docker-compose.ci.yml"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo_info() {
    echo -e "${GREEN}ℹ️  $1${NC}"
}

echo_warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

echo_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function: Clean environment
clean() {
    echo_info "Dừng và xóa tất cả containers..."
    docker compose $COMPOSE_FILES down -v
    echo_info "Xóa hoàn tất!"
}

# Function: Build services
build() {
    echo_info "Building services với CI config..."
    docker compose -f docker-compose.yml -f docker-compose.ci.yml build --no-cache \
        frontend auth-service club-service event-service notify-service image-service
    echo_info "Build hoàn tất!"
}

# Function: Start infrastructure
start_infrastructure() {
    echo_info "Starting infrastructure (databases, rabbitmq)..."
    docker compose $COMPOSE_FILES up -d postgres mongo rabbitmq
    
    echo_info "Đợi databases ready..."
    sleep 20
    
    # Check if databases are healthy
    echo_info "Kiểm tra database health..."
    docker compose $COMPOSE_FILES ps postgres mongo rabbitmq
}

# Function: Start application services
start_services() {
    echo_info "Starting application services..."
    docker compose $COMPOSE_FILES up -d --no-build \
        auth-service club-service event-service notify-service image-service frontend kong
    
    echo_info "Đợi services khởi động..."
    sleep 30
    
    echo_info "Kiểm tra service status..."
    docker compose $COMPOSE_FILES ps
}

# Function: Test frontend connectivity
test_frontend() {
    echo_info "Testing frontend connectivity..."
    
    if curl -s http://localhost:3000/api/health > /dev/null; then
        echo_info "✅ Frontend /api/health responding!"
        curl http://localhost:3000/api/health | jq .
    else
        echo_error "❌ Frontend /api/health not responding!"
        echo_warn "Showing frontend logs:"
        docker compose $COMPOSE_FILES logs --tail=50 frontend
        return 1
    fi
}

# Function: Setup (build + start)
setup() {
    clean
    build
    start_infrastructure
    start_services
    test_frontend
    
    echo_info ""
    echo_info "=========================================="
    echo_info "✅ E2E environment ready!"
    echo_info "Chạy tests với: ./scripts/e2e-local.sh test"
    echo_info "Xem logs với: ./scripts/e2e-local.sh logs"
    echo_info "=========================================="
}

# Function: Run E2E tests
run_tests() {
    echo_info "Chạy Playwright E2E tests..."
    npx playwright test "$@"
}

# Function: Show logs
show_logs() {
    if [ -z "$1" ]; then
        echo_info "Showing logs của tất cả services..."
        docker compose $COMPOSE_FILES logs -f
    else
        echo_info "Showing logs của $1..."
        docker compose $COMPOSE_FILES logs -f "$1"
    fi
}

# Function: Show status
show_status() {
    echo_info "Service status:"
    docker compose $COMPOSE_FILES ps
    
    echo ""
    echo_info "Testing connectivity:"
    echo -n "Frontend /api/health: "
    if curl -s http://localhost:3000/api/health > /dev/null; then
        echo_info "✅ OK"
    else
        echo_error "❌ FAILED"
    fi
    
    echo -n "Kong API Gateway: "
    if curl -s http://localhost:8000 > /dev/null 2>&1; then
        echo_info "✅ OK"
    else
        echo_error "❌ FAILED"
    fi
}

# Main script logic
case "${1:-help}" in
    setup)
        setup
        ;;
    test)
        shift
        run_tests "$@"
        ;;
    logs)
        shift
        show_logs "$@"
        ;;
    status)
        show_status
        ;;
    clean)
        clean
        ;;
    restart)
        setup
        ;;
    help|*)
        echo "E2E Local Testing Script"
        echo ""
        echo "Usage: ./scripts/e2e-local.sh [command]"
        echo ""
        echo "Commands:"
        echo "  setup      - Build và start tất cả services (clean + build + start)"
        echo "  test       - Chạy E2E tests (có thể thêm args cho Playwright)"
        echo "  logs       - Xem logs (thêm tên service để xem log cụ thể)"
        echo "  status     - Kiểm tra status và connectivity"
        echo "  clean      - Dừng và xóa tất cả containers"
        echo "  restart    - Clean và setup lại từ đầu"
        echo "  help       - Hiển thị hướng dẫn này"
        echo ""
        echo "Examples:"
        echo "  ./scripts/e2e-local.sh setup              # Setup environment"
        echo "  ./scripts/e2e-local.sh test               # Run all E2E tests"
        echo "  ./scripts/e2e-local.sh test auth.spec.ts  # Run specific test"
        echo "  ./scripts/e2e-local.sh logs frontend      # View frontend logs"
        echo "  ./scripts/e2e-local.sh status             # Check status"
        ;;
esac
