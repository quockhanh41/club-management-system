# Local E2E Testing Debug Guide

## 🎯 Mục đích
Hướng dẫn debug E2E tests nhanh chóng bằng cách:
1. Mount local workspace vào Jenkins
2. Chỉ chạy một vài test cases thay vì toàn bộ
3. Debug JSON results file generation

## 📋 Prerequisites

### 1. Setup Docker Volume Mount cho Jenkins Agent

Bạn cần mount workspace local vào Jenkins e2e-agent tại `/workspace`.

**Cập nhật docker-compose cho Jenkins:**

```yaml
# docker-compose.jenkins.yml hoặc start command
services:
  jenkins-e2e-agent:
    volumes:
      - /Users/quockhanh/Documents/Code/club-management-system:/workspace:ro
```

**Hoặc nếu chạy agent manually:**

```bash
docker run -d \
  --name jenkins-e2e-agent \
  -v /Users/quockhanh/Documents/Code/club-management-system:/workspace:ro \
  -v /var/run/docker.sock:/var/run/docker.sock \
  jenkins/inbound-agent
```

## 🚀 Cách sử dụng

### Option 1: Chạy một vài test cases để debug (RECOMMENDED)

1. **Trigger Jenkins build với parameters:**

   ```
   LOCAL_DEBUG: ✅ true
   E2E_TEST_FILTER: "00-smoke"  (hoặc "00-basic-ui" hoặc pattern bất kỳ)
   ```

2. **Các pattern hữu ích:**
   - `00-smoke` - Chỉ smoke tests (2 tests)
   - `00-basic-ui` - Basic UI tests (6 tests)
   - `01-user-authentication` - Auth tests (8 tests)
   - `02-club` - Club management tests
   - Để trống để chạy tất cả (250 tests)

3. **Pipeline sẽ:**
   - Copy code từ `/workspace` thay vì git checkout
   - Chạy chỉ tests matching pattern
   - Tốc độ nhanh hơn rất nhiều (vài phút vs 8 phút)

### Option 2: Debug JSON file generation

Pipeline hiện có debug logging để check JSON file:

```bash
📁 Checking test-results directory...
ls -la test-results/

✅ JSON results file found
📄 First 50 lines of JSON:
{
  "config": {...},
  "suites": [...]
}
```

**Hoặc ❌ JSON results file NOT found**

Nếu không tìm thấy, pipeline sẽ list tất cả JSON files trong test-results.

## 📊 Debug Workflow Example

### Scenario: Debug tại sao JSON file không được tạo

1. **Chạy build với minimal tests:**
   ```
   LOCAL_DEBUG: true
   E2E_TEST_FILTER: "00-smoke"
   E2E_FAILURE_THRESHOLD_PERCENT: 100
   E2E_MARK_UNSTABLE: false
   ```

2. **Check Jenkins console output:**
   ```
   🐛 LOCAL_DEBUG enabled - using mounted workspace at /workspace
   Syncing from /workspace to /home/jenkins/agent/workspace/...
   
   🔍 Test filter enabled: 00-smoke
   ▶️  Running 2 tests...
   
   📁 Checking test-results directory...
   test-results/
   ├── e2e-results.json  ✅
   ├── e2e-results.xml
   └── ...
   ```

3. **Nếu JSON không có:**
   - Check playwright.config.ts có json reporter
   - Check permissions của test-results directory
   - Check Dockerfile.e2e có mount volumes đúng không

## 🔧 Troubleshooting

### Issue: `/workspace not found`

**Solution:** Mount volume chưa được setup

```bash
docker inspect jenkins-e2e-agent | grep -A 5 Mounts
# Phải thấy /workspace trong list
```

### Issue: Tests không chạy với filter

**Lỗi:** `No tests found`

**Solution:** Check pattern syntax
```bash
# ĐÚNG:
E2E_TEST_FILTER: "00-smoke"

# SAI:
E2E_TEST_FILTER: "tests/e2e/specs/00-smoke*"  # Không cần full path
```

### Issue: JSON file vẫn không tạo ra

**Debug steps:**

1. **Manually test trong e2e-runner container:**

```bash
# SSH vào e2e-agent
docker exec -it jenkins-e2e-agent bash

# Navigate to workspace
cd /home/jenkins/agent/workspace/club-management-pipeline

# Run docker compose manually
docker compose -f docker-compose.yml \
  -f docker-compose.e2e.yml \
  -f docker-compose.ci.yml \
  -f docker-compose.e2e-runner.yml \
  run --rm e2e-runner npx playwright test --grep "00-smoke" \
  --reporter=list,html,junit,json

# Check output
ls -la test-results/
cat test-results/e2e-results.json
```

2. **Check playwright.config.ts:**

```typescript
reporter: [
  ['list'],
  ['html'],
  ['junit', { outputFile: 'test-results/e2e-results.xml' }],
  ['json', { outputFile: 'test-results/e2e-results.json' }]  // ✅ Cần có dòng này
],
```

3. **Check volume mounts:**

```bash
docker compose -f docker-compose.e2e-runner.yml config | grep -A 5 volumes
# Phải thấy:
# - ./test-results:/app/test-results
```

## 📈 Performance Comparison

| Mode | Tests | Time | Use Case |
|------|-------|------|----------|
| Full run (250 tests) | All | ~8-10 min | Production, final validation |
| Smoke tests only | 2 | ~30 sec | Quick sanity check |
| Basic UI tests | 6 | ~1 min | UI regression check |
| Auth tests | 8 | ~2 min | Auth flow validation |
| Single spec | 5-10 | ~1-2 min | Debugging specific feature |

## 💡 Best Practices

1. **Luôn dùng LOCAL_DEBUG khi debug:**
   - Không cần commit code
   - Edit local → trigger build → see results ngay
   - Nhanh hơn git push/checkout

2. **Dùng test filter để debug nhanh:**
   - Start với smoke tests
   - Nếu pass, expand thêm tests
   - Chỉ run full suite khi confident

3. **Check JSON file generation:**
   - Luôn check debug output trong console
   - Verify volumes mounted đúng
   - Test manual nếu cần

4. **Threshold settings cho debug:**
   ```
   E2E_FAILURE_THRESHOLD_PERCENT: 100
   E2E_MARK_UNSTABLE: false
   ```
   → Cho phép mọi test fail mà build vẫn success

## 🎓 Quick Reference

### Jenkins Parameters Quick Setup

**Fast Debug Mode:**
```
LOCAL_DEBUG: ✅
E2E_TEST_FILTER: "00-smoke"
E2E_FAILURE_THRESHOLD_PERCENT: 100
E2E_THRESHOLD_MODE: percentage
E2E_MARK_UNSTABLE: ❌
```

**Production Mode:**
```
LOCAL_DEBUG: ❌
E2E_TEST_FILTER: (empty - run all)
E2E_FAILURE_THRESHOLD_PERCENT: 10
E2E_THRESHOLD_MODE: both
E2E_MARK_UNSTABLE: ✅
```

## 📚 Related Documentation

- [E2E Testing Guide](./e2e-testing-guide.md)
- [Local Testing Guide](./local-testing-guide.md)
- [Jenkins Setup](./jenkins-setup.md)
