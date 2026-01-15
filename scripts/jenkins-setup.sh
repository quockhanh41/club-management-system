#!/bin/bash

# Jenkins Setup Script
# This script helps initialize Jenkins with required plugins and configurations

set -e

echo "🚀 Setting up Jenkins for Club Management System..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
JENKINS_URL="${JENKINS_URL:-http://localhost:8080}"
JENKINS_HOME="${JENKINS_HOME:-/var/jenkins_home}"

echo -e "${YELLOW}Jenkins URL: ${JENKINS_URL}${NC}"

# Function to wait for Jenkins to be ready
wait_for_jenkins() {
    echo "⏳ Waiting for Jenkins to start..."
    local max_attempts=60
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -s -o /dev/null -w "%{http_code}" "${JENKINS_URL}/login" | grep -q "200\|403"; then
            echo -e "${GREEN}✅ Jenkins is ready!${NC}"
            return 0
        fi
        
        attempt=$((attempt + 1))
        echo "Attempt $attempt/$max_attempts..."
        sleep 5
    done
    
    echo -e "${RED}❌ Jenkins failed to start within expected time${NC}"
    return 1
}

# Start Jenkins using docker-compose
start_jenkins() {
    echo "🐳 Starting Jenkins with Docker Compose..."
    
    if [ ! -f "docker-compose.jenkins.yml" ]; then
        echo -e "${RED}❌ docker-compose.jenkins.yml not found!${NC}"
        exit 1
    fi
    
    # Create necessary directories
    mkdir -p nginx/ssl
    mkdir -p artifacts
    mkdir -p scripts
    
    # Start services
    docker-compose -f docker-compose.jenkins.yml up -d
    
    wait_for_jenkins
}

# Get initial admin password
get_admin_password() {
    echo "🔑 Getting initial admin password..."
    
    # Try to get password from Jenkins container
    local password=$(docker exec jenkins-controller cat /var/jenkins_home/secrets/initialAdminPassword 2>/dev/null || echo "")
    
    if [ -n "$password" ]; then
        echo -e "${GREEN}Initial Admin Password: ${password}${NC}"
        echo "Please use this password to complete the setup wizard at ${JENKINS_URL}"
    else
        echo -e "${YELLOW}⚠️  Could not retrieve admin password automatically.${NC}"
        echo "Please check Jenkins container logs or access it manually."
    fi
}

# Install Docker inside Jenkins container
install_docker_in_jenkins() {
    echo "🐳 Installing Docker CLI in Jenkins container..."
    
    docker exec -u root jenkins-controller bash -c '
        apt-get update && \
        apt-get install -y \
            apt-transport-https \
            ca-certificates \
            curl \
            gnupg \
            lsb-release && \
        curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg && \
        echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/debian $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null && \
        apt-get update && \
        apt-get install -y docker-ce-cli docker-compose-plugin && \
        (getent group docker || groupadd docker) && \
        usermod -aG docker jenkins
    '
    
    echo -e "${GREEN}✅ Docker CLI installed in Jenkins${NC}"
    echo -e "${YELLOW}ℹ️  Note: You may need to restart Jenkins for group changes to take effect${NC}"
}

# Install essential tools (jq, bc) in Jenkins container
install_essential_tools() {
    echo "🔧 Installing essential tools (jq, bc) in Jenkins container..."
    
    docker exec -u root jenkins-controller bash -c '
        apt-get update && \
        apt-get install -y jq bc
    '
    
    echo -e "${GREEN}✅ Essential tools (jq, bc) installed in Jenkins${NC}"
}

# Install Node.js in Jenkins container
install_nodejs_in_jenkins() {
    echo "📦 Installing Node.js in Jenkins container..."
    
    docker exec -u root jenkins-controller bash -c '
        curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
        apt-get install -y nodejs && \
        npm install -g npm@latest
    '
    
    echo -e "${GREEN}✅ Node.js installed in Jenkins${NC}"
}

# Install required Jenkins plugins
install_jenkins_plugins() {
    echo "🔌 Installing Jenkins plugins..."
    
    local plugins=(
        "git"
        "docker-workflow"
        "docker-plugin"
        "nodejs"
        "pipeline-stage-view"
        "blueocean"
        "github"
        "credentials-binding"
        "workflow-aggregator"
        "pipeline-utility-steps"
        "junit"
        "htmlpublisher"
        "ws-cleanup"
    )
    
    for plugin in "${plugins[@]}"; do
        echo "Installing plugin: $plugin"
        docker exec jenkins-controller jenkins-plugin-cli --plugins "$plugin" || true
    done
    
    echo -e "${GREEN}✅ Plugins installation queued${NC}"
    echo "⚠️  Please restart Jenkins to activate all plugins"
}

# Create Jenkins credentials
create_credentials() {
    echo "🔐 Credentials need to be configured manually in Jenkins UI:"
    echo "  1. Go to: ${JENKINS_URL}/credentials/"
    echo "  2. Add Docker Registry credentials (ID: docker-registry-credentials)"
    echo "  3. Add Docker Registry URL (ID: docker-registry-url)"
    echo "  4. Add any other required credentials (AWS, SSH keys, etc.)"
}

# Main execution
main() {
    echo "=================================="
    echo "Jenkins Setup for Club Management System"
    echo "=================================="
    echo ""
    
    case "${1:-start}" in
        start)
            start_jenkins
            get_admin_password
            echo ""
            echo "📝 Next steps:"
            echo "  1. Open ${JENKINS_URL} in your browser"
            echo "  2. Complete the setup wizard with the password shown above"
            echo "  3. Run: ./scripts/jenkins-setup.sh install-tools"
            echo "  4. Run: ./scripts/jenkins-setup.sh install-plugins"
            ;;
            
        install-tools)
            install_docker_in_jenkins
            install_nodejs_in_jenkins
            install_essential_tools
            echo ""
            echo -e "${GREEN}✅ Tools installed successfully${NC}"
            ;;
            
        install-plugins)
            install_jenkins_plugins
            echo ""
            echo "Please restart Jenkins:"
            echo "  docker-compose -f docker-compose.jenkins.yml restart jenkins"
            ;;
            
        credentials)
            create_credentials
            ;;
            
        stop)
            echo "🛑 Stopping Jenkins..."
            docker-compose -f docker-compose.jenkins.yml down
            echo -e "${GREEN}✅ Jenkins stopped${NC}"
            ;;
            
        restart)
            echo "🔄 Restarting Jenkins..."
            docker-compose -f docker-compose.jenkins.yml restart
            wait_for_jenkins
            echo -e "${GREEN}✅ Jenkins restarted${NC}"
            ;;
            
        logs)
            docker-compose -f docker-compose.jenkins.yml logs -f jenkins
            ;;
            
        *)
            echo "Usage: $0 {start|install-tools|install-plugins|credentials|stop|restart|logs}"
            echo ""
            echo "Commands:"
            echo "  start           - Start Jenkins and get initial password"
            echo "  install-tools   - Install Docker and Node.js in Jenkins"
            echo "  install-plugins - Install required Jenkins plugins"
            echo "  credentials     - Show credentials setup instructions"
            echo "  stop            - Stop Jenkins"
            echo "  restart         - Restart Jenkins"
            echo "  logs            - View Jenkins logs"
            exit 1
            ;;
    esac
}

main "$@"
