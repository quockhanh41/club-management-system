# Jenkins Agent Docker Image Fix

## Problem
The Jenkins agents didn't have Docker installed, causing the pipeline to fail when trying to build images.

## Solution
Created a custom Jenkins agent image that includes:
- Docker CLI
- Docker Compose plugin
- Node.js 18.x
- npm and pnpm

## Setup Instructions

### 1. Build the custom Jenkins agent image
```bash
cd /Users/quockhanh/Documents/Code/club-management-system
docker compose -f docker-compose.jenkins.yml build jenkins-agent-build
```

### 2. Restart Jenkins with new agents
```bash
# Stop existing Jenkins setup
docker compose -f docker-compose.jenkins.yml down

# Start with new agent image
docker compose -f docker-compose.jenkins.yml up -d
```

### 3. Verify agents are connected
1. Open Jenkins UI: http://localhost:8080
2. Go to "Manage Jenkins" → "Manage Nodes and Clouds"
3. Verify all agents (build-agent, test-agent, e2e-agent, deploy-agent) are online
4. Each should show their labels (build, test, e2e, deploy, docker)

### 4. Run the pipeline
The pipeline should now successfully:
- Find docker binary at `/usr/bin/docker` inside the agent container
- Execute docker commands to build images
- Run tests and E2E tests

## Agent Configuration

### Agent Labels
- **build-agent**: labels `build docker` - for building code and images
- **test-agent**: labels `test` - for unit tests  
- **e2e-agent**: labels `e2e docker` - for E2E tests with Docker
- **deploy-agent**: labels `deploy docker` - for deployments

### Docker Access
All agents (except test-agent) have:
- Docker CLI installed in the container
- Docker socket mounted from host (`/var/run/docker.sock`)
- Privileged mode enabled
- Running as root user

## Files Modified
1. `jenkins-config/Dockerfile.jenkins-agent` - Custom agent image with Docker
2. `docker-compose.jenkins.yml` - Updated to build and use custom image
3. `jenkins-config/jenkins.yaml` - Added agent definitions with labels
4. `jenkins-config/DOCKER_FIX.md` - This file

## Troubleshooting

### If agents don't connect
Check agent secrets are set in environment:
```bash
# Make sure these are set before starting
export JENKINS_BUILD_AGENT_SECRET="your-secret"
export JENKINS_TEST_AGENT_SECRET="your-secret"
export JENKINS_E2E_AGENT_SECRET="your-secret"
export JENKINS_DEPLOY_AGENT_SECRET="your-secret"
```

### If docker commands still fail
Check inside the agent container:
```bash
docker exec -it jenkins-agent-build bash
docker --version
docker ps
ls -la /var/run/docker.sock
```

### If builds are slow
The first build will be slow as it needs to:
1. Build the custom Jenkins agent image (~2-3 minutes)
2. Pull base images for your services
3. Build all service images

Subsequent builds will be faster due to Docker layer caching.
