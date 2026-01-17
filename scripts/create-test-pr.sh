#!/bin/bash

# =============================================================================
# Create Test PR for CI Pipeline Testing
# =============================================================================
# Quick script to create a test PR and trigger CI checks
# =============================================================================

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 Creating Test PR for CI Pipeline${NC}"

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}❌ GitHub CLI (gh) not found${NC}"
    echo "Install: brew install gh"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo -e "${YELLOW}🔐 Not authenticated with GitHub${NC}"
    echo "Run: gh auth login"
    exit 1
fi

# Get current branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo -e "📍 Current branch: ${BLUE}${CURRENT_BRANCH}${NC}"

# Check if on main/develop
if [ "$CURRENT_BRANCH" = "main" ] || [ "$CURRENT_BRANCH" = "develop" ]; then
    echo -e "${YELLOW}⚠️  You're on ${CURRENT_BRANCH} branch${NC}"
    echo "Creating a test branch..."
    
    # Generate test branch name
    TEST_BRANCH="test/ci-pipeline-$(date +%Y%m%d-%H%M%S)"
    
    git checkout -b "$TEST_BRANCH"
    echo -e "${GREEN}✅ Created branch: ${TEST_BRANCH}${NC}"
else
    TEST_BRANCH="$CURRENT_BRANCH"
    echo -e "Using existing branch: ${BLUE}${TEST_BRANCH}${NC}"
fi

# Make a small change to trigger CI
echo -e "\n${BLUE}📝 Creating test change...${NC}"

# Add a comment to README or create test file
if [ -f "README.md" ]; then
    echo "" >> README.md
    echo "<!-- Test CI Pipeline - $(date) -->" >> README.md
    git add README.md
else
    echo "# CI Pipeline Test - $(date)" > .ci-test.md
    git add .ci-test.md
fi

# Commit
git commit -m "test: trigger CI pipeline checks

Testing PR validation pipeline
- GitHub Actions workflow
- Jenkins PR pipeline (if configured)
"

echo -e "${GREEN}✅ Created test commit${NC}"

# Push
echo -e "\n${BLUE}📤 Pushing to GitHub...${NC}"
git push origin "$TEST_BRANCH" --set-upstream

echo -e "${GREEN}✅ Pushed to origin/${TEST_BRANCH}${NC}"

# Create PR
echo -e "\n${BLUE}🔀 Creating Pull Request...${NC}"

# Prompt for target branch
echo -e "${YELLOW}Select target branch:${NC}"
echo "1) develop (recommended for testing)"
echo "2) main"
read -p "Enter choice [1]: " CHOICE
CHOICE=${CHOICE:-1}

if [ "$CHOICE" = "2" ]; then
    TARGET_BRANCH="main"
else
    TARGET_BRANCH="develop"
fi

# Create PR with gh CLI
PR_URL=$(gh pr create \
    --base "$TARGET_BRANCH" \
    --title "🧪 Test: CI Pipeline Validation" \
    --body "## 🧪 Test PR for CI Pipeline

This is a test PR to validate CI pipeline configuration.

### What's being tested:
- ✅ GitHub Actions PR checks (`.github/workflows/pr-checks.yml`)
- ✅ Jenkins PR pipeline (\`Jenkinsfile.pr\`)
- ✅ Auto-generated PR comments
- ✅ Status checks

### Expected Results:
1. GitHub Actions workflow runs (3-5 min)
2. Jenkins pipeline runs (10-15 min) - if configured
3. Both systems post summary comments
4. All checks should pass

### Actions:
- [ ] Verify GitHub Actions completes
- [ ] Verify Jenkins pipeline completes (if configured)
- [ ] Check PR comments are posted
- [ ] Review test results

---
**⚠️ This is a test PR - Close after validation**
" \
    --draft)

echo -e "${GREEN}✅ Pull Request created!${NC}"
echo -e "\n${BLUE}🔗 PR URL: ${PR_URL}${NC}"

# Open PR in browser
echo -e "\n${YELLOW}Opening PR in browser...${NC}"
sleep 2
gh pr view --web

echo -e "\n${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Test PR Created Successfully!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo -e "\n${BLUE}📊 What's happening now:${NC}"
echo "1. GitHub Actions running parallel checks"
echo "2. Jenkins PR pipeline starting (if configured)"
echo "3. Both will post comments when done"

echo -e "\n${BLUE}👀 Monitor progress:${NC}"
echo "• GitHub Actions: ${PR_URL}/checks"
echo "• Jenkins: Check your Jenkins dashboard"
echo "• PR Comments: Will appear in ~5-10 minutes"

echo -e "\n${YELLOW}💡 Tips:${NC}"
echo "• Leave as draft to avoid notifications"
echo "• Mark 'Ready for review' to test full flow"
echo "• Close PR after testing: gh pr close $TEST_BRANCH"
echo "• Delete branch: git push origin --delete $TEST_BRANCH"

echo -e "\n${BLUE}🎯 Next Steps:${NC}"
echo "1. Wait for CI checks to complete"
echo "2. Review PR comments from both systems"
echo "3. Verify all status checks pass"
echo "4. Close PR: gh pr close"

echo -e "\n${GREEN}Happy testing! 🚀${NC}"
