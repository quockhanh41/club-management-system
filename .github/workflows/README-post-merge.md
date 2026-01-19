# Post-Merge Pipeline - GitHub Actions

## Overview

GitHub Actions workflow that runs comprehensive validation **after** code merges to `main` or `develop` branches.

## 🎯 Purpose

- Ensure main/develop branch health after merge
- Run full test suite (not just PR smoke tests)
- Build and push Docker images with semantic versioning
- Auto-deploy to staging (develop branch)
- Comprehensive reporting and notifications

## ⏰ Triggers

- **Automatic**: Push to `main` or `develop` branch
- **Manual**: Via GitHub Actions UI (`workflow_dispatch`)

## 📊 Pipeline Stages

### 1. Setup & Version Calculation (1 min)
- Calculate semantic version from git tags
- Generate image tag: `v{version}-{commit}`
- Determine target environment based on branch

### 2. Build & Lint (3-5 min)
- Parallel builds for all 7 services
- Lint checks (ESLint)
- TypeScript compilation

### 3. Unit & Integration Tests (5-8 min)
- Run all unit tests with coverage
- Test all services in parallel
- Upload coverage reports

### 4. Full E2E Suite (10-15 min)
- All 250+ tests (not just smoke)
- All browsers: Chrome, Firefox, Safari
- Parallel execution with 4 workers
- Retry flaky tests (2 attempts)
- Threshold analysis

### 5. Build & Push Docker Images (5-8 min)
- Build all service images
- Tag with version: `v{version}-{commit}`
- Push to Docker registry
- Generate SBOM (Software Bill of Materials)
- Use GitHub Actions cache for faster builds

### 6. Deploy to Staging (5-10 min)
- **Only for `develop` branch**
- SSH to staging server
- Pull new images
- Run database migrations
- Zero-downtime deployment
- Health checks

### 7. Post-Deploy Validation (2-3 min)
- Health check all services
- Smoke tests on staging
- Generate deployment report

### 8. Notifications
- Slack notification with status
- Commit comment with results
- Upload artifacts (reports, coverage)

## 🔧 Configuration Required

### 1. GitHub Secrets

Add these secrets in: **Settings → Secrets and variables → Actions**

```bash
# Docker Registry
DOCKER_USERNAME=your-dockerhub-username
DOCKER_PASSWORD=your-dockerhub-token

# Staging Server (if deploying)
STAGING_SSH_KEY=your-ssh-private-key
STAGING_HOST=staging.example.com
STAGING_USER=deploy

# Slack (optional)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

### 2. Docker Registry Setup

**Option A: Docker Hub (Free)**
```bash
# Create account at hub.docker.com
# Create access token: Account Settings → Security → New Access Token
# Add to GitHub Secrets as DOCKER_PASSWORD
```

**Option B: GitHub Container Registry (Free)**
```yaml
# Change in workflow file:
env:
  DOCKER_REGISTRY: ghcr.io
  DOCKER_USERNAME: ${{ github.actor }}

# Use GITHUB_TOKEN instead of DOCKER_PASSWORD:
- name: Login to GitHub Container Registry
  uses: docker/login-action@v3
  with:
    registry: ghcr.io
    username: ${{ github.actor }}
    password: ${{ secrets.GITHUB_TOKEN }}
```

**Option C: AWS ECR**
```yaml
- name: Configure AWS credentials
  uses: aws-actions/configure-aws-credentials@v4
  with:
    aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
    aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    aws-region: us-east-1

- name: Login to Amazon ECR
  uses: aws-actions/amazon-ecr-login@v2
```

### 3. Staging Server Setup (Optional)

If you want auto-deploy to staging:

```bash
# 1. Generate SSH key on GitHub Actions runner
ssh-keygen -t ed25519 -C "github-actions" -f github_actions_key

# 2. Add public key to staging server
cat github_actions_key.pub >> ~/.ssh/authorized_keys

# 3. Add private key to GitHub Secrets as STAGING_SSH_KEY
cat github_actions_key

# 4. Test connection
ssh -i github_actions_key user@staging-host
```

**Or skip deployment:**
```yaml
# Comment out or remove the deploy-staging job
# The pipeline will still build and push images
```

### 4. Slack Notifications (Optional)

```bash
# 1. Create Slack App: api.slack.com/apps
# 2. Enable Incoming Webhooks
# 3. Add webhook URL to GitHub Secrets as SLACK_WEBHOOK_URL

# Or skip notifications:
# Comment out or remove the notify job
```

## 🚀 Usage

### Automatic Trigger

Pipeline runs automatically when:
```bash
# Push to main
git push origin main

# Push to develop
git push origin develop

# Or merge PR to these branches
```

### Manual Trigger

1. Go to: **Actions → Post-Merge Pipeline**
2. Click **Run workflow**
3. Select branch
4. Click **Run workflow**

## 📈 Success Criteria

Pipeline succeeds when:
- ✅ All builds complete without errors
- ✅ All linting passes
- ✅ Unit tests pass with >80% coverage
- ✅ E2E tests pass (within 10% failure threshold)
- ✅ Docker images built and pushed
- ✅ Staging deployment healthy (if develop branch)
- ✅ All health checks pass

## 📦 Artifacts

Uploaded artifacts (retained for 7 days):

```
artifacts/
├── coverage-{service}/           # Code coverage reports
├── e2e-results/                  # E2E test results & HTML report
├── e2e-videos/                   # Videos of failed tests
├── sbom-{service}.spdx.json     # Software Bill of Materials
└── deployment-report.md          # Deployment summary
```

## 🔄 Comparison: GitHub Actions vs Jenkins

| Feature | GitHub Actions | Jenkins |
|---------|---------------|---------|
| **Speed** | ✅ 20-25 min | ⚠️ 25-35 min |
| **Cost** | ✅ Free (public) | ❌ Agent costs |
| **Setup** | ✅ Easy (YAML) | ⚠️ Complex |
| **Caching** | ✅ Built-in | ⚠️ Manual |
| **Parallel** | ✅ Matrix strategy | ✅ Parallel stages |
| **Integration** | ✅ Native GitHub | ⚠️ Webhooks |
| **Artifacts** | ✅ Automatic | ⚠️ Manual archive |
| **Notifications** | ✅ Multiple options | ✅ Plugins |

## 🐛 Troubleshooting

### Build fails on dependency installation

```yaml
# Try clearing cache
# Go to: Actions → Caches → Delete cache

# Or disable cache temporarily:
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: ${{ env.NODE_VERSION }}
    # cache: 'npm'  # Comment out
```

### Docker build fails

```yaml
# Check if services have Dockerfile
ls services/*/Dockerfile
ls frontend/Dockerfile

# Verify build context
docker build -f services/auth/Dockerfile services/auth
```

### E2E tests timeout

```yaml
# Increase wait time in workflow
- name: Start services
  run: |
    docker-compose up -d
    sleep 60  # Increase from 30 to 60

# Or check docker-compose logs
docker-compose logs
```

### Staging deployment fails

```yaml
# Test SSH connection
ssh -i $STAGING_SSH_KEY $STAGING_USER@$STAGING_HOST

# Check if docker-compose exists on staging
ssh $STAGING_USER@$STAGING_HOST "which docker-compose"

# Verify staging server has enough resources
ssh $STAGING_USER@$STAGING_HOST "free -h && df -h"
```

### Slack notifications not working

```bash
# Test webhook manually
curl -X POST $SLACK_WEBHOOK_URL \
  -H 'Content-Type: application/json' \
  -d '{"text":"Test from GitHub Actions"}'

# Check if secret is set correctly
# Settings → Secrets → SLACK_WEBHOOK_URL
```

## 🔐 Security Best Practices

1. **Never commit secrets**
   ```bash
   # Always use GitHub Secrets
   ${{ secrets.SECRET_NAME }}
   ```

2. **Use least-privilege access**
   ```yaml
   # Limit GitHub token permissions
   permissions:
     contents: read
     packages: write
   ```

3. **Scan images for vulnerabilities**
   ```yaml
   # Add Trivy scan after build
   - name: Scan image
     uses: aquasecurity/trivy-action@master
     with:
       image-ref: ${{ env.DOCKER_REGISTRY }}/...
   ```

4. **Rotate credentials regularly**
   ```bash
   # Update secrets every 90 days
   # Use short-lived tokens when possible
   ```

## 📊 Metrics & Monitoring

Track these metrics over time:

```yaml
Success Rate:
  - Target: >95%
  - Current: [Check Actions tab]

Duration:
  - Target: <25 minutes
  - Current: [View workflow runs]

Failure Reasons:
  - Tests: [%]
  - Build: [%]
  - Deploy: [%]

Deployment Frequency:
  - Target: 2-4 times/week
  - Current: [Count workflow runs]
```

## 🔗 Related Workflows

- [PR Checks](.github/workflows/pr-checks.yml) - Fast validation before merge
- [Nightly](docs/pipeline-architecture.md#pipeline-2-nightlyscheduled-pipeline) - Comprehensive quality checks (planned)
- [Release](docs/pipeline-architecture.md#pipeline-3-release-pipeline) - Version releases (planned)
- [Deploy](docs/pipeline-architecture.md#pipeline-4-deployment-pipeline) - Manual deployments (planned)

## 📚 References

- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Workflow Syntax](https://docs.github.com/en/actions/reference/workflow-syntax-for-github-actions)
- [Docker Build Action](https://github.com/docker/build-push-action)
- [Playwright CI](https://playwright.dev/docs/ci)

## 🎯 Next Steps

After Post-Merge pipeline is working:

1. **Add Nightly Pipeline** - Comprehensive quality checks
2. **Add Release Pipeline** - Standardized releases
3. **Add Deploy Pipeline** - Blue-green deployments
4. **Add Performance Tests** - Load testing
5. **Add Security Scans** - SAST/DAST

See [Pipeline Architecture](../docs/pipeline-architecture.md) for full roadmap.

---

**Last Updated:** January 19, 2026  
**Status:** ✅ Ready to use  
**Maintainer:** DevOps Team
