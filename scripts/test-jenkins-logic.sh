#!/bin/bash

# Simulate Jenkins E2E stage logic locally
# Tests the exit code parsing approach that will be used in Jenkinsfile

set -e

echo "=========================================="
echo "🧪 Testing Jenkins E2E Stage Logic"
echo "=========================================="
echo ""

# Simulate docker compose output with exit code
simulate_docker_output() {
    local EXIT_CODE=$1
    cat <<EOF
time="2026-01-10T06:33:07Z" level=warning msg="No services to build"
 Container club_management_postgres_e2e Running
 Container club_management_mongo_e2e Running
 Container club_management_rabbitmq_e2e Running
 Container club_management_auth Running
 Container club_management_frontend Healthy
 Container club_management_event Healthy
E2E_EXIT_CODE:${EXIT_CODE}
EOF
}

echo "Test 1: Exit code 0 (all tests passed)"
echo "----------------------------------------"
OUTPUT=$(simulate_docker_output 0)
ACTUAL_EXIT_CODE=1  # default

# Simulate Jenkins parsing logic
while IFS= read -r line; do
    if [[ "$line" == E2E_EXIT_CODE:* ]]; then
        ACTUAL_EXIT_CODE=$(echo "$line" | cut -d':' -f2)
    fi
done <<< "$OUTPUT"

echo "Parsed exit code: $ACTUAL_EXIT_CODE"
if [ "$ACTUAL_EXIT_CODE" -eq 0 ]; then
    echo "✅ Correct - All tests passed"
else
    echo "❌ Error - Expected 0"
fi
echo ""

echo "Test 2: Exit code 1 (tests failed)"
echo "----------------------------------------"
OUTPUT=$(simulate_docker_output 1)
ACTUAL_EXIT_CODE=99  # default to unlikely value

while IFS= read -r line; do
    if [[ "$line" == E2E_EXIT_CODE:* ]]; then
        ACTUAL_EXIT_CODE=$(echo "$line" | cut -d':' -f2)
    fi
done <<< "$OUTPUT"

echo "Parsed exit code: $ACTUAL_EXIT_CODE"
if [ "$ACTUAL_EXIT_CODE" -eq 1 ]; then
    echo "✅ Correct - Tests failed"
else
    echo "❌ Error - Expected 1"
fi
echo ""

echo "Test 3: Exit code 2 (within threshold)"
echo "----------------------------------------"
OUTPUT=$(simulate_docker_output 2)
ACTUAL_EXIT_CODE=99

while IFS= read -r line; do
    if [[ "$line" == E2E_EXIT_CODE:* ]]; then
        ACTUAL_EXIT_CODE=$(echo "$line" | cut -d':' -f2)
    fi
done <<< "$OUTPUT"

echo "Parsed exit code: $ACTUAL_EXIT_CODE"
if [ "$ACTUAL_EXIT_CODE" -eq 2 ]; then
    echo "✅ Correct - Within threshold"
else
    echo "❌ Error - Expected 2"
fi
echo ""

echo "=========================================="
echo "Testing Groovy eachLine simulation"
echo "=========================================="
echo ""

# Simulate Groovy's eachLine behavior in bash
test_groovy_parsing() {
    local EXIT_CODE=$1
    local OUTPUT=$(simulate_docker_output $EXIT_CODE)
    local RESULT=1
    
    # This simulates: e2eOutput.eachLine { line -> ... }
    while IFS= read -r line; do
        if [[ "$line" =~ ^E2E_EXIT_CODE: ]]; then
            # This simulates: line.split(':')[1].toInteger()
            RESULT=$(echo "$line" | awk -F':' '{print $2}')
        fi
    done <<< "$OUTPUT"
    
    echo "$RESULT"
}

echo "Test with exit code 0:"
RESULT=$(test_groovy_parsing 0)
echo "Result: $RESULT"
[ "$RESULT" -eq 0 ] && echo "✅ Pass" || echo "❌ Fail"
echo ""

echo "Test with exit code 1:"
RESULT=$(test_groovy_parsing 1)
echo "Result: $RESULT"
[ "$RESULT" -eq 1 ] && echo "✅ Pass" || echo "❌ Fail"
echo ""

echo "Test with exit code 2:"
RESULT=$(test_groovy_parsing 2)
echo "Result: $RESULT"
[ "$RESULT" -eq 2 ] && echo "✅ Pass" || echo "❌ Fail"
echo ""

echo "=========================================="
echo "✅ All exit code parsing tests complete!"
echo "=========================================="
