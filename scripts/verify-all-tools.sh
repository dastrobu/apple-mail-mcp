#!/bin/bash
# Verification script for all JXA tools
# Tests that each tool returns proper data field wrapping

set -e

SCRIPT_DIR="internal/tools/scripts"
PASSED=0
FAILED=0

echo "🔍 Verifying JXA Tool Output Format"
echo "===================================="
echo ""

# Function to test a script
test_script() {
    local script=$1
    local args=$2
    local name=$(basename "$script" .js)
    
    echo -n "Testing $name... "
    
    # Run script and capture output
    output=$(osascript -l JavaScript "$script" $args 2>&1 || echo "ERROR")
    
    # Check if it contains "data" field
    if echo "$output" | grep -q '"data":{' || echo "$output" | grep -q '"data" : {'; then
        echo "✅ PASS"
        ((PASSED++))
    else
        echo "❌ FAIL"
        echo "  Output: $output"
        ((FAILED++))
    fi
}

# Test each tool
echo "Testing individual tools:"
echo ""

test_script "$SCRIPT_DIR/list_accounts.js" "false"
test_script "$SCRIPT_DIR/list_mailboxes.js" '""'
test_script "$SCRIPT_DIR/get_messages.js" "INBOX '' 5"
test_script "$SCRIPT_DIR/search_messages.js" "test subject 5"

# Note: get_message_content requires a valid message ID, so we skip it
echo -n "Testing get_message_content... "
echo "⏭️  SKIPPED (requires valid message ID)"

echo ""
echo "===================================="
echo "Results: $PASSED passed, $FAILED failed"
echo ""

if [ $FAILED -gt 0 ]; then
    echo "❌ Some tools are missing 'data' field wrapper!"
    echo "   All JXA scripts MUST return: {success: true, data: {...}}"
    exit 1
else
    echo "✅ All tools properly wrap output in 'data' field"
    exit 0
fi
