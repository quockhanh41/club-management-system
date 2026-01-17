#!/bin/bash

# =============================================================================
# E2E Test Results Analysis Script
# =============================================================================
# Analyzes Playwright test results from JSON output and applies failure thresholds
# Returns exit code 0 for SUCCESS, 1 for UNSTABLE, 2 for FAILURE
#
# Environment Variables:
#   E2E_FAILURE_THRESHOLD_PERCENT - Maximum failure percentage (default: 10)
#   E2E_FAILURE_THRESHOLD_ABSOLUTE - Maximum absolute failures (default: 24)
#   E2E_THRESHOLD_MODE - Evaluation mode: both/percentage/absolute (default: both)
#   E2E_MARK_UNSTABLE - Mark as UNSTABLE vs SUCCESS when within threshold (default: true)
# =============================================================================

RESULTS_FILE="${1:-test-results/e2e-results.json}"

# Check if results file exists
if [ ! -f "$RESULTS_FILE" ]; then
    echo "❌ Error: Results file not found: $RESULTS_FILE"
    exit 2
fi

echo "🔍 Analyzing E2E test results from ${RESULTS_FILE}..."

# Parse Playwright JSON stats using jq
if ! command -v jq &> /dev/null; then
    echo "⚠️  Warning: jq not found, attempting manual JSON parsing..."
    # Fallback: manual parsing (less reliable)
    PASSED_TESTS=$(grep -oP '"expected":\s*\K[0-9]+' "$RESULTS_FILE" | head -1)
    FAILED_TESTS=$(grep -oP '"unexpected":\s*\K[0-9]+' "$RESULTS_FILE" | head -1)
    FLAKY_TESTS=$(grep -oP '"flaky":\s*\K[0-9]+' "$RESULTS_FILE" | head -1)
    SKIPPED_TESTS=$(grep -oP '"skipped":\s*\K[0-9]+' "$RESULTS_FILE" | head -1)
else
    # Use jq for reliable JSON parsing
    PASSED_TESTS=$(jq -r '.stats.expected // 0' "$RESULTS_FILE")
    FAILED_TESTS=$(jq -r '.stats.unexpected // 0' "$RESULTS_FILE")
    FLAKY_TESTS=$(jq -r '.stats.flaky // 0' "$RESULTS_FILE")
    SKIPPED_TESTS=$(jq -r '.stats.skipped // 0' "$RESULTS_FILE")
fi

# Default to 0 if values are empty
PASSED_TESTS=${PASSED_TESTS:-0}
FAILED_TESTS=${FAILED_TESTS:-0}
FLAKY_TESTS=${FLAKY_TESTS:-0}
SKIPPED_TESTS=${SKIPPED_TESTS:-0}

TOTAL_TESTS=$((PASSED_TESTS + FAILED_TESTS + FLAKY_TESTS + SKIPPED_TESTS))

# Get thresholds from environment or use defaults
THRESHOLD_PERCENT=${E2E_FAILURE_THRESHOLD_PERCENT:-10}
THRESHOLD_ABSOLUTE=${E2E_FAILURE_THRESHOLD_ABSOLUTE:-24}
THRESHOLD_MODE=${E2E_THRESHOLD_MODE:-both}
MARK_UNSTABLE=${E2E_MARK_UNSTABLE:-true}

# Calculate failure rate
if [ $TOTAL_TESTS -gt 0 ]; then
    FAILURE_RATE=$(awk "BEGIN {printf \"%.2f\", ($FAILED_TESTS / $TOTAL_TESTS) * 100}")
    PASS_RATE=$(awk "BEGIN {printf \"%.2f\", 100 - ($FAILED_TESTS / $TOTAL_TESTS) * 100}")
else
    FAILURE_RATE=0
    PASS_RATE=100
fi

# Output results
echo "========================================="
echo "📊 E2E Test Results Summary"
echo "========================================="
echo "Total Tests:    ${TOTAL_TESTS}"
echo "✅ Passed:      ${PASSED_TESTS}"
echo "❌ Failed:      ${FAILED_TESTS}"
echo "⚠️  Flaky:       ${FLAKY_TESTS}"
echo "⏭️  Skipped:     ${SKIPPED_TESTS}"
echo "📈 Pass Rate:   ${PASS_RATE}%"
echo "📉 Fail Rate:   ${FAILURE_RATE}%"
echo "========================================="
echo "🎯 Threshold Configuration"
echo "========================================="
echo "Mode:           ${THRESHOLD_MODE}"
echo "Max Failures:   ${THRESHOLD_ABSOLUTE} tests"
echo "Max Fail Rate:  ${THRESHOLD_PERCENT}%"
echo "Mark Unstable:  ${MARK_UNSTABLE}"
echo "========================================="

# Evaluate thresholds
PERCENTAGE_PASS=$(awk "BEGIN {print ($FAILURE_RATE <= $THRESHOLD_PERCENT) ? 1 : 0}")
ABSOLUTE_PASS=$([[ $FAILED_TESTS -le $THRESHOLD_ABSOLUTE ]] && echo 1 || echo 0)

case "$THRESHOLD_MODE" in
    both)
        echo "📋 Both criteria must pass:"
        echo "   Percentage: $([[ $PERCENTAGE_PASS -eq 1 ]] && echo "✅" || echo "❌") (${FAILURE_RATE}% <= ${THRESHOLD_PERCENT}%)"
        echo "   Absolute:   $([[ $ABSOLUTE_PASS -eq 1 ]] && echo "✅" || echo "❌") (${FAILED_TESTS} <= ${THRESHOLD_ABSOLUTE})"
        THRESHOLD_PASS=$([[ $PERCENTAGE_PASS -eq 1 && $ABSOLUTE_PASS -eq 1 ]] && echo 1 || echo 0)
        ;;
    percentage)
        echo "📋 Percentage criterion:"
        echo "   $([[ $PERCENTAGE_PASS -eq 1 ]] && echo "✅" || echo "❌") (${FAILURE_RATE}% <= ${THRESHOLD_PERCENT}%)"
        THRESHOLD_PASS=$PERCENTAGE_PASS
        ;;
    absolute)
        echo "📋 Absolute criterion:"
        echo "   $([[ $ABSOLUTE_PASS -eq 1 ]] && echo "✅" || echo "❌") (${FAILED_TESTS} <= ${THRESHOLD_ABSOLUTE})"
        THRESHOLD_PASS=$ABSOLUTE_PASS
        ;;
    *)
        echo "❌ Invalid threshold mode: ${THRESHOLD_MODE}"
        exit 2
        ;;
esac

echo "========================================="

# Determine build result
if [ $FAILED_TESTS -eq 0 ]; then
    echo "🎉 All tests passed! Build: SUCCESS"
    EXIT_CODE=0
    BUILD_RESULT="SUCCESS"
elif [ $THRESHOLD_PASS -eq 1 ]; then
    if [ "$MARK_UNSTABLE" = "true" ]; then
        echo "⚠️  Failures within threshold. Build: UNSTABLE"
        EXIT_CODE=1
        BUILD_RESULT="UNSTABLE"
    else
        echo "✅ Failures within threshold. Build: SUCCESS"
        EXIT_CODE=0
        BUILD_RESULT="SUCCESS"
    fi
else
    echo "❌ Failures exceed threshold. Build: FAILURE"
    EXIT_CODE=2
    BUILD_RESULT="FAILURE"
fi

# Create JSON summary file for Jenkins
cat > e2e-test-summary.json <<EOF
{
  "total": $TOTAL_TESTS,
  "passed": $PASSED_TESTS,
  "failed": $FAILED_TESTS,
  "flaky": $FLAKY_TESTS,
  "skipped": $SKIPPED_TESTS,
  "passRate": $PASS_RATE,
  "failureRate": $FAILURE_RATE,
  "thresholdPercent": $THRESHOLD_PERCENT,
  "thresholdAbsolute": $THRESHOLD_ABSOLUTE,
  "thresholdMode": "$THRESHOLD_MODE",
  "buildResult": "$BUILD_RESULT"
}
EOF

echo ""
echo "💾 Summary saved to: e2e-test-summary.json"
echo "🏁 Exit code: $EXIT_CODE ($BUILD_RESULT)"

exit $EXIT_CODE
  "thresholdMode": "$THRESHOLD_MODE",
  "withinThreshold": $([ $SHOULD_FAIL -eq 0 ] && echo "true" || echo "false"),
  "message": "E2E test execution completed",
  "exitCode": $SHOULD_FAIL
}
EOF

echo "📝 Test summary saved to e2e-test-summary.json"
echo "=========================================="

# Exit with appropriate code
# 0 = success (all passed), 1 = exceeds threshold (fail build), 2 = within threshold (mark unstable)
if [ $FAILED_TESTS -eq 0 ]; then
    echo "🎉 All tests passed!"
    exit 0
elif [ $SHOULD_FAIL -eq 1 ]; then
    echo "💥 Build should FAIL - exceeds failure threshold"
    exit 1
else
    echo "⚠️  Build marked UNSTABLE - failures within acceptable range"
    exit 2
fi
