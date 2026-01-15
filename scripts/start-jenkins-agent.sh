#!/bin/bash

# Agent Connection Script
# This script helps you start a Jenkins agent after creating it in Jenkins UI
# Supports both Docker (default) and Java direct methods

set -e

AGENT_NAME=$1
AGENT_SECRET=$2
METHOD=${3:-docker}  # docker or java

if [ -z "$AGENT_NAME" ] || [ -z "$AGENT_SECRET" ]; then
    echo "Usage: $0 <agent-name> <agent-secret> [method]"
    echo ""
    echo "Arguments:"
    echo "  agent-name    : Name of the agent (e.g., build-agent)"
    echo "  agent-secret  : Secret from Jenkins UI"
    echo "  method        : 'docker' (default) or 'java'"
    echo ""
    echo "Examples:"
    echo "  # Using Docker (recommended)"
    echo "  $0 build-agent abc123def456..."
    echo ""
    echo "  # Using Java directly"
    echo "  $0 build-agent abc123def456... java"
    echo ""
    echo "Get the secret from Jenkins UI:"
    echo "  Manage Jenkins > Manage Nodes > Click on node"
    echo "  Copy the command or secret shown"
    exit 1
fi

# Determine agent configuration based on name
case $AGENT_NAME in
    build-agent)
        LABELS="build docker lint node"
        PRIVILEGED="--privileged"
        DOCKER_SOCKET="-v /var/run/docker.sock:/var/run/docker.sock -v /usr/bin/docker:/usr/bin/docker"
        ;;
    test-agent)
        LABELS="test unit-test node"
        PRIVILEGED=""
        DOCKER_SOCKET=""
        ;;
    e2e-agent)
        LABELS="e2e docker playwright testing"
        PRIVILEGED="--privileged"
        DOCKER_SOCKET="-v /var/run/docker.sock:/var/run/docker.sock -v /usr/bin/docker:/usr/bin/docker"
        ;;
    deploy-agent)
        LABELS="deploy docker aws production"
        PRIVILEGED="--privileged"
        DOCKER_SOCKET="-v /var/run/docker.sock:/var/run/docker.sock -v /usr/bin/docker:/usr/bin/docker"
        AWS_CREDS="-v $HOME/.aws:/root/.aws:ro"
        ;;
    *)
        echo "Unknown agent name: $AGENT_NAME"
        echo "Valid names: build-agent, test-agent, e2e-agent, deploy-agent"
        exit 1
        ;;
esac

JENKINS_URL=${JENKINS_URL:-http://jenkins:8080}
WORKDIR=${WORKDIR:-/home/jenkins/agent}

# Choose method
if [ "$METHOD" = "java" ]; then
    echo "🚀 Starting $AGENT_NAME using Java method..."
    echo "Labels: $LABELS"
    echo ""
    
    # Check if Java is installed
    if ! command -v java &> /dev/null; then
        echo "❌ Java is not installed!"
        echo "Install Java 11 or later, or use Docker method:"
        echo "  $0 $AGENT_NAME $AGENT_SECRET docker"
        exit 1
    fi
    
    # Create work directory
    mkdir -p "$WORKDIR"
    cd "$WORKDIR"
    
    # Download agent.jar if not exists
    if [ ! -f "agent.jar" ]; then
        echo "📥 Downloading agent.jar..."
        curl -sO http://localhost:8080/jnlpJars/agent.jar
    fi
    
    echo "🔗 Connecting to Jenkins..."
    echo "Press Ctrl+C to stop"
    echo ""
    
    # Run agent (will block)
    java -jar agent.jar \
        -url http://localhost:8080/ \
        -secret "$AGENT_SECRET" \
        -name "$AGENT_NAME" \
        -webSocket \
        -workDir "$WORKDIR"
        
elif [ "$METHOD" = "docker" ]; then
    echo "🐳 Starting $AGENT_NAME using Docker method..."
    echo "Labels: $LABELS"
    echo ""
    
    # Stop existing container if running
    docker stop jenkins-agent-${AGENT_NAME} 2>/dev/null || true
    docker rm jenkins-agent-${AGENT_NAME} 2>/dev/null || true

    # Start agent with WebSocket mode (more reliable)
    docker run -d \
        --name jenkins-agent-${AGENT_NAME} \
        --restart unless-stopped \
        --network club-management-system_jenkins-network \
        $PRIVILEGED \
        $DOCKER_SOCKET \
        ${AWS_CREDS:-} \
        jenkins/inbound-agent:latest-jdk17 \
        -url $JENKINS_URL \
        -secret $AGENT_SECRET \
        -name $AGENT_NAME \
        -workDir $WORKDIR \
        -webSocket

    echo ""
    echo "✅ Agent started with WebSocket protocol!"
    echo ""
    echo "📊 Check status:"
    echo "   docker ps | grep jenkins-agent-${AGENT_NAME}"
    echo ""
    echo "📋 View logs:"
    echo "   docker logs -f jenkins-agent-${AGENT_NAME}"
    echo ""
    echo "🌐 Verify in Jenkins UI:"
    echo "   http://localhost:8080/computer/$AGENT_NAME/"
    
else
    echo "❌ Invalid method: $METHOD"
    echo "Use 'docker' or 'java'"
    exit 1
fi
