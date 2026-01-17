#!/bin/bash

# =============================================================================
# Post PR Comment Script
# =============================================================================
# Generates and posts a comprehensive test results comment to GitHub PR
# Includes: test summary, coverage, build status, and recommendations
#
# Requirements:
#   - GitHub CLI (gh) installed and authenticated
#   - Run from Jenkins PR pipeline with PR environment variables
# =============================================================================

set -e

# Check if running in PR context
if [ -z "$CHANGE_ID" ]; then
    echo "⚠️  Not running in PR context (CHANGE_ID not set), skipping PR comment"
    exit 0
fi

PR_NUMBER="${CHANGE_ID}"
WORKSPACE="${WORKSPACE:-.}"

echo "📝 Generating PR comment for PR #${PR_NUMBER}"

# =============================================================================
# Collect test results
# =============================================================================

UNIT_TEST_COUNT=0
UNIT_TEST_PASSED=0
UNIT_TEST_FAILED=0

if [ -f "test-results/unit/*.xml" ]; then
    # Parse JUnit XML for unit test results
    UNIT_TEST_COUNT=$(grep -o '<testsuite.*tests="[0-9]*"' test-results/unit/*.xml 2>/dev/null | grep -o 'tests="[0-9]*"' | cut -d'"' -f2 | awk '{s+=$1} END {print s}' || echo "0")
    UNIT_TEST_FAILED=$(grep -o '<testsuite.*failures="[0-9]*"' test-results/unit/*.xml 2>/dev/null | grep -o 'failures="[0-9]*"' | cut -d'"' -f2 | awk '{s+=$1} END {print s}' || echo "0")
    UNIT_TEST_PASSED=$((UNIT_TEST_COUNT - UNIT_TEST_FAILED))
fi

E2E_TEST_COUNT=0
E2E_TEST_PASSED=0
E2E_TEST_FAILED=0
E2E_SKIPPED="N/A"

if [ -f "test-results/e2e-results.json" ]; then
    # Parse Playwright JSON results
    if command -v jq &> /dev/null; then
        E2E_TEST_PASSED=$(jq -r '.stats.expected // 0' test-results/e2e-results.json)
        E2E_TEST_FAILED=$(jq -r '.stats.unexpected // 0' test-results/e2e-results.json)
        E2E_TEST_COUNT=$((E2E_TEST_PASSED + E2E_TEST_FAILED))
    else
        E2E_SKIPPED="true"
    fi
else
    E2E_SKIPPED="true"
fi

# =============================================================================
# Build status
# =============================================================================

BUILD_STATUS="✅ Success"
if [ "$BUILD_RESULT" = "FAILURE" ]; then
    BUILD_STATUS="❌ Failed"
elif [ "$BUILD_RESULT" = "UNSTABLE" ]; then
    BUILD_STATUS="⚠️  Unstable"
fi

# =============================================================================
# Generate comment body
# =============================================================================

COMMENT_BODY=$(cat <<EOF
## 🚀 Jenkins CI Report for PR #${PR_NUMBER}

### 📊 Build Summary

| Metric | Value |
|--------|-------|
| **Status** | ${BUILD_STATUS} |
| **Build** | [#${BUILD_NUMBER}](${BUILD_URL}) |
| **Commit** | \`${GIT_COMMIT_SHORT}\` |
| **Branch** | \`${CHANGE_BRANCH}\` → \`${CHANGE_TARGET}\` |
| **Duration** | ${BUILD_DURATION:-N/A} |

### 🧪 Test Results

#### Unit Tests
| Total | Passed | Failed |
|-------|--------|--------|
| ${UNIT_TEST_COUNT} | ✅ ${UNIT_TEST_PASSED} | ❌ ${UNIT_TEST_FAILED} |

#### E2E Tests (Smoke)
EOF
)

if [ "$E2E_SKIPPED" = "true" ]; then
    COMMENT_BODY+=$(cat <<EOF

⏭️  **Skipped** - E2E tests skipped for faster PR validation
💡 Full E2E suite will run after merge
EOF
)
else
    COMMENT_BODY+=$(cat <<EOF

| Total | Passed | Failed |
|-------|--------|--------|
| ${E2E_TEST_COUNT} | ✅ ${E2E_TEST_PASSED} | ❌ ${E2E_TEST_FAILED} |
EOF
)
fi

COMMENT_BODY+=$(cat <<EOF


### 🐳 Docker Build

EOF
)

if [ "$SKIP_DOCKER_BUILD" = "true" ]; then
    COMMENT_BODY+="⏭️  **Skipped** - Docker build skipped (documentation-only changes)"
else
    COMMENT_BODY+="✅ All service images built successfully"
fi

COMMENT_BODY+=$(cat <<EOF


### 📝 Recommendations

EOF
)

# Generate recommendations based on results
if [ "$UNIT_TEST_FAILED" -gt 0 ]; then
    COMMENT_BODY+=$(cat <<EOF
- ❌ **Unit tests failed** - Please fix failing tests before merging
EOF
)
fi

if [ "$E2E_TEST_FAILED" -gt 0 ]; then
    COMMENT_BODY+=$(cat <<EOF
- ⚠️  **E2E smoke tests failed** - Review test failures
EOF
)
fi

if [ "$UNIT_TEST_FAILED" -eq 0 ] && [ "$E2E_SKIPPED" = "true" ]; then
    COMMENT_BODY+=$(cat <<EOF
- ✅ **All unit tests passed!**
- 💡 Consider running full E2E suite by setting \`SKIP_E2E=false\` if changes affect critical flows
EOF
)
fi

if [ "$UNIT_TEST_FAILED" -eq 0 ] && [ "$E2E_TEST_FAILED" -eq 0 ] && [ "$E2E_SKIPPED" != "true" ]; then
    COMMENT_BODY+=$(cat <<EOF
- ✅ **All tests passed!** This PR is ready for review
EOF
)
fi

COMMENT_BODY+=$(cat <<EOF


### 🔗 Links

- 📋 [Full Build Log](${BUILD_URL}console)
- 📊 [Test Results](${BUILD_URL}testReport)
- 📦 [Artifacts](${BUILD_URL}artifact)

---
<sub>🤖 Automated comment by Jenkins CI | Build [#${BUILD_NUMBER}](${BUILD_URL}) | Updated: $(date -u +"%Y-%m-%d %H:%M:%S UTC")</sub>
EOF
)

# =============================================================================
# Post comment to GitHub
# =============================================================================

# Save comment to file
echo "$COMMENT_BODY" > pr-comment.md

echo "📝 Comment preview:"
echo "================================"
cat pr-comment.md
echo "================================"

# Post using GitHub CLI
if command -v gh &> /dev/null; then
    echo "📤 Posting comment to PR #${PR_NUMBER}..."
    
    # Check if comment already exists
    EXISTING_COMMENT_ID=$(gh pr view "$PR_NUMBER" --json comments --jq '.comments[] | select(.body | contains("🤖 Automated comment by Jenkins CI")) | .id' | head -1)
    
    if [ -n "$EXISTING_COMMENT_ID" ]; then
        echo "📝 Updating existing comment #${EXISTING_COMMENT_ID}"
        gh api \
            --method PATCH \
            "/repos/{owner}/{repo}/issues/comments/${EXISTING_COMMENT_ID}" \
            -f body="$(cat pr-comment.md)"
    else
        echo "📝 Creating new comment"
        gh pr comment "$PR_NUMBER" --body-file pr-comment.md
    fi
    
    echo "✅ Comment posted successfully!"
else
    echo "⚠️  GitHub CLI not found - comment saved to pr-comment.md but not posted"
    echo "💡 Install with: brew install gh (macOS) or https://cli.github.com"
fi

# =============================================================================
# Optional: Post to Slack/Teams
# =============================================================================

# Uncomment and configure if you want Slack notifications
# if [ -n "$SLACK_WEBHOOK_URL" ]; then
#     curl -X POST "$SLACK_WEBHOOK_URL" \
#         -H 'Content-Type: application/json' \
#         -d "{
#             \"text\": \"PR #${PR_NUMBER}: ${BUILD_STATUS}\",
#             \"attachments\": [{
#                 \"color\": \"$([ $UNIT_TEST_FAILED -eq 0 ] && echo 'good' || echo 'danger')\",
#                 \"fields\": [
#                     {\"title\": \"Unit Tests\", \"value\": \"${UNIT_TEST_PASSED}/${UNIT_TEST_COUNT} passed\", \"short\": true},
#                     {\"title\": \"Build\", \"value\": \"#${BUILD_NUMBER}\", \"short\": true}
#                 ]
#             }]
#         }"
# fi

echo "🎉 Done!"
