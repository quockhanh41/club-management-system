#!/bin/bash

# E2E Test Script - Local Testing
# This script mirrors the E2E Tests stage in Jenkinsfile
# Use this to test E2E flow locally before committing to CI/CD pipeline

set -e  # Exit on error

echo "🎭 Starting E2E Test Setup..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Cleanup function
cleanup() {
    log_info "🧹 Cleaning up containers and volumes..."
    docker compose -f docker-compose.yml -f docker-compose.e2e.yml -f docker-compose.ci.yml down -v 2>/dev/null || true
}

# Register cleanup on script exit
trap cleanup EXIT

# Step 1: Build images with CI configuration
log_info "🐳 Building Docker images with CI configuration..."
docker compose -f docker-compose.yml -f docker-compose.ci.yml build \
    --build-arg GIT_COMMIT=$(git rev-parse --short HEAD) \
    --build-arg BUILD_NUMBER=local \
    --build-arg BUILD_TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ) \
    auth-service club-service event-service notify-service image-service frontend

# Step 2: Create required directories
log_info "📁 Creating test directories..."
mkdir -p artifacts test-results logs playwright-report

# Step 3: Start infrastructure services
log_info "🗄️  Starting infrastructure services (postgres, mongodb, rabbitmq)..."
docker compose -f docker-compose.yml -f docker-compose.e2e.yml -f docker-compose.ci.yml up -d postgres mongo rabbitmq

# Step 4: Wait for databases to be healthy
log_info "⏳ Waiting for databases to be ready..."
for i in $(seq 1 60); do
    if docker compose -f docker-compose.yml -f docker-compose.e2e.yml -f docker-compose.ci.yml ps postgres mongo rabbitmq | grep -E "(unhealthy|starting)" > /dev/null 2>&1; then
        echo "   Databases still starting... (attempt $i/60)"
        sleep 5
    else
        log_info "✅ Databases are healthy!"
        break
    fi
    
    if [ $i -eq 60 ]; then
        log_error "❌ Databases failed to become healthy"
        docker compose -f docker-compose.yml -f docker-compose.e2e.yml -f docker-compose.ci.yml ps
        docker compose -f docker-compose.yml -f docker-compose.e2e.yml -f docker-compose.ci.yml logs postgres mongo rabbitmq
        exit 1
    fi
done

# Step 5: Start application services
log_info "🚀 Starting application services..."
docker compose -f docker-compose.yml -f docker-compose.e2e.yml -f docker-compose.ci.yml up -d \
    auth-service club-service event-service notify-service image-service frontend

# Step 6: Wait for application services to be healthy
log_info "⏳ Waiting for application services to be healthy..."
sleep 30

for i in $(seq 1 60); do
    if docker compose -f docker-compose.yml -f docker-compose.e2e.yml -f docker-compose.ci.yml ps | grep -E "(unhealthy|starting)" > /dev/null 2>&1; then
        echo "   Services still starting... (attempt $i/60)"
        sleep 10
    else
        log_info "✅ All services are healthy!"
        break
    fi
    
    if [ $i -eq 60 ]; then
        log_error "❌ Services failed to become healthy within 10 minutes"
        docker compose -f docker-compose.yml -f docker-compose.e2e.yml -f docker-compose.ci.yml ps
        docker compose -f docker-compose.yml -f docker-compose.e2e.yml -f docker-compose.ci.yml logs
        exit 1
    fi
done

# Step 7: Show service status
log_info "📊 Service Status:"
docker compose -f docker-compose.yml -f docker-compose.e2e.yml -f docker-compose.ci.yml ps

# Step 8: Run Playwright E2E tests
log_info "🎭 Running Playwright E2E tests..."
if npx playwright test --reporter=html,junit; then
    log_info "✅ E2E tests passed!"
    
    # Show report location
    log_info "📊 Test report available at: file://$(pwd)/playwright-report/index.html"
    
    # Open report in browser (optional - comment out if not needed)
    if command -v open &> /dev/null; then
        log_info "🌐 Opening test report in browser..."
        open playwright-report/index.html
    fi
else
    log_error "❌ E2E tests failed!"
    
    # Collect service logs
    log_info "📝 Collecting service logs..."
    docker compose -f docker-compose.yml -f docker-compose.e2e.yml -f docker-compose.ci.yml logs > logs/services.log 2>&1
    log_warn "Service logs saved to: logs/services.log"
    
    # Show last 50 lines of logs
    log_warn "Last 50 lines of service logs:"
    tail -n 50 logs/services.log
    
    exit 1
fi

log_info "🎉 E2E test run completed successfully!"
