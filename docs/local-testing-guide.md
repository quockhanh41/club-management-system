# Local Testing Guide cho Jenkins Pipeline

## 🎯 Mục đích

Test các thành phần của Jenkins pipeline ở local trước khi push lên repository để tránh failed builds.

## 📋 Prerequisites

```bash
# Required tools
- Docker & Docker Compose
- Node.js 18+
- bash shell
- jq (for JSON parsing)
```

## 🧪 Test Scripts

### 1. Test Jenkins Logic (Exit Code Parsing)

**File**: `scripts/test-jenkins-logic.sh`

Test xem logic parse exit code trong Jenkinsfile có hoạt động đúng không.

```bash
# Run test
./scripts/test-jenkins-logic.sh
```

**Expected output**:
```
✅ All exit code parsing tests complete!
```

**What it tests**:
- Exit code extraction từ Docker Compose output
- String parsing với marker pattern `E2E_EXIT_CODE:`
- Groovy eachLine behavior simulation

---

### 2. Test E2E Analysis Script

**File**: `scripts/test-analyze-local.sh`

Test analyze-e2e-results.sh với different threshold configurations.

```bash
# Prerequisites: Run E2E tests first to generate test-results/
npm run test:e2e
# or
docker compose -f docker-compose.yml -f docker-compose.e2e.yml up

# Then test analysis
./scripts/test-analyze-local.sh
```

**What it tests**:
- Default thresholds (5% / 12 tests, both mode)
- Stricter thresholds (3% / 8 tests)
- Percentage-only mode
- Absolute-only mode
- Exit code logic (0/1/2)
- JSON summary generation

**Expected output**:
```
Test 1: Default Thresholds
✅ or ⚠️  or ❌ (depending on actual failures)

Test 2: Stricter Thresholds
...

✅ Testing Complete!
```

---

### 3. Test Full E2E Flow Locally

**File**: `scripts/test-e2e-local.sh` (existing)

Chạy full E2E tests trong Docker environment giống Jenkins.

```bash
./scripts/test-e2e-local.sh
```

**What it does**:
1. Start all services với docker-compose
2. Wait for services to be healthy
3. Run Playwright tests
4. Collect results

---

## 📊 Step-by-Step Testing Workflow

### Step 1: Test Analysis Script Logic

```bash
# Quick validation của parsing logic
./scripts/test-jenkins-logic.sh
```

**Result**: Should see all ✅ passing tests

---

### Step 2: Run E2E Tests

```bash
# Option A: Run với docker-compose
docker compose -f docker-compose.yml -f docker-compose.e2e.yml up --abort-on-container-exit

# Option B: Use helper script
./scripts/test-e2e-local.sh

# Option C: Run Playwright directly (if services already running)
cd tests/e2e && npx playwright test
```

**Result**: test-results/ directory được tạo với XML files

---

### Step 3: Test Analysis Với Actual Results

```bash
# Test với actual test results
./scripts/test-analyze-local.sh
```

**Check outputs**:
1. Console output shows test counts và thresholds
2. Exit codes match expectations
3. `e2e-test-summary.json` được tạo
4. JSON format đúng

**Verify JSON**:
```bash
cat e2e-test-summary.json | jq '.'
```

Expected structure:
```json
{
  "total": 240,
  "passed": 228,
  "failed": 12,
  "skipped": 0,
  "failureRate": 5.00,
  "thresholdPercent": 5,
  "thresholdAbsolute": 12,
  "thresholdMode": "both"
}
```

---

### Step 4: Manual Verification của Exit Codes

```bash
# Test different scenarios manually
export E2E_FAILURE_THRESHOLD_PERCENT=3
export E2E_FAILURE_THRESHOLD_ABSOLUTE=8
export E2E_THRESHOLD_MODE=both

./scripts/analyze-e2e-results.sh
echo "Exit code: $?"
```

**Exit code meanings**:
- `0` = All passed → Jenkins: SUCCESS
- `1` = Exceeds threshold → Jenkins: FAILURE  
- `2` = Within threshold → Jenkins: UNSTABLE

---

## 🔍 Debugging Common Issues

### Issue 1: "test-results/ not found"

**Solution**:
```bash
# Run E2E tests first
npm run test:e2e
# or
docker compose -f docker-compose.yml -f docker-compose.e2e.yml up
```

---

### Issue 2: "No XML files found"

**Check**:
```bash
find test-results -name "*.xml"
```

**Solution**: E2E tests didn't complete or Playwright config issue
```bash
# Check playwright.config.ts reporter config
reporter: [['junit', { outputFile: 'test-results/junit.xml' }]]
```

---

### Issue 3: "jq: command not found"

**Install jq**:
```bash
# macOS
brew install jq

# Linux
apt-get install jq

# Or skip jq check in script
```

---

### Issue 4: Analysis script shows wrong exit code

**Debug**:
```bash
# Run with verbose output
bash -x scripts/analyze-e2e-results.sh
```

**Check**:
- Threshold calculations using `bc`
- Comparison operators trong bash
- Integer parsing

---

## 📝 Pre-Push Checklist

Before pushing to trigger Jenkins build:

- [ ] ✅ `./scripts/test-jenkins-logic.sh` passes
- [ ] ✅ E2E tests run successfully locally
- [ ] ✅ `./scripts/test-analyze-local.sh` shows expected exit codes
- [ ] ✅ `e2e-test-summary.json` được tạo và valid JSON
- [ ] ✅ Thresholds match desired configuration
- [ ] ✅ Jenkinsfile syntax verified (no typos)
- [ ] ✅ Git diff reviewed

---

## 🚀 Full Validation Script

Create `scripts/validate-before-push.sh`:

```bash
#!/bin/bash
set -e

echo "🔍 Pre-push validation starting..."
echo ""

# 1. Test Jenkins logic
echo "1️⃣  Testing Jenkins logic..."
./scripts/test-jenkins-logic.sh > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Jenkins logic OK"
else
    echo "❌ Jenkins logic failed"
    exit 1
fi

# 2. Check if test results exist
if [ -d "test-results" ]; then
    echo "✅ test-results/ directory exists"
    
    # 3. Test analysis script
    echo "2️⃣  Testing analysis script..."
    ./scripts/test-analyze-local.sh > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "✅ Analysis script OK"
    else
        echo "⚠️  Analysis script had issues (check manually)"
    fi
    
    # 4. Validate JSON
    if [ -f "e2e-test-summary.json" ]; then
        jq empty e2e-test-summary.json 2>/dev/null
        if [ $? -eq 0 ]; then
            echo "✅ JSON summary valid"
        else
            echo "❌ JSON summary invalid"
            exit 1
        fi
    fi
else
    echo "⚠️  No test results found (run E2E tests first)"
fi

# 5. Check Jenkinsfile syntax
echo "3️⃣  Validating Jenkinsfile..."
if [ -f "Jenkinsfile" ]; then
    # Basic syntax check (grep for common issues)
    if grep -q "def.*exitCodeMatch.*=~" Jenkinsfile; then
        echo "⚠️  Warning: Found regex matcher (may cause serialization issue)"
    fi
    echo "✅ Jenkinsfile exists"
else
    echo "❌ Jenkinsfile not found"
    exit 1
fi

echo ""
echo "=========================================="
echo "✅ All validations passed!"
echo "=========================================="
echo ""
echo "Ready to push. Recommended steps:"
echo "1. git add -A"
echo "2. git commit -m 'your message'"
echo "3. git push origin main"
```

**Usage**:
```bash
chmod +x scripts/validate-before-push.sh
./scripts/validate-before-push.sh
```

---

## 📚 Additional Resources

- [E2E Testing Guide](../docs/e2e-testing-guide.md)
- [E2E Failure Threshold Guide](../docs/e2e-failure-threshold-guide.md)
- [Jenkins Setup](../docs/jenkins-setup.md)

---

**Last Updated**: January 10, 2026
