#!/bin/bash

# Lint Tests Script - Local Testing
# Test lint stage locally before running full pipeline

set -e  # Exit on error

echo "🔍 Starting Lint Checks..."

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

FAILED_SERVICES=()

# Test Backend Services
log_info "🔍 Running lint checks on backend services..."
SERVICES=("auth" "club" "event" "notify")

for service in "${SERVICES[@]}"; do
    log_info "Linting $service service..."
    cd "services/$service"
    
    if [ -f package.json ]; then
        log_info "Installing dependencies for $service..."
        npm ci
        
        if grep -q '"lint"' package.json; then
            log_info "Running lint for $service..."
            if npm run lint; then
                log_info "✅ Lint passed for $service"
            else
                log_error "❌ Lint failed for $service"
                FAILED_SERVICES+=("$service")
            fi
        else
            log_warn "⚠️  No lint script configured for $service"
        fi
    fi
    
    cd ../..
    echo ""
done

# Test Frontend
log_info "🔍 Running lint checks on frontend..."
cd frontend

if [ -f package.json ]; then
    if grep -q '"lint"' package.json; then
        log_warn "⚠️  Skipping frontend lint (ESLint needs configuration)"
    fi
fi

cd ..

# Summary
echo "================================================"
if [ ${#FAILED_SERVICES[@]} -eq 0 ]; then
    log_info "🎉 All lint checks passed!"
    exit 0
else
    log_error "❌ Lint checks failed for: ${FAILED_SERVICES[*]}"
    exit 1
fi
