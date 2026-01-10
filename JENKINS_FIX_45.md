# Jenkins Pipeline Fix - Issue #45

## 🐛 Vấn đề đã được fix

Pipeline Jenkins build #45 bị failed do lỗi **`java.io.NotSerializableException: java.util.regex.Matcher`**

### Nguyên nhân
1. **Serialization Error**: Jenkins CPS không thể serialize `Matcher` object được tạo từ `.split()` trong closure
2. **E2E Container No Output**: Container chạy nhưng không có output logs
3. **Missing Error Handling**: Không có fallback mechanism khi test summary file không được tạo

## ✅ Các thay đổi đã implement

### 1. **Jenkinsfile** - Fix Serialization Error
**File**: `/Jenkinsfile`

**Thay đổi**:
- ❌ Removed: `eachLine` closure với `.split()` (tạo non-serializable Matcher)
- ✅ Added: Safe string parsing với `indexOf()` và `substring()`
- ✅ Added: Better error logging và debugging output
- ✅ Added: Fallback mechanism khi test summary không tồn tại

**Code changes**:
```groovy
// TRƯỚC (gây lỗi serialization):
e2eOutput.eachLine { line ->
    if (line.startsWith('E2E_EXIT_CODE:')) {
        actualExitCode = line.split(':')[1].toInteger()  // ❌ Creates Matcher object
    }
}

// SAU (safe parsing):
def lines = e2eOutput.split('\n')
for (int i = 0; i < lines.length; i++) {
    def line = lines[i]
    if (line.indexOf('E2E_EXIT_CODE:') >= 0) {
        exitCodeLine = line
        def colonIndex = line.indexOf(':')
        if (colonIndex >= 0 && colonIndex < line.length() - 1) {
            def exitCodeStr = line.substring(colonIndex + 1).trim()
            actualExitCode = exitCodeStr.toInteger()
        }
        break
    }
}
```

**Error Handling**:
```groovy
// Tạo default summary nếu file không tồn tại
if (!summaryExists) {
    echo "⚠️  Warning: e2e-test-summary.json not found. E2E tests may have failed to run."
    sh '''
        cat > e2e-test-summary.json <<'EOF'
{
  "total": 0,
  "passed": 0,
  "failed": 1,
  "skipped": 0,
  "failureRate": 100,
  "message": "E2E tests failed to execute or summary file not generated"
}
EOF
    '''
}
```

### 2. **Dockerfile.e2e** - Better Output Visibility
**File**: `/Dockerfile.e2e`

**Thay đổi**:
- ✅ Added: Custom entrypoint script `/app/run-tests.sh`
- ✅ Added: Environment variable logging
- ✅ Added: Test execution status reporting
- ✅ Added: Better error handling trong test execution

**Benefits**:
- Output luôn visible ngay cả khi tests fail
- Environment được log để dễ debug
- Exit code được capture đúng

## 🧪 Testing & Verification

### Local Testing

1. **Build E2E runner image**:
```bash
docker compose -f docker-compose.yml \
  -f docker-compose.e2e.yml \
  -f docker-compose.ci.yml \
  -f docker-compose.e2e-runner.yml \
  build e2e-runner
```

2. **Run E2E tests locally**:
```bash
# Start all services first
docker compose -f docker-compose.yml \
  -f docker-compose.e2e.yml \
  -f docker-compose.ci.yml \
  up -d

# Run E2E tests
docker compose -f docker-compose.yml \
  -f docker-compose.e2e.yml \
  -f docker-compose.ci.yml \
  -f docker-compose.e2e-runner.yml \
  run --rm e2e-runner

# Check exit code
echo $?
```

3. **Verify output**:
```bash
# Check if summary file was generated
ls -la e2e-test-summary.json

# View summary
cat e2e-test-summary.json | jq
```

### Jenkins Testing

1. **Trigger new build**: Push code hoặc trigger manual build
2. **Monitor logs**: Kiểm tra console output có các messages mới:
   - `🚀 Starting E2E test runner...`
   - `Exit code line found: ...`
   - `📊 E2E Test Summary:`

3. **Verify artifacts**: Kiểm tra các files được archive:
   - `e2e-test-summary.json`
   - `playwright-report/index.html`
   - `test-results/*.xml`

## 🔍 Debug Guide

### Nếu vẫn thấy serialization error:

1. Check Jenkins version: Cần Jenkins 2.x với Pipeline plugin updated
2. Disable CPS sandbox temporarily để test:
```groovy
@NonCPS
def parseExitCode(String output) {
    // Your parsing logic here
}
```

### Nếu E2E tests không chạy:

1. **Check logs**:
```bash
# View service logs
docker compose -f docker-compose.yml \
  -f docker-compose.e2e.yml \
  -f docker-compose.ci.yml \
  logs frontend kong auth-service

# View E2E runner logs
docker compose -f docker-compose.yml \
  -f docker-compose.e2e.yml \
  -f docker-compose.ci.yml \
  -f docker-compose.e2e-runner.yml \
  logs e2e-runner
```

2. **Check network connectivity**:
```bash
# Test from inside e2e-runner
docker compose -f docker-compose.yml \
  -f docker-compose.e2e.yml \
  -f docker-compose.ci.yml \
  -f docker-compose.e2e-runner.yml \
  run --rm e2e-runner /bin/bash

# Inside container:
curl http://frontend:3000
curl http://kong:8000
ping frontend
```

3. **Check environment variables**:
```bash
# Print env variables
docker compose -f docker-compose.yml \
  -f docker-compose.e2e.yml \
  -f docker-compose.ci.yml \
  -f docker-compose.e2e-runner.yml \
  run --rm e2e-runner env | grep -E "BASE_URL|API_GATEWAY"
```

### Nếu tests fail unexpectedly:

1. **View Playwright report locally**:
```bash
# Copy report from container
docker compose -f docker-compose.yml \
  -f docker-compose.e2e.yml \
  -f docker-compose.ci.yml \
  -f docker-compose.e2e-runner.yml \
  run --rm -v $(pwd)/playwright-report:/app/playwright-report \
  e2e-runner

# Open report
npx playwright show-report playwright-report
```

2. **Run tests in headed mode locally**:
```bash
# Remove CI=true để chạy với browser UI
docker compose -f docker-compose.yml \
  -f docker-compose.e2e.yml \
  up -d

# Run locally without Docker
export BASE_URL=http://localhost:3000
export API_GATEWAY_URL=http://localhost:8000
npx playwright test --headed
```

## 📊 Expected Behavior After Fix

### Success Case
```
🚀 Starting E2E test runner...
========================================
🎭 Starting E2E Test Execution
========================================
Environment:
  - BASE_URL: http://frontend:3000
  - API_GATEWAY_URL: http://kong:8000
  - CI: true
========================================

Running 15 tests...
  ✓ Test 1 passed
  ✓ Test 2 passed
  ...

========================================
📊 Test Execution Summary
========================================
✅ Test results file generated
✅ HTML report generated
========================================
E2E_EXIT_CODE:0
📊 E2E tests completed with exit code: 0
```

### Failure Case (với proper error handling)
```
🚀 Starting E2E test runner...
...
E2E_EXIT_CODE:1
📊 E2E tests completed with exit code: 1
Exit code line found: E2E_EXIT_CODE:1

📊 E2E Test Summary:
   Total:        15
   ✅ Passed:     12
   ❌ Failed:     3
   ⏭️ Skipped:    0
   📈 Fail Rate:  20.00%

⚠️  Build marked UNSTABLE: 3 tests failed (within acceptable threshold)
```

## 🎯 Next Steps

1. **Monitor build #46**: Verify the fix works
2. **Review actual test failures**: Nếu tests vẫn fail, debug từng test case
3. **Optimize thresholds**: Điều chỉnh `E2E_FAILURE_THRESHOLD_PERCENT` và `E2E_FAILURE_THRESHOLD_ABSOLUTE` nếu cần

## 📝 Notes

- **Serialization issue**: Đây là vấn đề phổ biến với Jenkins CPS. Luôn tránh dùng complex objects trong closures
- **Test output**: Docker output có thể bị buffer. Script `/app/run-tests.sh` đảm bảo output được flush
- **Exit codes**: 
  - 0 = All tests passed
  - 1 = Tests exceeded threshold (FAILURE)
  - 2 = Tests failed but within threshold (UNSTABLE)

## 🔗 Related Files

- `Jenkinsfile` - Main pipeline definition
- `Dockerfile.e2e` - E2E test runner image
- `docker-compose.e2e-runner.yml` - E2E runner service config
- `scripts/analyze-e2e-results.sh` - Test results analysis script

---

**Người thực hiện**: AI Assistant  
**Ngày**: 2026-01-11  
**Issue**: #45 - Jenkins Pipeline Failed
