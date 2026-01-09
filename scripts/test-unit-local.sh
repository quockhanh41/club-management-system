#!/bin/bash

# Unit Tests Script - Local Testing
# Test unit tests stage locally before running full pipeline

set -e  # Exit on error

echo "🧪 Starting Unit Tests..."

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

# Create test results directory
mkdir -p test-results/unit

# Test each service
SERVICES=("auth" "club" "event" "notify")
FAILED_SERVICES=()

for service in "${SERVICES[@]}"; do
    log_info "Testing $service service..."
    cd "services/$service"
    
    if [ -f package.json ]; then
        log_info "Installing dependencies for $service..."
        npm ci
        
        if grep -q '"test"' package.json; then
            log_info "Running tests for $service..."
            if npm test; then
                log_info "✅ Tests passed for $service"
            else
                log_error "❌ Tests failed for $service"
                FAILED_SERVICES+=("$service")
            fi
        else
            log_warn "⚠️  No tests configured for $service"
        fi
    else
        log_warn "⚠️  No package.json found for $service"
    fi
    
    cd ../..
    echo ""
done

# Summary
echo "================================================"
if [ ${#FAILED_SERVICES[@]} -eq 0 ]; then
    log_info "🎉 All unit tests passed!"
    exit 0
else
    log_error "❌ Unit tests failed for: ${FAILED_SERVICES[*]}"
    exit 1
fi
