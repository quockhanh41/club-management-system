# 🌳 Gitflow Pipeline Documentation

## Overview

This Jenkins pipeline implements a **simplified Gitflow branching strategy** for the Club Management System. It provides branch-based deployment control, environment-specific testing, and approval gates for production deployments.

---

## 🌿 Branch Strategy

### Supported Branches

| Branch | Environment | Deployment | Approval Required | Test Strategy |
|--------|-------------|------------|-------------------|---------------|
| `main` | Production | ✅ Auto (after approval) | ✅ Yes | Full E2E suite |
| `develop` | Staging | ✅ Auto | ❌ No | Full E2E suite |
| `feature/*` | Dev (optional) | ⚠️ Manual flag required | ❌ No | Smoke tests only |

### Branch Flow Diagram

```
feature/new-feature
    │
    ├─► develop (staging)
    │       │
    │       ├─► main (production)
    │
    └─► (optional) Deploy to dev with FORCE_DEPLOY=true
```

---

## 🚀 Deployment Behavior

### 1. **Main Branch (Production)**
```yaml
Environment: production
Deployment: Automatic (after approval)
Approval: Required (15-minute timeout)
Tests: Full E2E test suite
Image Tags: 
  - {BUILD_NUMBER}-{GIT_COMMIT_SHORT}
  - latest
```

**Example:**
```bash
# Merge PR to main
git checkout main
git pull origin main

# Jenkins pipeline will:
# 1. Run full E2E tests
# 2. Build & push images
# 3. Wait for approval
# 4. Deploy to production
```

### 2. **Develop Branch (Staging)**
```yaml
Environment: staging
Deployment: Automatic
Approval: Not required
Tests: Full E2E test suite
Image Tags: 
  - {BUILD_NUMBER}-{GIT_COMMIT_SHORT}
```

**Example:**
```bash
# Merge feature to develop
git checkout develop
git merge feature/my-feature
git push origin develop

# Jenkins pipeline will:
# 1. Run full E2E tests
# 2. Build & push images
# 3. Auto-deploy to staging
```

### 3. **Feature Branches (Dev)**
```yaml
Environment: dev (only if FORCE_DEPLOY=true)
Deployment: Manual (via parameter)
Approval: Not required
Tests: Smoke tests only (00-smoke)
Image Tags: None (not pushed to registry)
```

**Example:**
```bash
# Create feature branch
git checkout -b feature/add-notification
git push origin feature/add-notification

# Jenkins pipeline will:
# 1. Run smoke tests only (faster)
# 2. Build images locally
# 3. Skip deployment (unless FORCE_DEPLOY=true)
```

---

## 🎛️ Pipeline Parameters

### Core Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `SKIP_DEPLOY` | Boolean | `false` | Skip deployment for all branches |
| `FORCE_DEPLOY` | Boolean | `false` | Force deployment for feature branches |
| `E2E_TEST_FILTER` | String | `''` | Filter E2E tests (auto-set for features) |

### Test Threshold Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `E2E_FAILURE_THRESHOLD_PERCENT` | String | `10` | Max failure percentage (0-100) |
| `E2E_FAILURE_THRESHOLD_ABSOLUTE` | String | `24` | Max absolute number of failures |
| `E2E_THRESHOLD_MODE` | Choice | `both` | `both`, `percentage`, `absolute` |
| `E2E_MARK_UNSTABLE` | Boolean | `true` | Mark as UNSTABLE vs SUCCESS |

---

## 🔐 Approval Process (Production Only)

### Approval Configuration

```groovy
timeout(time: 15, unit: 'MINUTES') {
    input(
        message: "🔐 Deploy to production?",
        ok: 'Deploy',
        submitter: 'admin,devops-team',
        submitterParameter: 'APPROVED_BY'
    )
}
```

### Approval Flow

1. **Pipeline Execution**: Pipeline completes all tests and builds successfully
2. **Approval Request**: Jenkins pauses and requests approval
3. **Notification**: (Configure Slack/Email notifications)
4. **Approval Action**: Authorized user clicks "Deploy" button
5. **Deployment**: Pipeline proceeds with production deployment
6. **Timeout**: If no action after 15 minutes, pipeline aborts

### Configure Approvers

Edit `submitter` in [Jenkinsfile](../Jenkinsfile#L625):
```groovy
submitter: 'admin,devops-team,john.doe'
```

---

## 🧪 Test Strategy

### Test Matrix by Branch

```yaml
main/develop:
  - Lint checks
  - Unit tests (all services)
  - Full E2E test suite (all browsers)
  - Security scans

feature/*:
  - Lint checks
  - Unit tests (all services)
  - Smoke tests only (00-smoke pattern)
  - No security scans
```

### E2E Test Filters

```bash
# Run all tests (default for main/develop)
E2E_TEST_FILTER=""

# Run smoke tests only (default for feature/*)
E2E_TEST_FILTER="00-smoke"

# Run specific test patterns
E2E_TEST_FILTER="auth"
E2E_TEST_FILTER="club|event"
```

---

## 📦 Image Tagging Strategy

### Image Naming Convention

```
{DOCKER_REGISTRY}/{IMAGE_PREFIX}-{SERVICE}:{TAG}

Example:
registry.example.com/club-management-auth:123-abc1234
registry.example.com/club-management-frontend:123-abc1234
```

### Tag Strategy by Branch

| Branch | Tags Applied | Description |
|--------|-------------|-------------|
| `main` | `{BUILD}-{COMMIT}`, `latest` | Production-ready releases |
| `develop` | `{BUILD}-{COMMIT}` | Staging builds |
| `feature/*` | None | Not pushed to registry |

### Tag Examples

```bash
# Main branch (build #123, commit abc1234)
club-management-auth:123-abc1234
club-management-auth:latest

# Develop branch (build #124, commit def5678)
club-management-auth:124-def5678
```

---

## 🎯 Usage Examples

### Example 1: Deploy Feature to Dev

```bash
# 1. Create feature branch
git checkout -b feature/add-user-profile
git push origin feature/add-user-profile

# 2. Trigger Jenkins build with FORCE_DEPLOY=true
# In Jenkins UI:
# ✅ FORCE_DEPLOY: true
# Build Now

# Result: Deploys to dev environment
```

### Example 2: Deploy to Staging

```bash
# 1. Merge feature to develop
git checkout develop
git merge feature/add-user-profile
git push origin develop

# Result: Auto-deploys to staging (no approval)
```

### Example 3: Production Deployment

```bash
# 1. Merge develop to main
git checkout main
git merge develop
git push origin main

# 2. Pipeline runs tests and waits for approval
# 3. Approve in Jenkins UI
# 4. Deployment proceeds

# Result: Deploys to production after approval
```

### Example 4: Skip Deployment

```bash
# Test pipeline changes without deployment
# In Jenkins UI:
# ✅ SKIP_DEPLOY: true
# Build Now

# Result: Runs tests but skips deployment
```

---

## 🔧 Configuration

### Jenkins Credentials Required

1. **Docker Registry**
   ```
   Credential ID: docker-registry-credentials
   Type: Username with password
   ```

2. **Docker Registry URL**
   ```
   Credential ID: docker-registry-url
   Type: Secret text
   Value: registry.example.com
   ```

### Environment Variables

Set in [Jenkinsfile environment block](../Jenkinsfile#L38):

```groovy
environment {
    DOCKER_REGISTRY = credentials('docker-registry-url')
    DOCKER_CREDENTIALS_ID = 'docker-registry-credentials'
    IMAGE_PREFIX = 'club-management'
    SERVICES = 'auth club event notify image'
    // ... more variables
}
```

---

## 🚨 Troubleshooting

### Deployment Doesn't Trigger

**Problem**: Feature branch doesn't deploy

**Solution**: Set `FORCE_DEPLOY=true` parameter in Jenkins UI

---

### Approval Timeout

**Problem**: Deployment times out waiting for approval

**Solution**: 
1. Check approver list in Jenkinsfile
2. Increase timeout (default: 15 minutes)
3. Configure notifications for approval requests

---

### Wrong Environment Detected

**Problem**: Branch detected incorrectly

**Solution**: Check branch detection logic in [Jenkinsfile](../Jenkinsfile#L115):
```groovy
def branchName = env.BRANCH_NAME ?: sh(script: 'git rev-parse --abbrev-ref HEAD', returnStdout: true).trim()
```

---

### Tests Run Full Suite on Feature Branch

**Problem**: Feature branch runs all tests instead of smoke tests

**Solution**: 
1. Check `E2E_TEST_FILTER` parameter (should auto-set to `00-smoke`)
2. Override manually if needed in Jenkins UI

---

## 📊 Pipeline Stages

```
┌─────────────────────────────────────────────────────────────┐
│ Stage                  │ Main │ Develop │ Feature/*        │
├────────────────────────┼──────┼─────────┼──────────────────┤
│ Checkout               │  ✅  │   ✅    │      ✅          │
│ Setup Environment      │  ✅  │   ✅    │      ✅          │
│ Lint & Code Quality    │  ✅  │   ✅    │      ✅          │
│ Unit Tests             │  ✅  │   ✅    │      ✅          │
│ Build Docker Images    │  ✅  │   ✅    │      ✅          │
│ E2E Tests              │  ✅  │   ✅    │  ✅ (smoke only) │
│ Tag & Push Images      │  ✅  │   ✅    │      ❌          │
│ Deploy to Environment  │  ✅  │   ✅    │  ⚠️  (if forced) │
│ Security Scan          │  ✅  │   ✅    │      ❌          │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Best Practices

### 1. **Feature Development**
- Always branch from `develop`
- Use descriptive branch names: `feature/add-payment-method`
- Test locally before pushing
- Use `FORCE_DEPLOY` sparingly (only for integration testing)

### 2. **Staging Deployment**
- Merge to `develop` regularly
- Treat staging as production-like environment
- Run full E2E tests on every push

### 3. **Production Deployment**
- Merge to `main` only from `develop`
- Ensure staging tests pass first
- Have at least 2 approvers available
- Schedule deployments during low-traffic periods

### 4. **Rollback Strategy**
```bash
# If production deployment fails:
# 1. Revert main branch
git revert HEAD
git push origin main

# 2. Jenkins will auto-deploy previous version

# 3. Investigate issue in develop
git checkout develop
# Fix issue
git push origin develop
```

---

## 📚 Related Documentation

- [E2E Testing Guide](./e2e-testing-guide.md)
- [Jenkins Setup Guide](./jenkins-setup.md)
- [Local Testing Guide](./local-testing-guide.md)
- [Threshold Analysis](./e2e-failure-threshold-guide.md)

---

## 🆘 Support

For issues or questions:
1. Check logs in Jenkins UI
2. Review this documentation
3. Check related docs above
4. Contact DevOps team

---

**Last Updated**: January 17, 2026
**Pipeline Version**: 1.0 (Simplified Gitflow)
