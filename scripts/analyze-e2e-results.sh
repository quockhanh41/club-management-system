#!/bin/bash

# Parse Playwright JUnit XML results
RESULTS_DIR="test-results"
TOTAL_TESTS=0
FAILED_TESTS=0
PASSED_TESTS=0
SKIPPED_TESTS=0

echo "🔍 Analyzing E2E test results from ${RESULTS_DIR}..."

# Parse all JUnit XML files
for xml_file in $(find $RESULTS_DIR -name "*.xml" 2>/dev/null); do
    if [ -f "$xml_file" ]; then
        # Extract test counts from XML
        tests=$(grep -oP 'tests="\K[0-9]+' "$xml_file" | head -1)
        failures=$(grep -oP 'failures="\K[0-9]+' "$xml_file" | head -1)
        skipped=$(grep -oP 'skipped="\K[0-9]+' "$xml_file" | head -1)
        
        TOTAL_TESTS=$((TOTAL_TESTS + ${tests:-0}))
        FAILED_TESTS=$((FAILED_TESTS + ${failures:-0}))
        SKIPPED_TESTS=$((SKIPPED_TESTS + ${skipped:-0}))
    fi
done

PASSED_TESTS=$((TOTAL_TESTS - FAILED_TESTS - SKIPPED_TESTS))

# Get thresholds from environment or use defaults
THRESHOLD_PERCENT=${E2E_FAILURE_THRESHOLD_PERCENT:-5}
THRESHOLD_ABSOLUTE=${E2E_FAILURE_THRESHOLD_ABSOLUTE:-12}
THRESHOLD_MODE=${E2E_THRESHOLD_MODE:-both}

# Calculate failure rate
if [ $TOTAL_TESTS -gt 0 ]; then
    FAILURE_RATE=$(awk "BEGIN {printf \"%.2f\", ($FAILED_TESTS / $TOTAL_TESTS) * 100}")
else
    FAILURE_RATE=0
fi

# Output results
echo "=========================================="
echo "📊 E2E Test Results Summary"
echo "=========================================="
echo "Total Tests:   $TOTAL_TESTS"
echo "✅ Passed:      $PASSED_TESTS"
echo "❌ Failed:      $FAILED_TESTS"
echo "⏭️  Skipped:     $SKIPPED_TESTS"
echo "📈 Failure Rate: ${FAILURE_RATE}%"
echo "=========================================="
echo ""
echo "🎯 Failure Thresholds:"
echo "  Percentage:  ${THRESHOLD_PERCENT}%"
echo "  Absolute:    ${THRESHOLD_ABSOLUTE} tests"
echo "  Mode:        ${THRESHOLD_MODE}"
echo "=========================================="

# Save results to file for Jenkins
cat > e2e-test-summary.json <<EOF
{
  "total": $TOTAL_TESTS,
  "passed": $PASSED_TESTS,
  "failed": $FAILED_TESTS,
  "skipped": $SKIPPED_TESTS,
  "failureRate": $FAILURE_RATE,
  "thresholdPercent": $THRESHOLD_PERCENT,
  "thresholdAbsolute": $THRESHOLD_ABSOLUTE,
  "thresholdMode": "$THRESHOLD_MODE"
}
EOF

# Determine if build should fail
SHOULD_FAIL=0

case $THRESHOLD_MODE in
    "percentage")
        if (( $(echo "$FAILURE_RATE > $THRESHOLD_PERCENT" | bc -l) )); then
            echo "❌ Failure rate ${FAILURE_RATE}% exceeds threshold ${THRESHOLD_PERCENT}%"
            SHOULD_FAIL=1
        else
            echo "✅ Failure rate ${FAILURE_RATE}% is within threshold ${THRESHOLD_PERCENT}%"
        fi
        ;;
    "absolute")
        if [ $FAILED_TESTS -gt $THRESHOLD_ABSOLUTE ]; then
            echo "❌ Failed tests $FAILED_TESTS exceeds threshold $THRESHOLD_ABSOLUTE"
            SHOULD_FAIL=1
        else
            echo "✅ Failed tests $FAILED_TESTS is within threshold $THRESHOLD_ABSOLUTE"
        fi
        ;;
    "both")
        if (( $(echo "$FAILURE_RATE > $THRESHOLD_PERCENT" | bc -l) )) || [ $FAILED_TESTS -gt $THRESHOLD_ABSOLUTE ]; then
            echo "❌ Tests exceed one or both thresholds:"
            echo "   - Failure rate: ${FAILURE_RATE}% (threshold: ${THRESHOLD_PERCENT}%)"
            echo "   - Failed tests: $FAILED_TESTS (threshold: $THRESHOLD_ABSOLUTE)"
            SHOULD_FAIL=1
        else
            echo "✅ Tests are within both thresholds"
        fi
        ;;
esac

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
