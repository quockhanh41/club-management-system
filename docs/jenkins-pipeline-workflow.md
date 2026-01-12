# Jenkins Pipeline Workflow Documentation

## 📋 Mục lục

1. [Tổng quan](#tổng-quan)
2. [Kiến trúc Pipeline](#kiến-trúc-pipeline)
3. [Cấu hình và Parameters](#cấu-hình-và-parameters)
4. [Chi tiết các Stages](#chi-tiết-các-stages)
5. [E2E Testing Flow](#e2e-testing-flow)
6. [Troubleshooting](#troubleshooting)
7. [Best Practices](#best-practices)

---

## Tổng quan

Pipeline này là một CI/CD workflow hoàn chỉnh được thiết kế để:
- ✅ Build và test microservices architecture
- ✅ Chạy E2E tests với Docker infrastructure
- ✅ Implement flexible failure thresholds
- ✅ Deploy to multiple environments
- ✅ Security scanning

### Công nghệ sử dụng

| Component | Technology |
|-----------|-----------|
| CI/CD | Jenkins Pipeline (Declarative) |
| Containerization | Docker, Docker Compose |
| E2E Testing | Playwright |
| Frontend | Next.js (Node 18) |
| Backend Services | Node.js microservices |
| Databases | PostgreSQL, MongoDB, RabbitMQ |
| API Gateway | Kong |

---

## Kiến trúc Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│                      JENKINS PIPELINE                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Checkout                                                 │
│     └─> Clone repository & extract Git info                 │
│                                                              │
│  2. Setup Environment                                        │
│     ├─> Install system tools (jq, bc)                       │
│     ├─> Install Node.js dependencies                        │
│     └─> Install Playwright browsers                         │
│                                                              │
│  3. Lint & Code Quality (Parallel)                          │
│     ├─> Lint Backend Services                               │
│     └─> Lint Frontend                                       │
│                                                              │
│  4. Unit Tests                                               │
│     └─> Run tests for all services                          │
│                                                              │
│  5. Build Docker Images                                      │
│     └─> Build all services with CI config                   │
│                                                              │
│  6. E2E Tests ⭐                                              │
│     ├─> Start infrastructure (DB, Message Queue)            │
│     ├─> Start application services                          │
│     ├─> Run E2E tests in container                          │
│     ├─> Copy results from container                         │
│     ├─> Analyze results with thresholds                     │
│     └─> Determine build status                              │
│                                                              │
│  7. Tag & Push Images (main/develop/staging only)           │
│     └─> Push to Docker registry                             │
│                                                              │
│  8. Deploy to Environment (main/develop/staging only)        │
│     └─> Deploy based on branch                              │
│                                                              │
│  9. Security Scan (main/develop only)                        │
│     └─> Trivy vulnerability scanning                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Cấu hình và Parameters

### Environment Variables

```groovy
environment {
    // Docker Registry
    DOCKER_REGISTRY = credentials('docker-registry-url')
    DOCKER_CREDENTIALS_ID = 'docker-registry-credentials'
    
    // Image naming
    IMAGE_PREFIX = 'club-management'
    IMAGE_TAG = "${BUILD_NUMBER}-${GIT_COMMIT_SHORT}"
    
    // Node version
    NODE_VERSION = '18'
    
    // E2E Configuration
    API_GATEWAY_URL = 'http://localhost:8000'
    CI = 'true'
    PLAYWRIGHT_BROWSERS_PATH = "${WORKSPACE}/playwright-browsers"
    
    // E2E Thresholds (configurable via parameters)
    E2E_FAILURE_THRESHOLD_PERCENT = "5"      // 5% maximum
    E2E_FAILURE_THRESHOLD_ABSOLUTE = "12"    // 12 tests maximum
    E2E_THRESHOLD_MODE = "both"              // both|percentage|absolute
    E2E_MARK_UNSTABLE = "true"               // Mark as UNSTABLE vs SUCCESS
}
```

### Pipeline Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `E2E_FAILURE_THRESHOLD_PERCENT` | String | `5` | Tỷ lệ % tests được phép fail (0-100) |
| `E2E_FAILURE_THRESHOLD_ABSOLUTE` | String | `12` | Số lượng tuyệt đối tests được phép fail |
| `E2E_THRESHOLD_MODE` | Choice | `both` | Chế độ đánh giá: `both`, `percentage`, `absolute` |
| `E2E_MARK_UNSTABLE` | Boolean | `true` | Mark build UNSTABLE khi trong threshold |

### Pipeline Options

```groovy
options {
    buildDiscarder(logRotator(numToKeepStr: '10'))  // Giữ 10 builds gần nhất
    timeout(time: 60, unit: 'MINUTES')              // Timeout 60 phút
    disableConcurrentBuilds()                       // Không chạy concurrent
}
```

---

## Chi tiết các Stages

### Stage 1: Checkout

**Mục đích:** Clone repository và extract Git metadata

```groovy
stage('Checkout') {
    steps {
        checkout scm
        
        // Extract Git info
        env.GIT_COMMIT_SHORT = sh(script: 'git rev-parse --short HEAD', returnStdout: true).trim()
        env.BUILD_TIME = sh(script: 'date -u +%Y-%m-%dT%H:%M:%SZ', returnStdout: true).trim()
    }
}
```

**Outputs:**
- `GIT_COMMIT_SHORT`: Short commit hash (7 chars)
- `BUILD_TIME`: ISO 8601 timestamp

---

### Stage 2: Setup Environment

**Mục đích:** Cài đặt dependencies và tools cần thiết

**Các bước:**

1. **Install system tools**
   ```bash
   apt-get install -y jq bc  # JSON parser và calculator
   ```

2. **Install Node.js dependencies**
   ```bash
   npm ci                    # Root dependencies
   cd frontend && npm ci     # Frontend dependencies
   ```

3. **Install Playwright**
   ```bash
   npm install --save-dev @playwright/test
   npx playwright install chromium --with-deps
   ```

**Thời gian:** ~2-3 phút

**Common Issues:**
- ❌ `npm ci` timeout → Đã fix với `--fetch-timeout=600000`
- ❌ Playwright download fails → Check network connectivity

---

### Stage 3: Lint & Code Quality

**Mục đích:** Kiểm tra code quality cho frontend và backend

**Parallel execution:**

```groovy
parallel {
    stage('Lint Backend Services') {
        // Lint: auth, club, event, notify
    }
    
    stage('Lint Frontend') {
        // Lint frontend (currently skipped - ESLint needs config)
    }
}
```

**Behavior:**
- ⚠️ Non-blocking: Failures logged nhưng không fail build
- 📝 Frontend lint skipped (requires ESLint configuration)

---

### Stage 4: Unit Tests

**Mục đích:** Chạy unit tests cho tất cả services

**Services tested:**
- ✅ `auth` - 37 tests
- ✅ `club` - Multiple test suites
- ✅ `event` - API và business logic tests
- ✅ `notify` - Notification service tests

**Test Results:**
- XML reports → `test-results/unit/*.xml`
- JUnit integration cho Jenkins dashboard

**Thời gian:** ~3-5 phút

---

### Stage 5: Build Docker Images

**Mục đích:** Build production-ready Docker images

**Command:**
```bash
docker compose -f docker-compose.yml \
               -f docker-compose.e2e.yml \
               -f docker-compose.ci.yml \
               build --no-cache \
               --build-arg GIT_COMMIT=${GIT_COMMIT} \
               --build-arg BUILD_NUMBER=${BUILD_NUMBER} \
               --build-arg BUILD_TIME=${BUILD_TIME} \
               auth-service club-service event-service \
               notify-service image-service frontend
```

**Build Args:**
- `GIT_COMMIT`: For traceability
- `BUILD_NUMBER`: For versioning
- `BUILD_TIME`: For audit trail

**Images built:**
1. `auth-service` - Authentication & authorization
2. `club-service` - Club management
3. `event-service` - Event management
4. `notify-service` - Notifications
5. `image-service` - Image upload/storage
6. `frontend` - Next.js frontend

**Thời gian:** ~5-8 phút

**Optimizations:**
- ✅ Multi-stage builds
- ✅ Layer caching
- ✅ Production dependencies only
- ✅ Increased npm timeout (600s)

---

## E2E Testing Flow

### Kiến trúc E2E Testing

```
┌──────────────────────────────────────────────────────────┐
│                    JENKINS AGENT                         │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │         Docker Compose Network                      │ │
│  │         (club_network)                              │ │
│  │                                                     │ │
│  │  ┌──────────────┐  ┌──────────────┐               │ │
│  │  │  PostgreSQL  │  │   MongoDB    │               │ │
│  │  └──────────────┘  └──────────────┘               │ │
│  │  ┌──────────────┐                                  │ │
│  │  │  RabbitMQ    │                                  │ │
│  │  └──────────────┘                                  │ │
│  │         ▲                                           │ │
│  │         │                                           │ │
│  │  ┌──────┴───────────────────────────────┐          │ │
│  │  │     Application Services             │          │ │
│  │  │  ┌─────┐ ┌─────┐ ┌──────┐ ┌──────┐  │          │ │
│  │  │  │Auth │ │Club │ │Event │ │Notify│  │          │ │
│  │  │  └─────┘ └─────┘ └──────┘ └──────┘  │          │ │
│  │  │  ┌───────┐                           │          │ │
│  │  │  │ Image │                           │          │ │
│  │  │  └───────┘                           │          │ │
│  │  └──────────┬───────────────────────────┘          │ │
│  │             │                                       │ │
│  │  ┌──────────▼──────────┐                           │ │
│  │  │      Kong           │                           │ │
│  │  │   (API Gateway)     │                           │ │
│  │  └──────────┬──────────┘                           │ │
│  │             │                                       │ │
│  │  ┌──────────▼──────────┐                           │ │
│  │  │     Frontend        │                           │ │
│  │  │     (Next.js)       │                           │ │
│  │  └──────────┬──────────┘                           │ │
│  │             │                                       │ │
│  │  ┌──────────▼──────────┐                           │ │
│  │  │   E2E Runner        │                           │ │
│  │  │   (Playwright)      │                           │ │
│  │  │                     │                           │ │
│  │  │  - Run tests        │                           │ │
│  │  │  - Generate reports │                           │ │
│  │  └─────────────────────┘                           │ │
│  │                                                     │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  Results copied back to Jenkins workspace               │
│  via `docker cp`                                         │
└──────────────────────────────────────────────────────────┘
```

### E2E Testing Steps

#### Step 1: Infrastructure Setup (60s timeout)

```bash
# Start databases and message queue
docker compose up -d postgres mongo rabbitmq

# Wait for health checks
for i in $(seq 1 60); do
    if services_healthy; then
        break
    fi
    sleep 5
done
```

**Health checks:**
- PostgreSQL: Port 5432 ready
- MongoDB: Port 27017 ready
- RabbitMQ: Management API available

#### Step 2: Application Services (90s timeout)

```bash
# Start all application services
docker compose up -d auth-service club-service event-service \
                    notify-service image-service frontend

# Wait for health checks (up to 15 minutes)
for i in $(seq 1 90); do
    if services_healthy; then
        break
    fi
    sleep 10
done

# Additional stabilization time
sleep 30
```

**Health checks per service:**
- Auth: `GET /health` returns 200
- Club: `GET /health` returns 200
- Event: `GET /health` returns 200
- Notify: `GET /health` returns 200
- Image: `GET /health` returns 200
- Frontend: `GET /api/health` returns 200
- Kong: `GET /health` returns 200

#### Step 3: Build E2E Runner Image

```bash
docker compose -f docker-compose.e2e-runner.yml build e2e-runner
```

**E2E Runner Dockerfile:**
```dockerfile
FROM mcr.microsoft.com/playwright:v1.57.0-jammy

WORKDIR /app

# Copy dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Run tests
CMD ["/bin/bash", "/app/run-tests.sh"]
```

#### Step 4: Run Tests

```bash
# Run in container on same network
docker compose run --name e2e-runner-${BUILD_NUMBER} e2e-runner

# Container runs:
# 1. Global setup (verify services ready)
# 2. Run Playwright tests
# 3. Generate reports (HTML, XML, JSON)
# 4. Exit with code
```

**Test execution:**
- **Browsers:** Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari
- **Parallel:** 1 worker in CI (sequential for stability)
- **Retries:** 2 retries per failed test
- **Timeout:** 60s per test, 90s for global setup

#### Step 5: Copy Results

```bash
# Copy from container to Jenkins workspace
docker cp e2e-runner-${BUILD_NUMBER}:/app/test-results/. test-results/
docker cp e2e-runner-${BUILD_NUMBER}:/app/playwright-report/. playwright-report/

# Remove container
docker rm -f e2e-runner-${BUILD_NUMBER}
```

**Results structure:**
```
test-results/
├── e2e-results.xml          # JUnit XML
├── e2e-results.json         # JSON summary
└── specs-*/                 # Screenshots, videos

playwright-report/
└── index.html               # HTML report
```

#### Step 6: Analyze Results

**Script:** `scripts/analyze-e2e-results.sh`

**Logic:**
```bash
# Parse XML files
TOTAL_TESTS=0
FAILED_TESTS=0

for xml in test-results/*.xml; do
    tests=$(grep -oP 'tests="\K[0-9]+' "$xml")
    failures=$(grep -oP 'failures="\K[0-9]+' "$xml")
    
    TOTAL_TESTS=$((TOTAL_TESTS + tests))
    FAILED_TESTS=$((FAILED_TESTS + failures))
done

# Calculate failure rate
FAILURE_RATE=$(awk "BEGIN {printf \"%.2f\", ($FAILED_TESTS / $TOTAL_TESTS) * 100}")

# Check thresholds
case $THRESHOLD_MODE in
    "percentage")
        if [ $FAILURE_RATE > $THRESHOLD_PERCENT ]; then
            exit 1  # Fail
        fi
        ;;
    "absolute")
        if [ $FAILED_TESTS > $THRESHOLD_ABSOLUTE ]; then
            exit 1  # Fail
        fi
        ;;
    "both")
        if [ $FAILURE_RATE > $THRESHOLD_PERCENT ] || [ $FAILED_TESTS > $THRESHOLD_ABSOLUTE ]; then
            exit 1  # Fail
        fi
        ;;
esac

# Within threshold
exit 2  # Mark unstable
```

**Exit codes:**
- `0` - All tests passed
- `1` - Exceeded threshold (FAIL build)
- `2` - Within threshold (UNSTABLE or SUCCESS)

#### Step 7: Determine Build Status

**Jenkins logic:**
```groovy
if (analysisExitCode == 0 && summary.failed == 0) {
    currentBuild.result = 'SUCCESS'
} else if (analysisExitCode == 2) {
    if (env.E2E_MARK_UNSTABLE == 'true') {
        currentBuild.result = 'UNSTABLE'
    } else {
        currentBuild.result = 'SUCCESS'
    }
} else {
    currentBuild.result = 'FAILURE'
    error("E2E tests exceeded failure threshold")
}
```

---

## Troubleshooting

### Common Issues và Solutions

#### 1. NPM Registry Timeout

**Symptoms:**
```
npm error code EIDLETIMEOUT
npm error Idle timeout reached for host 'registry.npmjs.org:443'
```

**Solution:**
✅ Đã implement trong Dockerfile:
```dockerfile
RUN npm ci --only=production \
  --fetch-timeout=600000 \
  --fetch-retry-mintimeout=20000 \
  --fetch-retry-maxtimeout=120000
```

#### 2. E2E Tests - Service Not Ready

**Symptoms:**
```
Error: frontend service not ready after 90000ms
Last error: fetch failed
```

**Root causes:**
- DNS resolution issues trong Docker network
- Services chưa fully initialized
- Network connectivity problems

**Solutions:**
1. ✅ Tăng timeout lên 90s
2. ✅ Add detailed logging mỗi 10 attempts
3. ✅ Add per-request timeout (5s)
4. ✅ DNS pre-check trong CI environment

**Code:**
```typescript
async waitForDirectService(serviceName: string, url: string, timeout = 90000) {
    let attemptCount = 0;
    
    while (Date.now() - startTime < timeout) {
        attemptCount++;
        
        try {
            const response = await fetch(url, {
                signal: AbortSignal.timeout(5000)
            });
            
            if (response.ok) {
                console.log(`✅ ${serviceName} ready after ${attemptCount} attempts`);
                return;
            }
        } catch (error: any) {
            if (attemptCount % 10 === 0) {
                console.log(`⚠️  Attempt ${attemptCount} failed: ${error.message}`);
            }
        }
        
        await sleep(1000);
    }
    
    throw new Error(`${serviceName} not ready after ${timeout}ms`);
}
```

#### 3. No XML Results Found

**Symptoms:**
```
⚠️ Warning: No XML result files found in 'test-results'
```

**Root causes:**
- Tests failed before generating results
- Container crashed during execution
- Copy from container failed

**Solutions:**
✅ Implemented fallback:
```bash
if [ "$XML_COUNT" -eq 0 ]; then
    cat > e2e-test-summary.json <<EOF
{
  "total": 0,
  "passed": 0,
  "failed": 1,
  "skipped": 0,
  "failureRate": 100,
  "message": "No XML results found - tests may have crashed"
}
EOF
    exit 1
fi
```

#### 4. Docker Build Cache Issues

**Symptoms:**
- Stale dependencies
- Old code in images

**Solution:**
```bash
docker compose build --no-cache
```

#### 5. Container Network Issues

**Symptoms:**
- Services can't communicate
- DNS resolution fails

**Verify:**
```bash
# Check network
docker network inspect club-management-pipeline_club_network

# Check DNS
docker exec e2e-runner nslookup frontend
```

**Solution:**
Ensure all services in same network:
```yaml
services:
  e2e-runner:
    networks:
      - club_network
      
networks:
  club_network:
    driver: bridge
```

---

## Best Practices

### 1. Pipeline Development

**✅ DO:**
- Sử dụng `set +e` khi cần capture exit code mà không fail pipeline
- Log chi tiết ở mỗi bước quan trọng
- Use timeouts cho mọi waiting operations
- Implement retry logic cho network operations
- Archive artifacts (logs, reports) trong `post` block

**❌ DON'T:**
- Hard-code sensitive credentials (use Jenkins credentials)
- Ignore errors silently
- Use `sleep` without timeout limits
- Leave containers running after pipeline

### 2. Docker Best Practices

**Multi-stage builds:**
```dockerfile
FROM node:18-alpine AS deps
RUN npm ci --only=production

FROM node:18-alpine AS runner
COPY --from=deps /app/node_modules ./node_modules
```

**Health checks:**
```yaml
services:
  frontend:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 10s
      timeout: 5s
      retries: 5
```

### 3. E2E Testing Best Practices

**Isolate test data:**
```typescript
// Global setup
const runId = `e2e${Date.now()}`;
global.__E2E_RUN_ID__ = runId;

// Use in tests
const email = `test${runId}@example.com`;
```

**Cleanup after tests:**
```typescript
// Global teardown
await cleanupTestEvents();
await cleanupTestClubs();
await cleanupTestUsers();
```

**Retry flaky tests:**
```javascript
// playwright.config.ts
export default defineConfig({
  retries: process.env.CI ? 2 : 0,
});
```

### 4. Threshold Configuration

**Chọn mode phù hợp:**

| Scenario | Recommended Mode | Settings |
|----------|-----------------|----------|
| Strict (production) | `both` | 5% AND 5 tests |
| Moderate (staging) | `both` | 10% AND 10 tests |
| Lenient (dev) | `percentage` | 15% |
| High volume tests | `absolute` | 20 tests |

**Example configurations:**

```groovy
// Strict production
E2E_FAILURE_THRESHOLD_PERCENT = '3'
E2E_FAILURE_THRESHOLD_ABSOLUTE = '5'
E2E_THRESHOLD_MODE = 'both'
E2E_MARK_UNSTABLE = 'true'

// Lenient development
E2E_FAILURE_THRESHOLD_PERCENT = '15'
E2E_FAILURE_THRESHOLD_ABSOLUTE = '20'
E2E_THRESHOLD_MODE = 'percentage'
E2E_MARK_UNSTABLE = 'false'
```

### 5. Monitoring và Alerts

**Metrics to track:**
- Build duration (target: < 30 mins)
- E2E test pass rate (target: > 95%)
- Docker build time (target: < 8 mins)
- Service startup time (target: < 2 mins)

**Setup alerts for:**
- Build failures > 2 consecutive
- E2E pass rate < 90%
- Build duration > 45 mins
- Frequent flaky tests

---

## Phụ lục

### A. File Structure

```
.
├── Jenkinsfile                          # Pipeline definition
├── docker-compose.yml                   # Base services
├── docker-compose.e2e.yml              # E2E overrides
├── docker-compose.ci.yml               # CI overrides
├── docker-compose.e2e-runner.yml       # E2E runner
├── Dockerfile.e2e                      # E2E runner image
├── playwright.config.ts                # Playwright config
├── scripts/
│   └── analyze-e2e-results.sh         # Result analysis
├── tests/e2e/
│   ├── global-setup.ts                # Global setup
│   ├── global-teardown.ts             # Global teardown
│   ├── specs/                         # Test specs
│   └── utils/
│       └── api-helper.ts              # Test utilities
└── services/
    ├── auth/Dockerfile
    ├── club/Dockerfile
    ├── event/Dockerfile
    ├── notify/Dockerfile
    └── image/Dockerfile
```

### B. Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `CI` | CI environment flag | `true` |
| `BASE_URL` | Frontend URL | `http://frontend:3000` |
| `API_GATEWAY_URL` | Kong URL | `http://kong:8000` |
| `API_GATEWAY_SECRET` | Gateway secret | `test-secret-e2e` |
| `MONGODB_URI` | MongoDB connection | `mongodb://mongo:27017/...` |
| `POSTGRES_URL` | PostgreSQL connection | `postgresql://postgres:...` |

### C. Useful Commands

**Manual test run:**
```bash
# Start services
docker compose -f docker-compose.yml -f docker-compose.e2e.yml up -d

# Run tests locally
npm run test:e2e

# View logs
docker compose logs -f frontend
```

**Debug E2E runner:**
```bash
# Build runner
docker compose -f docker-compose.e2e-runner.yml build

# Run with shell
docker compose -f docker-compose.e2e-runner.yml run --rm e2e-runner /bin/bash
```

**Clean up:**
```bash
# Stop all
docker compose -f docker-compose.yml -f docker-compose.e2e.yml down -v

# Remove images
docker image prune -a -f
```

---

## Changelog

### v1.0.0 (Current)
- ✅ Initial pipeline implementation
- ✅ E2E testing with Playwright
- ✅ Flexible failure thresholds
- ✅ Docker-in-Docker support
- ✅ Multi-stage Docker builds
- ✅ NPM timeout optimizations
- ✅ Enhanced error handling and logging

---

**Maintainer:** DevOps Team  
**Last Updated:** January 12, 2026  
**Pipeline Version:** 1.0.0
