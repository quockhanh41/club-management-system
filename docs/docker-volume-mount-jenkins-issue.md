# Docker Volume Mount Issue in Jenkins E2E Pipeline

## 📋 Overview

This document explains the Docker volume mount conflict that occurs when running E2E tests in a Jenkins pipeline where the Jenkins agent itself runs inside a Docker container (Docker-in-Docker scenario).

---

## 🚨 Problem Statement

### Error Message
```
Error response from daemon: mounts denied: 
The path /home/jenkins/agent/workspace/club-management-pipeline/test-results is not shared from the host and is not known to Docker.
You can configure shared paths from Docker -> Preferences... -> Resources -> File Sharing.
```

### When Does This Occur?
- ✅ Works: Running `docker compose` on local machine or directly on host
- ❌ Fails: Running `docker compose` from within a Jenkins agent container

---

## 🔍 Root Cause Analysis

### Architecture Breakdown

#### Current Setup (Problematic)
```
┌─────────────────────────────────────────┐
│         Host Machine / Server           │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │     Docker Daemon (Host)          │ │
│  └───────────────────────────────────┘ │
│           ↓                             │
│  ┌───────────────────────────────────┐ │
│  │   Jenkins Agent Container         │ │
│  │                                   │ │
│  │  Path: /home/jenkins/agent/       │ │
│  │        workspace/                 │ │
│  │        club-management-pipeline/  │ │
│  │                                   │ │
│  │  Runs: docker compose run         │ │
│  │        with volume mount:         │ │
│  │        ./test-results:/app/...    │ │
│  └───────────────────────────────────┘ │
│           ↓ ❌ MOUNT FAILS              │
│  ┌───────────────────────────────────┐ │
│  │   E2E Runner Container            │ │
│  │   (Cannot mount from Jenkins      │ │
│  │    agent's internal filesystem)   │ │
│  └───────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### Why It Fails

1. **Jenkins Agent Container** has internal filesystem at `/home/jenkins/agent/workspace/...`
2. **Jenkins Agent** executes `docker compose` command
3. **Docker Compose** tries to create volume mount: `./test-results:/app/test-results`
4. **Docker Daemon (on host)** resolves `./test-results` to `/home/jenkins/agent/workspace/.../test-results`
5. **Host Docker Daemon** cannot access this path because it's **inside another container**, not on the host filesystem
6. **Mount fails** with "path is not shared from the host"

### Key Insight

> **Docker daemon can only mount paths that exist on the HOST filesystem, not paths inside other containers.**

When you run `docker` commands from inside a container (Docker-in-Docker), the daemon runs on the **host**, but paths are relative to the **container** executing the command.

---

## ✅ Solutions

### Solution 1: Docker Copy Pattern (Recommended)

**Approach**: Don't use volume mounts. Copy files after container finishes.

#### Implementation Steps

**Modify Jenkinsfile:**

```groovy
// Remove volume mounts from docker-compose.e2e-runner.yml
// Run container with a specific name
sh '''
    CONTAINER_NAME="e2e-runner-${BUILD_NUMBER}"
    
    # Run tests in container (no volume mounts)
    docker compose -f docker-compose.yml \\
                   -f docker-compose.e2e.yml \\
                   -f docker-compose.ci.yml \\
                   -f docker-compose.e2e-runner.yml \\
        run --name ${CONTAINER_NAME} --rm e2e-runner \\
        npx playwright test ${TEST_FILTER} || EXIT_CODE=$?
    
    # Note: --rm cannot be used if we want to copy files after
    # So run without --rm and clean up manually
    
    # Copy results from container to workspace
    docker cp ${CONTAINER_NAME}:/app/test-results ./test-results || true
    docker cp ${CONTAINER_NAME}:/app/playwright-report ./playwright-report || true
    
    # Clean up container
    docker rm -f ${CONTAINER_NAME} || true
    
    # Exit with test exit code
    exit ${EXIT_CODE:-0}
'''
```

**Update docker-compose.e2e-runner.yml:**

```yaml
services:
  e2e-runner:
    build:
      context: .
      dockerfile: Dockerfile.e2e
    networks:
      - club_network
    environment:
      - CI=true
      - BASE_URL=http://frontend:3000
      - API_GATEWAY_URL=http://kong:8000
      - NEXT_PUBLIC_API_BASE_URL=http://kong:8000
      - API_GATEWAY_SECRET=test-secret-e2e
    # NO VOLUMES - Files will be copied using docker cp
    depends_on:
      frontend:
        condition: service_healthy
      kong:
        condition: service_healthy
      auth-service:
        condition: service_healthy
      club-service:
        condition: service_healthy
      event-service:
        condition: service_healthy
```

**Pros:**
- ✅ Simple and reliable
- ✅ Works in any Docker-in-Docker scenario
- ✅ No host filesystem dependency
- ✅ Easy to debug

**Cons:**
- ⚠️ Slight overhead from file copy (minimal for small result files)
- ⚠️ Cannot stream results in real-time (but we use `list` reporter for console output anyway)

---

### Solution 2: Docker Named Volume

**Approach**: Use Docker named volume instead of bind mount.

#### Implementation Steps

**Create named volume in Jenkinsfile:**

```groovy
sh '''
    # Create named volume for test results
    docker volume create e2e-results-${BUILD_NUMBER}
    
    # Run tests with named volume
    docker compose -f docker-compose.yml \\
                   -f docker-compose.e2e.yml \\
                   -f docker-compose.ci.yml \\
        run --rm \\
        -v e2e-results-${BUILD_NUMBER}:/app/test-results \\
        e2e-runner npx playwright test ${TEST_FILTER}
    
    # Copy from named volume to workspace using helper container
    docker run --rm \\
        -v e2e-results-${BUILD_NUMBER}:/source \\
        -v "$(pwd)/test-results":/dest \\
        alpine sh -c "cp -r /source/* /dest/"
    
    # Clean up volume
    docker volume rm e2e-results-${BUILD_NUMBER}
'''
```

**Pros:**
- ✅ Docker-native solution
- ✅ Efficient for large files

**Cons:**
- ⚠️ More complex
- ⚠️ Still requires docker cp equivalent (via helper container)
- ⚠️ Volume cleanup required

---

### Solution 3: Host Workspace Mount (Advanced)

**Approach**: Mount host workspace directory into Jenkins agent, making it accessible to Docker daemon.

#### Implementation Steps

**When starting Jenkins agent:**

```bash
docker run -d \\
    -v /var/run/docker.sock:/var/run/docker.sock \\
    -v /path/on/host/jenkins-workspace:/home/jenkins/agent/workspace \\
    jenkins/agent:latest
```

**Pros:**
- ✅ Volume mounts work normally
- ✅ Real-time file access

**Cons:**
- ❌ Requires Jenkins agent configuration changes
- ❌ Host path dependency
- ❌ Security concerns (exposing host filesystem)
- ❌ Difficult to maintain across environments

---

### Solution 4: Sidecar Pattern

**Approach**: Run a separate container to collect and export results.

#### Implementation Steps

**Add sidecar service:**

```yaml
services:
  e2e-runner:
    # ... existing config
    
  results-collector:
    image: alpine
    volumes:
      - ./test-results:/results
    command: sleep infinity
    networks:
      - club_network
```

**In Jenkinsfile:**

```groovy
sh '''
    # Start results collector
    docker compose up -d results-collector
    
    # Run tests
    docker compose run --rm e2e-runner npx playwright test
    
    # Copy results via shared network volume (if possible)
    # Or use docker cp from e2e-runner to results-collector
'''
```

**Pros:**
- ✅ Separation of concerns

**Cons:**
- ❌ Complex setup
- ❌ Overkill for this use case

---

## 🎯 Recommended Solution: Docker Copy Pattern (Solution 1)

### Why This is the Best Choice

1. **Simplicity**: Minimal code changes, easy to understand
2. **Reliability**: Works in all Docker-in-Docker scenarios
3. **Maintainability**: No complex volume or networking configuration
4. **Performance**: File copy overhead is negligible for result files (JSON, XML, HTML)
5. **Debugging**: Easy to inspect intermediate container state if needed

### Implementation Plan

1. **Remove volume mounts** from `docker-compose.e2e-runner.yml`
2. **Update Jenkinsfile** to:
   - Run container without `--rm` (so it persists after exit)
   - Use `--name e2e-runner-${BUILD_NUMBER}` for unique container name
   - Capture exit code before copying files
   - Use `docker cp` to extract results
   - Clean up container manually
   - Exit with captured test exit code

3. **Verify** that threshold analysis works with copied files

---

## 🔧 Implementation Details

### Modified docker-compose.e2e-runner.yml

```yaml
services:
  e2e-runner:
    build:
      context: .
      dockerfile: Dockerfile.e2e
    networks:
      - club_network
    environment:
      - CI=true
      - BASE_URL=http://frontend:3000
      - API_GATEWAY_URL=http://kong:8000
      - NEXT_PUBLIC_API_BASE_URL=http://kong:8000
      - API_GATEWAY_SECRET=test-secret-e2e
    # Volumes removed - using docker cp instead
    depends_on:
      frontend:
        condition: service_healthy
      kong:
        condition: service_healthy
      auth-service:
        condition: service_healthy
      club-service:
        condition: service_healthy
      event-service:
        condition: service_healthy

networks:
  club_network:
    external: false
```

### Modified Jenkinsfile E2E Stage

```groovy
stage('E2E Tests') {
    agent {
        label 'e2e-agent'
    }
    steps {
        script {
            // ... existing setup code ...
            
            sh '''
                # Prepare test filter
                TEST_FILTER=""
                if [ -n "${E2E_TEST_FILTER}" ]; then
                    echo "🔍 Test filter enabled: ${E2E_TEST_FILTER}"
                    TEST_FILTER="--grep ${E2E_TEST_FILTER}"
                else
                    echo "▶️  Running all E2E tests"
                fi
                
                # Generate unique container name
                CONTAINER_NAME="e2e-runner-${BUILD_NUMBER}"
                
                echo "🚀 Running E2E tests in container: ${CONTAINER_NAME}"
                
                # Run tests in container (no --rm so we can copy files after)
                set +e
                docker compose -f docker-compose.yml \\
                               -f docker-compose.e2e.yml \\
                               -f docker-compose.ci.yml \\
                               -f docker-compose.e2e-runner.yml \\
                    run --name ${CONTAINER_NAME} \\
                    e2e-runner npx playwright test ${TEST_FILTER}
                
                TEST_EXIT_CODE=$?
                set -e
                
                echo "📦 Copying test results from container..."
                
                # Copy results from container to workspace
                docker cp ${CONTAINER_NAME}:/app/test-results ./test-results || echo "⚠️ Warning: Could not copy test-results"
                docker cp ${CONTAINER_NAME}:/app/playwright-report ./playwright-report || echo "⚠️ Warning: Could not copy playwright-report"
                
                # Clean up container
                echo "🧹 Cleaning up test container..."
                docker rm -f ${CONTAINER_NAME} || true
                
                # Debug: Check results
                echo "📁 Checking copied files..."
                ls -la test-results/ || echo "test-results directory not found"
                
                if [ -f "test-results/e2e-results.json" ]; then
                    echo "✅ JSON results file found"
                    echo "📄 JSON preview:"
                    head -30 test-results/e2e-results.json
                else
                    echo "❌ JSON results file NOT found"
                fi
                
                # Exit with test exit code
                exit ${TEST_EXIT_CODE}
            '''
        }
    }
    
    post {
        always {
            // ... existing threshold analysis code ...
        }
    }
}
```

---

## 📊 Performance Comparison

| Aspect | Volume Mount | Docker Copy | Named Volume | Host Mount |
|--------|-------------|-------------|--------------|------------|
| Setup Complexity | ⭐⭐ | ⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Reliability in Jenkins | ❌ | ✅ | ✅ | ⚠️ |
| File Copy Speed | Instant | ~100ms | ~200ms | Instant |
| Real-time Access | ✅ | ❌ | ❌ | ✅ |
| Security | ✅ | ✅ | ✅ | ⚠️ |
| Debugging | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ |

**Legend:**
- ⭐ = Complexity/Difficulty level (fewer stars = simpler)
- ✅ = Works well
- ❌ = Doesn't work
- ⚠️ = Works with caveats

---

## 🧪 Testing the Solution

### Local Testing (Before Jenkins)

```bash
# Test docker cp pattern locally
CONTAINER_NAME="test-e2e-local"

# Run container
docker compose -f docker-compose.yml \
               -f docker-compose.e2e.yml \
               -f docker-compose.ci.yml \
               -f docker-compose.e2e-runner.yml \
    run --name ${CONTAINER_NAME} \
    e2e-runner npx playwright test --grep "smoke"

# Copy results
docker cp ${CONTAINER_NAME}:/app/test-results ./test-results-copy

# Verify
ls -la test-results-copy/
cat test-results-copy/e2e-results.json | jq '.stats'

# Cleanup
docker rm -f ${CONTAINER_NAME}
```

### Jenkins Testing

1. Push changes to repository
2. Trigger Jenkins build
3. Check console output for:
   - "📦 Copying test results from container..."
   - "✅ JSON results file found"
   - Threshold analysis output
4. Verify HTML reports are published
5. Check junit results are recorded

---

## 🐛 Troubleshooting

### Issue: "docker: Error response from daemon: No such container"

**Cause**: Container exited before we could copy files.

**Solution**: Ensure container is created with a name and persists after exit (don't use `--rm`).

### Issue: "docker cp: no such directory"

**Cause**: Path doesn't exist in container.

**Solution**: 
- Check Dockerfile.e2e creates necessary directories
- Verify playwright.config.ts outputs to correct paths
- Add `|| true` to make copy optional

### Issue: "Permission denied" when copying files

**Cause**: User permissions mismatch between container and Jenkins agent.

**Solution**:
```bash
# Fix permissions after copy
docker cp ${CONTAINER_NAME}:/app/test-results ./test-results
chmod -R 755 ./test-results
```

### Issue: Exit code lost during copy operations

**Cause**: Script exits with last command's exit code.

**Solution**: Capture exit code before copy operations:
```bash
set +e
docker compose run --name ${CONTAINER_NAME} e2e-runner npx playwright test
TEST_EXIT_CODE=$?
set -e

# ... copy operations ...

exit ${TEST_EXIT_CODE}
```

---

## 📚 References

- [Docker Volume Documentation](https://docs.docker.com/storage/volumes/)
- [Docker CP Command](https://docs.docker.com/engine/reference/commandline/cp/)
- [Docker-in-Docker Considerations](https://jpetazzo.github.io/2015/09/03/do-not-use-docker-in-docker-for-ci/)
- [Jenkins Docker Pipeline](https://www.jenkins.io/doc/book/pipeline/docker/)

---

## ✅ Next Steps

1. **Implement Solution 1** (Docker Copy Pattern)
2. **Test locally** to verify file copy works
3. **Update Jenkins pipeline** and trigger test build
4. **Monitor** first build for any issues
5. **Document** any environment-specific adjustments needed

---

## 📝 Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-01-16 | Initial document creation | GitHub Copilot |
| 2026-01-16 | Added implementation details for Docker Copy Pattern | GitHub Copilot |

