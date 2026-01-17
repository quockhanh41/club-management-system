# PR CI Pipeline Configuration Guide

## 🎯 Overview

This project uses **dual CI systems** for Pull Request validation:

1. **Jenkins** (`Jenkinsfile.pr`) - Full pipeline with Docker builds
2. **GitHub Actions** (`.github/workflows/pr-checks.yml`) - Fast parallel checks

---

## 📁 Files Created

| File | Purpose |
|------|---------|
| `Jenkinsfile.pr` | Jenkins PR pipeline (10-15 min) |
| `.github/workflows/pr-checks.yml` | GitHub Actions checks (5-8 min) |
| `scripts/post-pr-comment.sh` | Posts test results to PR |

---

## 🚀 Quick Start

### 1. Setup Jenkins Multibranch Pipeline

```groovy
// In Jenkins UI:
// New Item → Multibranch Pipeline

Branch Sources:
  - GitHub
  - Discover pull requests from origin
  - Discover branches: All branches
  
Build Configuration:
  - Mode: by Jenkinsfile
  - Script Path: Jenkinsfile.pr  // For PRs
  - Script Path: Jenkinsfile     // For main/develop
```

### 2. Configure GitHub CLI in Jenkins

```bash
# On Jenkins agent:
gh auth login

# Set GitHub token in Jenkins credentials:
# Credentials → Add → Secret text
# ID: github-token
# Value: ghp_xxxxxxxxxxxx
```

### 3. Enable GitHub Actions

```yaml
# Already configured in .github/workflows/pr-checks.yml
# Auto-runs on PR open/update
```

---

## 🔄 How It Works

### When PR is Created/Updated:

```
1. GitHub webhook triggers both systems
   ├─► Jenkins (Jenkinsfile.pr)
   │   ├─ Lint all services
   │   ├─ Run unit tests
   │   ├─ Build Docker images
   │   ├─ (Optional) E2E smoke tests
   │   └─ Post results comment
   │
   └─► GitHub Actions (parallel)
       ├─ Lint checks (matrix)
       ├─ Unit tests (matrix)
       ├─ Docker build (matrix)
       ├─ Security scan
       └─ Post summary comment
```

### Comments Posted:

**Jenkins Comment:**
```
## 🚀 Jenkins CI Report for PR #123

📊 Build Summary
✅ Status: Success
🧪 Test Results: 45/45 passed
🐳 Docker: All images built
📝 Ready for review!
```

**GitHub Actions Comment:**
```
## 🤖 GitHub Actions PR Checks

✅ Lint Backend: success
✅ Lint Frontend: success  
✅ Unit Tests: success
✅ Docker Build: success
```

---

## ⚙️ Configuration Options

### Jenkins Parameters (Jenkinsfile.pr)

```groovy
SKIP_E2E: true          // Skip E2E tests (default: true)
SKIP_DOCKER_BUILD: false // Skip Docker (for docs-only PRs)
```

### Smart Testing

```bash
# Automatically detects changed files and runs only relevant tests
Changed: services/auth/* → Only tests auth service
Changed: frontend/* → Only tests frontend
Changed: **.md → Skips most checks
```

---

## 📊 Pipeline Stages

### Jenkins Pipeline (`Jenkinsfile.pr`)

| Stage | Duration | Skippable | Description |
|-------|----------|-----------|-------------|
| Checkout | 10s | ❌ | Clone repo |
| Fast Validation | 2-3 min | Partial | Lint + type check |
| Unit Tests | 1-2 min | Partial | Run changed services only |
| Build Verification | 3-5 min | ✅ | Docker builds |
| E2E Smoke Tests | 3-5 min | ✅ | Optional smoke tests |
| PR Comment | 10s | ❌ | Post results |

**Total**: ~5-10 minutes (with E2E: ~10-15 min)

### GitHub Actions Workflow

| Job | Duration | Description |
|-----|----------|-------------|
| changed-files | 5s | Detect changed files |
| lint-backend | 1-2 min | Parallel lint (matrix) |
| lint-frontend | 1-2 min | Parallel lint |
| unit-tests | 1-2 min | Parallel tests (matrix) |
| docker-build | 2-3 min | Parallel builds (matrix) |
| security-scan | 30s | Trivy scan |
| pr-summary | 10s | Post comment |

**Total**: ~3-5 minutes (runs in parallel)

---

## 🎨 Usage Examples

### Example 1: Normal PR

```bash
git checkout -b feature/add-notifications
# Make changes...
git push origin feature/add-notifications
# Create PR in GitHub

# Both pipelines automatically run:
# ✅ GitHub Actions: 3-5 min
# ✅ Jenkins: 5-8 min (E2E skipped)
```

### Example 2: Documentation-Only PR

```bash
git checkout -b docs/update-readme
# Edit README.md...
git push origin docs/update-readme

# Smart detection:
# ⏭️  Most checks skipped
# ✅ Only doc linting runs
```

### Example 3: Critical PR (Need Full Tests)

```bash
# Push PR, then in Jenkins UI:
# Build with Parameters
# ✅ SKIP_E2E: false

# Runs full smoke test suite
# Takes ~15 minutes total
```

---

## 🔐 Required Credentials

### Jenkins

```
1. github-token (Secret text)
   - Personal access token with repo scope
   - Used by gh CLI to post comments

2. docker-registry-credentials (Username/Password)
   - Only needed if pushing PR images (optional)
```

### GitHub Actions

```
1. GITHUB_TOKEN (automatic)
   - Provided by GitHub Actions
   - No setup needed
```

---

## 🚨 Troubleshooting

### PR Comment Not Posted (Jenkins)

**Problem**: Script runs but no comment appears

**Solutions**:
```bash
# 1. Check gh CLI authentication
gh auth status

# 2. Check GitHub token permissions
gh auth refresh -s repo

# 3. Manual test
cd /path/to/repo
export CHANGE_ID=123
export BUILD_NUMBER=1
./scripts/post-pr-comment.sh
```

### GitHub Actions Not Triggering

**Problem**: Workflow doesn't run on PR

**Solutions**:
1. Check workflow file syntax: `cat .github/workflows/pr-checks.yml`
2. Verify branch protection rules don't block workflows
3. Check repository settings → Actions → Allow all actions

### Tests Failing Only in CI

**Problem**: Tests pass locally but fail in pipeline

**Solutions**:
```bash
# 1. Run with same node version
nvm use 18

# 2. Clean install dependencies
rm -rf node_modules package-lock.json
npm install

# 3. Check environment variables
# CI sets: CI=true, NODE_ENV=test
```

---

## 🎯 Best Practices

### 1. **Keep PRs Small**
- Smaller PRs = faster CI
- Aim for < 500 lines changed
- Split large features into multiple PRs

### 2. **Use Draft PRs**
```bash
# Create draft PR for WIP
gh pr create --draft

# CI runs but doesn't block
# Convert to ready when done
gh pr ready
```

### 3. **Skip E2E for Small Changes**
- Default: E2E tests skipped (faster feedback)
- Enable only for critical flows
- Full E2E runs after merge to develop

### 4. **Monitor Pipeline Duration**
```bash
# Check average build time
# Jenkins: Build History → Trend
# Actions: Actions tab → Workflow runs

# Target: < 10 minutes
# If slower, optimize:
#   - Add more parallelization
#   - Cache dependencies
#   - Skip unnecessary stages
```

---

## 📈 Metrics & Monitoring

### Success Criteria

```
✅ PR pipeline completes in < 10 minutes
✅ > 95% of PRs pass on first run
✅ Clear error messages in comments
✅ No false positives blocking merges
```

### Weekly Review

```bash
# Check Jenkins build times
# Dashboard → Build History → Stats

# Check GitHub Actions usage
# Settings → Billing → Actions minutes

# Review failed builds
# Identify flaky tests
# Optimize slow stages
```

---

## 🔧 Advanced Configuration

### Add Custom Checks

```groovy
// In Jenkinsfile.pr, add stage:
stage('Custom Check') {
    steps {
        sh './scripts/my-custom-check.sh'
    }
}
```

### Conditional E2E Based on Labels

```groovy
when {
    expression {
        return env.CHANGE_TARGET == 'main' || 
               params.SKIP_E2E == false
    }
}
```

### Slack Notifications

```bash
# In scripts/post-pr-comment.sh
# Uncomment Slack webhook section
export SLACK_WEBHOOK_URL="https://hooks.slack.com/..."
```

---

## 📚 Related Documentation

- [Gitflow Pipeline](./gitflow-pipeline.md) - Main pipeline docs
- [E2E Testing Guide](./e2e-testing-guide.md) - E2E test details
- [Jenkins Setup](./jenkins-setup.md) - Jenkins configuration

---

**Last Updated**: January 18, 2026  
**Pipeline Version**: 1.0
