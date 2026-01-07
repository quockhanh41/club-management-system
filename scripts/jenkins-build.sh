#!/bin/bash

# Jenkins Build Helper Script
# Utilities for building Docker images with proper tagging

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
REGISTRY="${DOCKER_REGISTRY:-localhost:5001}"
IMAGE_PREFIX="${IMAGE_PREFIX:-club-management}"
GIT_COMMIT=$(git rev-parse --short HEAD)
BUILD_NUMBER="${BUILD_NUMBER:-local}"
BUILD_TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ)

echo -e "${YELLOW}Build Configuration:${NC}"
echo "  Registry: ${REGISTRY}"
echo "  Image Prefix: ${IMAGE_PREFIX}"
echo "  Git Commit: ${GIT_COMMIT}"
echo "  Build Number: ${BUILD_NUMBER}"
echo "  Build Time: ${BUILD_TIME}"
echo ""

# Build all services
build_all() {
    echo -e "${GREEN}Building all services...${NC}"
    
    docker compose build \
        --build-arg GIT_COMMIT="${GIT_COMMIT}" \
        --build-arg BUILD_NUMBER="${BUILD_NUMBER}" \
        --build-arg BUILD_TIME="${BUILD_TIME}"
    
    echo -e "${GREEN}✅ All services built successfully${NC}"
}

# Tag and push images
tag_and_push() {
    local tag="${1:-${BUILD_NUMBER}-${GIT_COMMIT}}"
    local services=("auth" "club" "event" "notify" "image" "frontend")
    
    echo -e "${GREEN}Tagging and pushing images with tag: ${tag}${NC}"
    
    for service in "${services[@]}"; do
        local local_image="club-management-system-${service}:latest"
        local remote_image="${REGISTRY}/${IMAGE_PREFIX}-${service}:${tag}"
        
        echo "Processing ${service}..."
        
        # Tag
        docker tag "${local_image}" "${remote_image}"
        
        # Push
        docker push "${remote_image}"
        
        echo -e "${GREEN}✅ ${service} pushed as ${remote_image}${NC}"
    done
    
    echo -e "${GREEN}✅ All images tagged and pushed${NC}"
}

# Tag as latest
tag_latest() {
    local services=("auth" "club" "event" "notify" "image" "frontend")
    
    echo -e "${GREEN}Tagging images as latest...${NC}"
    
    for service in "${services[@]}"; do
        local local_image="club-management-system-${service}:latest"
        local remote_image="${REGISTRY}/${IMAGE_PREFIX}-${service}:latest"
        
        echo "Processing ${service}..."
        
        docker tag "${local_image}" "${remote_image}"
        docker push "${remote_image}"
        
        echo -e "${GREEN}✅ ${service} pushed as latest${NC}"
    done
    
    echo -e "${GREEN}✅ All images tagged as latest${NC}"
}

# Clean old images
clean_images() {
    echo -e "${YELLOW}Cleaning dangling images...${NC}"
    docker image prune -f
    echo -e "${GREEN}✅ Cleanup complete${NC}"
}

# Show image info
show_images() {
    echo -e "${YELLOW}Current images:${NC}"
    docker images | grep "club-management"
}

# Main
case "${1:-build}" in
    build)
        build_all
        ;;
    push)
        tag_and_push "$2"
        ;;
    latest)
        tag_latest
        ;;
    clean)
        clean_images
        ;;
    show)
        show_images
        ;;
    all)
        build_all
        tag_and_push "$2"
        ;;
    *)
        echo "Usage: $0 {build|push [tag]|latest|clean|show|all [tag]}"
        echo ""
        echo "Commands:"
        echo "  build         - Build all Docker images"
        echo "  push [tag]    - Tag and push images to registry"
        echo "  latest        - Tag and push images as latest"
        echo "  clean         - Remove dangling images"
        echo "  show          - Show current images"
        echo "  all [tag]     - Build, tag, and push"
        exit 1
        ;;
esac
