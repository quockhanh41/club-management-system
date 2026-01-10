#!/bin/bash

# Test script để verify analyze-e2e-results.sh hoạt động đúng ở local
# Chạy script này sau khi có test-results/ directory từ E2E tests

set -e

echo "=========================================="
echo "🧪 Testing E2E Analysis Script Locally"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if test-results directory exists
if [ ! -d "test-results" ]; then
    echo -e "${RED}❌ Error: test-results/ directory not found${NC}"
    echo "Please run E2E tests first to generate test results:"
    echo "  npm run test:e2e"
    echo "  or"
    echo "  docker compose -f docker-compose.yml -f docker-compose.e2e.yml up"
    exit 1
fi

# Check if XML files exist
XML_COUNT=$(find test-results -name "*.xml" 2>/dev/null | wc -l)
if [ "$XML_COUNT" -eq 0 ]; then
    echo -e "${RED}❌ Error: No JUnit XML files found in test-results/${NC}"
    echo "E2E tests may not have completed or results were not generated"
    exit 1
fi

echo -e "${GREEN}✅ Found ${XML_COUNT} XML result files${NC}"
echo ""

# Make script executable
chmod +x scripts/analyze-e2e-results.sh

# Test 1: Run with default thresholds
echo "=========================================="
echo "Test 1: Default Thresholds (5% / 12 tests, both mode)"
echo "=========================================="
export E2E_FAILURE_THRESHOLD_PERCENT=5
export E2E_FAILURE_THRESHOLD_ABSOLUTE=12
export E2E_THRESHOLD_MODE=both

./scripts/analyze-e2e-results.sh
EXIT_CODE=$?

echo ""
echo "Exit code: $EXIT_CODE"
case $EXIT_CODE in
    0)
        echo -e "${GREEN}✅ All tests passed${NC}"
        ;;
    1)
        echo -e "${RED}❌ Exceeds threshold - Build would FAIL${NC}"
        ;;
    2)
        echo -e "${YELLOW}⚠️  Within threshold - Build would be UNSTABLE${NC}"
        ;;
esac
echo ""

# Show JSON summary if exists
if [ -f "e2e-test-summary.json" ]; then
    echo "=========================================="
    echo "📊 JSON Summary:"
    echo "=========================================="
    cat e2e-test-summary.json | jq '.'
    echo ""
fi

# Test 2: Stricter thresholds
echo "=========================================="
echo "Test 2: Stricter Thresholds (3% / 8 tests, both mode)"
echo "=========================================="
export E2E_FAILURE_THRESHOLD_PERCENT=3
export E2E_FAILURE_THRESHOLD_ABSOLUTE=8
export E2E_THRESHOLD_MODE=both

./scripts/analyze-e2e-results.sh
EXIT_CODE=$?

echo ""
echo "Exit code: $EXIT_CODE"
case $EXIT_CODE in
    0)
        echo -e "${GREEN}✅ All tests passed${NC}"
        ;;
    1)
        echo -e "${RED}❌ Exceeds threshold - Build would FAIL${NC}"
        ;;
    2)
        echo -e "${YELLOW}⚠️  Within threshold - Build would be UNSTABLE${NC}"
        ;;
esac
echo ""

# Test 3: Percentage only mode
echo "=========================================="
echo "Test 3: Percentage Mode Only (10%)"
echo "=========================================="
export E2E_FAILURE_THRESHOLD_PERCENT=10
export E2E_THRESHOLD_MODE=percentage

./scripts/analyze-e2e-results.sh
EXIT_CODE=$?

echo ""
echo "Exit code: $EXIT_CODE"
case $EXIT_CODE in
    0)
        echo -e "${GREEN}✅ All tests passed${NC}"
        ;;
    1)
        echo -e "${RED}❌ Exceeds threshold - Build would FAIL${NC}"
        ;;
    2)
        echo -e "${YELLOW}⚠️  Within threshold - Build would be UNSTABLE${NC}"
        ;;
esac
echo ""

# Test 4: Absolute only mode
echo "=========================================="
echo "Test 4: Absolute Mode Only (20 tests)"
echo "=========================================="
export E2E_FAILURE_THRESHOLD_ABSOLUTE=20
export E2E_THRESHOLD_MODE=absolute

./scripts/analyze-e2e-results.sh
EXIT_CODE=$?

echo ""
echo "Exit code: $EXIT_CODE"
case $EXIT_CODE in
    0)
        echo -e "${GREEN}✅ All tests passed${NC}"
        ;;
    1)
        echo -e "${RED}❌ Exceeds threshold - Build would FAIL${NC}"
        ;;
    2)
        echo -e "${YELLOW}⚠️  Within threshold - Build would be UNSTABLE${NC}"
        ;;
esac
echo ""

echo "=========================================="
echo "✅ Testing Complete!"
echo "=========================================="
echo ""
echo "Summary of exit codes:"
echo "  0 = All tests passed (SUCCESS)"
echo "  1 = Exceeds threshold (FAILURE)"
echo "  2 = Within threshold (UNSTABLE)"
echo ""
echo "Check e2e-test-summary.json for detailed metrics"
