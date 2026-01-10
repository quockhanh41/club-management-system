# E2E Test Failure Threshold Guide

## Overview

Jenkins pipeline được cấu hình với hệ thống failure threshold linh hoạt cho E2E tests. Thay vì fail ngay lập tức khi có test failures, pipeline sẽ đánh giá xem số lượng failures có trong mức chấp nhận được hay không.

## Tại sao cần Failure Threshold?

E2E tests trong môi trường CI thường có failure rate cao hơn local do:
- **Timing issues**: CI environment chậm hơn (đặc biệt là ARM64 Jenkins)
- **Browser compatibility**: Mobile browsers có các vấn đề riêng
- **Infrastructure differences**: Network latency, container startup time
- **Flaky tests**: Tests có thể pass/fail không ổn định

Build #43 cho thấy: 12/240 tests failed (5% failure rate) - hầu hết là timing và mobile browser issues.

## Cách hoạt động

### 1. Analyze Script

Script `scripts/analyze-e2e-results.sh`:
- Parse JUnit XML files từ `test-results/` directory
- Tính toán: total, passed, failed, skipped tests và failure rate percentage
- So sánh với thresholds được config
- Return exit code:
  - `0`: All tests passed
  - `1`: Exceeds threshold → FAIL build
  - `2`: Within threshold → UNSTABLE build

### 2. Jenkins Pipeline Integration

Pipeline tự động:
1. Chạy E2E tests (không fail ngay lập tức)
2. Capture exit code từ test execution
3. Run analysis script
4. Read JSON summary
5. Set build status dựa trên analysis result:
   - **SUCCESS**: Tất cả tests pass
   - **UNSTABLE**: Có failures nhưng trong threshold
   - **FAILURE**: Failures vượt quá threshold

### 3. HTML Report

Jenkins tạo HTML report với:
- Visual metrics: Total/Passed/Failed/Skipped
- Failure rate percentage
- Threshold comparison
- Build status badge

## Configuration

### Environment Variables

Trong Jenkinsfile environment block:

```groovy
environment {
    // Maximum percentage of tests allowed to fail (0-100)
    E2E_FAILURE_THRESHOLD_PERCENT = "5"
    
    // Maximum absolute number of tests allowed to fail
    E2E_FAILURE_THRESHOLD_ABSOLUTE = "12"
    
    // Which threshold to use: 'percentage', 'absolute', or 'both'
    E2E_THRESHOLD_MODE = "both"
    
    // Mark build as UNSTABLE instead of SUCCESS when failures are within threshold
    E2E_MARK_UNSTABLE = "true"
}
```

### Jenkins Parameters

Có thể override values qua Jenkins UI khi trigger build:
- `E2E_FAILURE_THRESHOLD_PERCENT`: "5" (default)
- `E2E_FAILURE_THRESHOLD_ABSOLUTE`: "12" (default)
- `E2E_THRESHOLD_MODE`: "both", "percentage", "absolute"
- `E2E_MARK_UNSTABLE`: true/false

## Threshold Modes

### 1. `percentage` Mode

Build passes nếu failure rate **≤ threshold percentage**:

```
Example: THRESHOLD_PERCENT = 5%
- 240 tests, 12 failed → 5.00% → ✅ PASS
- 240 tests, 13 failed → 5.42% → ❌ FAIL
```

**Khi nào dùng**: Khi số lượng tests thay đổi thường xuyên (thêm/xóa tests).

### 2. `absolute` Mode

Build passes nếu failed tests **≤ threshold absolute**:

```
Example: THRESHOLD_ABSOLUTE = 12
- 240 tests, 12 failed → ✅ PASS
- 240 tests, 13 failed → ❌ FAIL
```

**Khi nào dùng**: Khi muốn giới hạn số lượng failures cố định, không phụ thuộc tổng số tests.

### 3. `both` Mode (Recommended - Stricter)

Build passes chỉ khi **cả hai** thresholds được thỏa mãn:

```
Example: THRESHOLD_PERCENT = 5%, THRESHOLD_ABSOLUTE = 12
- 240 tests, 10 failed → 4.17% AND 10 tests → ✅ PASS
- 240 tests, 12 failed → 5.00% AND 12 tests → ✅ PASS
- 240 tests, 13 failed → 5.42% OR 13 tests → ❌ FAIL (exceeds one)
- 200 tests, 12 failed → 6.00% OR 12 tests → ❌ FAIL (exceeds percentage)
```

**Khi nào dùng**: Production pipelines - đảm bảo cả rate và absolute count đều trong kiểm soát.

## Recommended Settings

### Development Branch
```groovy
E2E_FAILURE_THRESHOLD_PERCENT = "10"     // More lenient
E2E_FAILURE_THRESHOLD_ABSOLUTE = "20"
E2E_THRESHOLD_MODE = "absolute"          // Focus on count
E2E_MARK_UNSTABLE = "true"
```

### Staging Branch
```groovy
E2E_FAILURE_THRESHOLD_PERCENT = "5"      // Stricter
E2E_FAILURE_THRESHOLD_ABSOLUTE = "12"
E2E_THRESHOLD_MODE = "both"              // Both must pass
E2E_MARK_UNSTABLE = "true"
```

### Production Branch
```groovy
E2E_FAILURE_THRESHOLD_PERCENT = "3"      // Very strict
E2E_FAILURE_THRESHOLD_ABSOLUTE = "8"
E2E_THRESHOLD_MODE = "both"
E2E_MARK_UNSTABLE = "false"              // Treat as SUCCESS if within threshold
```

## Build Status Logic

### SUCCESS (Green)
- All tests passed **OR**
- Failures within threshold and `E2E_MARK_UNSTABLE = false`

### UNSTABLE (Yellow)
- Failures within threshold and `E2E_MARK_UNSTABLE = true`
- Pipeline continues to deployment stages
- Visible warning in build history

### FAILURE (Red)
- Failures exceed threshold
- Pipeline stops immediately
- Requires investigation before deployment

## Viewing Results

### 1. Console Output

```
📊 E2E Test Summary:
   Total:        240
   ✅ Passed:     228
   ❌ Failed:     12
   ⏭️ Skipped:    0
   📈 Fail Rate:  5.00%

✅ Tests are within both thresholds
⚠️  Build marked UNSTABLE - failures within acceptable range
```

### 2. Jenkins Artifacts

- `e2e-test-summary.json`: Machine-readable summary
- `e2e-summary.html`: Visual HTML report with metrics

### 3. Jenkins UI

- **Build Status**: Color-coded (Green/Yellow/Red)
- **E2E Test Summary**: HTML report với threshold comparison
- **Playwright Report**: Detailed test execution report

## Examples

### Example 1: Perfect Pass
```
Total: 240, Failed: 0
Result: ✅ SUCCESS - All tests passed!
```

### Example 2: Within Threshold (Percentage)
```
Mode: percentage, Threshold: 5%
Total: 240, Failed: 12 (5.00%)
Result: ⚠️ UNSTABLE - Within threshold
```

### Example 3: Within Threshold (Both)
```
Mode: both, Threshold: 5% / 12 tests
Total: 240, Failed: 10 (4.17%)
Result: ⚠️ UNSTABLE - Within both thresholds
```

### Example 4: Exceeds Threshold
```
Mode: both, Threshold: 5% / 12 tests
Total: 240, Failed: 15 (6.25%)
Result: ❌ FAILURE - Exceeds both thresholds
```

## Troubleshooting

### Build fails với "Script not found"
```bash
# Make script executable
chmod +x scripts/analyze-e2e-results.sh
git add scripts/analyze-e2e-results.sh
git commit -m "Make analyze script executable"
```

### Missing test-results directory
```bash
# Script handles này gracefully:
# - Creates empty JSON with 0 tests
# - Returns exit code 0 (no failures)
```

### JSON parsing errors
```bash
# Ensure jq is installed on Jenkins agent
sudo apt-get install jq -y
```

### HTML placeholders not replaced
```bash
# Check e2e-test-summary.json exists
# Check sed commands execute successfully
# Verify JSON format is valid
```

## Monitoring and Trends

### Track Failure Rates
- Monitor `e2e-test-summary.json` across builds
- Set up alerts nếu failure rate trends upward
- Review specific failed tests regularly

### Adjust Thresholds
- **Quá nhiều UNSTABLE builds**: Lower thresholds
- **Quá nhiều FAILURE builds**: Investigate và fix tests, hoặc raise thresholds temporarily
- **Failure rate giảm**: Congratulations! Consider lowering thresholds

### Jenkins Trends Plugin
```groovy
// Add to Jenkinsfile post block
archiveArtifacts artifacts: 'e2e-test-summary.json'
// Use JSON API để track trends over time
```

## Best Practices

1. **Start Conservative**: Begin với thresholds cao hơn, giảm dần khi tests ổn định
2. **Monitor Trends**: Track failure rates qua nhiều builds
3. **Investigate Failures**: Đừng ignore failures chỉ vì within threshold
4. **Fix Flaky Tests**: Priority cao cho tests fail không ổn định
5. **Update Thresholds**: Review và adjust quarterly dựa trên metrics
6. **Document Changes**: Ghi rõ lý do khi thay đổi thresholds

## Related Documentation

- [E2E Testing Guide](./e2e-testing-guide.md)
- [Jenkins Setup](./jenkins-setup.md)
- [CI/CD Fix Documentation](./E2E_CICD_FIX.md)

---

**Last Updated**: 2024
**Version**: 1.0
**Status**: Active
