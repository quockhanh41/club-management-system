#!/bin/bash

# Jenkins Deploy Helper Script
# Deploy services to different environments

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
ENVIRONMENT="${1:-dev}"
IMAGE_TAG="${2:-latest}"
REGISTRY="${DOCKER_REGISTRY:-localhost:5001}"
IMAGE_PREFIX="${IMAGE_PREFIX:-club-management}"

echo -e "${YELLOW}Deployment Configuration:${NC}"
echo "  Environment: ${ENVIRONMENT}"
echo "  Image Tag: ${IMAGE_TAG}"
echo "  Registry: ${REGISTRY}"
echo ""

# Validate environment
validate_environment() {
    case "${ENVIRONMENT}" in
        dev|staging|production)
            echo -e "${GREEN}✅ Valid environment: ${ENVIRONMENT}${NC}"
            ;;
        *)
            echo -e "${RED}❌ Invalid environment: ${ENVIRONMENT}${NC}"
            echo "Valid environments: dev, staging, production"
            exit 1
            ;;
    esac
}

# Deploy using docker-compose (for dev/staging)
deploy_docker_compose() {
    local host="${1}"
    
    echo -e "${GREEN}Deploying to ${ENVIRONMENT} using docker-compose...${NC}"
    
    # Set environment-specific variables
    export IMAGE_TAG="${IMAGE_TAG}"
    export DOCKER_REGISTRY="${REGISTRY}"
    
    if [ -n "${host}" ]; then
        # Remote deployment
        echo "Deploying to remote host: ${host}"
        
        ssh "${host}" "cd /app/club-management-system && \
            docker-compose pull && \
            docker-compose up -d && \
            docker-compose ps"
    else
        # Local deployment
        docker-compose pull
        docker-compose up -d
        docker-compose ps
    fi
    
    echo -e "${GREEN}✅ Deployment complete${NC}"
}

# Deploy using Kubernetes
deploy_kubernetes() {
    local namespace="${ENVIRONMENT}"
    
    echo -e "${GREEN}Deploying to ${ENVIRONMENT} using Kubernetes...${NC}"
    
    # Update image tags in deployments
    local services=("auth" "club" "event" "notify" "image" "frontend")
    
    for service in "${services[@]}"; do
        local image="${REGISTRY}/${IMAGE_PREFIX}-${service}:${IMAGE_TAG}"
        
        echo "Updating ${service} to ${image}..."
        
        kubectl set image deployment/${service}-service \
            ${service}=${image} \
            -n ${namespace}
        
        # Wait for rollout
        kubectl rollout status deployment/${service}-service -n ${namespace}
    done
    
    echo -e "${GREEN}✅ Kubernetes deployment complete${NC}"
}

# Deploy using AWS ECS
deploy_ecs() {
    local cluster="${ENVIRONMENT}-cluster"
    
    echo -e "${GREEN}Deploying to ${ENVIRONMENT} using AWS ECS...${NC}"
    
    local services=("auth" "club" "event" "notify" "image" "frontend")
    
    for service in "${services[@]}"; do
        echo "Updating ${service} service..."
        
        aws ecs update-service \
            --cluster ${cluster} \
            --service ${service}-service \
            --force-new-deployment \
            --region us-east-1
    done
    
    echo -e "${GREEN}✅ ECS deployment complete${NC}"
}

# Health check
health_check() {
    local base_url="${1:-http://localhost}"
    
    echo -e "${YELLOW}Running health checks...${NC}"
    
    local endpoints=(
        "/health"
        "/api/auth/health"
        "/api/clubs/health"
        "/api/events/health"
    )
    
    for endpoint in "${endpoints[@]}"; do
        local url="${base_url}${endpoint}"
        echo "Checking ${url}..."
        
        if curl -f -s -o /dev/null "${url}"; then
            echo -e "${GREEN}✅ ${endpoint} - OK${NC}"
        else
            echo -e "${RED}❌ ${endpoint} - FAILED${NC}"
        fi
    done
}

# Rollback
rollback() {
    echo -e "${YELLOW}Rolling back ${ENVIRONMENT} deployment...${NC}"
    
    case "${DEPLOYMENT_METHOD}" in
        k8s)
            local services=("auth" "club" "event" "notify" "image" "frontend")
            for service in "${services[@]}"; do
                kubectl rollout undo deployment/${service}-service -n ${ENVIRONMENT}
            done
            ;;
        ecs)
            echo "ECS rollback not implemented yet"
            ;;
        docker-compose)
            echo "Docker-compose rollback not implemented yet"
            ;;
    esac
    
    echo -e "${GREEN}✅ Rollback complete${NC}"
}

# Main
validate_environment

case "${ENVIRONMENT}" in
    dev)
        # Development deployment
        DEPLOYMENT_METHOD="${DEPLOYMENT_METHOD:-docker-compose}"
        
        if [ "${DEPLOYMENT_METHOD}" == "docker-compose" ]; then
            deploy_docker_compose ""
        fi
        
        health_check "http://localhost:3000"
        ;;
        
    staging)
        # Staging deployment
        DEPLOYMENT_METHOD="${DEPLOYMENT_METHOD:-k8s}"
        STAGING_HOST="${STAGING_HOST:-staging.example.com}"
        
        if [ "${DEPLOYMENT_METHOD}" == "k8s" ]; then
            deploy_kubernetes
            health_check "https://${STAGING_HOST}"
        elif [ "${DEPLOYMENT_METHOD}" == "docker-compose" ]; then
            deploy_docker_compose "user@${STAGING_HOST}"
            health_check "https://${STAGING_HOST}"
        fi
        ;;
        
    production)
        # Production deployment
        DEPLOYMENT_METHOD="${DEPLOYMENT_METHOD:-ecs}"
        PROD_HOST="${PROD_HOST:-prod.example.com}"
        
        # Confirmation prompt
        echo -e "${RED}⚠️  WARNING: You are about to deploy to PRODUCTION!${NC}"
        read -p "Are you sure? (yes/no): " confirm
        
        if [ "${confirm}" != "yes" ]; then
            echo "Deployment cancelled."
            exit 0
        fi
        
        if [ "${DEPLOYMENT_METHOD}" == "ecs" ]; then
            deploy_ecs
            health_check "https://${PROD_HOST}"
        elif [ "${DEPLOYMENT_METHOD}" == "k8s" ]; then
            deploy_kubernetes
            health_check "https://${PROD_HOST}"
        fi
        ;;
esac

echo ""
echo -e "${GREEN}🚀 Deployment to ${ENVIRONMENT} completed successfully!${NC}"
