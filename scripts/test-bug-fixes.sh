#!/bin/bash

# Test script to verify all bug fixes from February 13, 2026
# This script tests the three main issues that were fixed:
# 1. Debug output removed from list_drafts and list_outgoing_messages
# 2. reply_to_message now properly handles mailboxPath arrays
# 3. list_mailboxes handles null mailboxPath parameter

set -e

echo "=================================="
echo "Bug Fix Verification Tests"
echo "=================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASSED=0
FAILED=0

# Test 1: Verify no debug output in list_drafts.js
echo "Test 1: Checking list_drafts.js for debug output..."
if ! grep -q 'console.log("Found.*draft' internal/tools/scripts/list_drafts.js; then
    echo -e "${GREEN}✓ PASSED${NC}: No debug output before JSON"
    ((PASSED++))
else
    echo -e "${RED}✗ FAILED${NC}: Debug output still present"
    ((FAILED++))
fi
echo ""

# Test 2: Verify no debug output in list_outgoing_messages.js
echo "Test 2: Checking list_outgoing_messages.js for debug output..."
if ! grep -q 'console.log("Found.*outgoing' internal/tools/scripts/list_outgoing_messages.js; then
    echo -e "${GREEN}✓ PASSED${NC}: No debug output before JSON"
    ((PASSED++))
else
    echo -e "${RED}✗ FAILED${NC}: Debug output still present"
    ((FAILED++))
fi
echo ""

# Test 3: Verify reply_to_message uses JSON.parse for mailboxPath
echo "Test 3: Checking reply_to_message.js for proper JSON parsing..."
if grep -q 'JSON.parse(mailboxPathStr)' internal/tools/scripts/reply_to_message.js; then
    echo -e "${GREEN}✓ PASSED${NC}: Properly parses mailboxPath as JSON array"
    ((PASSED++))
else
    echo -e "${RED}✗ FAILED${NC}: Not parsing mailboxPath as JSON"
    ((FAILED++))
fi
echo ""

# Test 4: Verify reply_to_message uses whose() for fast lookup
echo "Test 4: Checking reply_to_message.js for whose() usage..."
if grep -q 'whose({ id: messageId })' internal/tools/scripts/reply_to_message.js; then
    echo -e "${GREEN}✓ PASSED${NC}: Uses fast whose() filtering"
    ((PASSED++))
else
    echo -e "${RED}✗ FAILED${NC}: Not using whose() for message lookup"
    ((FAILED++))
fi
echo ""

# Test 5: Verify reply_to_message navigates nested mailboxes
echo "Test 5: Checking reply_to_message.js for nested mailbox navigation..."
if grep -q 'targetMailbox.mailboxes\[mailboxPath\[i\]\]' internal/tools/scripts/reply_to_message.js; then
    echo -e "${GREEN}✓ PASSED${NC}: Properly navigates nested mailboxes"
    ((PASSED++))
else
    echo -e "${RED}✗ FAILED${NC}: Not handling nested mailboxes"
    ((FAILED++))
fi
echo ""

# Test 6: Verify list_mailboxes.go handles nil mailboxPath
echo "Test 6: Checking list_mailboxes.go for nil handling..."
if grep -q 'if mailboxPath == nil' internal/tools/list_mailboxes.go; then
    echo -e "${GREEN}✓ PASSED${NC}: Handles nil mailboxPath parameter"
    ((PASSED++))
else
    echo -e "${RED}✗ FAILED${NC}: No nil check for mailboxPath"
    ((FAILED++))
fi
echo ""

# Test 7: Verify list_mailboxes.go marshals to JSON
echo "Test 7: Checking list_mailboxes.go for JSON marshaling..."
if grep -q 'json.Marshal(mailboxPath)' internal/tools/list_mailboxes.go; then
    echo -e "${GREEN}✓ PASSED${NC}: Properly marshals mailboxPath to JSON"
    ((PASSED++))
else
    echo -e "${RED}✗ FAILED${NC}: Not marshaling mailboxPath"
    ((FAILED++))
fi
echo ""

# Test 8: Verify reply_to_message.go uses MailboxPath (not Mailbox)
echo "Test 8: Checking reply_to_message.go for MailboxPath field..."
if grep -q 'MailboxPath.*\[\]string' internal/tools/reply_to_message.go; then
    echo -e "${GREEN}✓ PASSED${NC}: Uses MailboxPath array field"
    ((PASSED++))
else
    echo -e "${RED}✗ FAILED${NC}: Still using old Mailbox string field"
    ((FAILED++))
fi
echo ""

# Test 9: Build test
echo "Test 9: Building project..."
if go build -o apple-mail-mcp . 2>/dev/null; then
    echo -e "${GREEN}✓ PASSED${NC}: Project builds successfully"
    ((PASSED++))
else
    echo -e "${RED}✗ FAILED${NC}: Build errors"
    ((FAILED++))
fi
echo ""

# Test 10: Server startup test
echo "Test 10: Testing server startup..."
# Start server in background and check if it runs for at least 1 second
./apple-mail-mcp >/dev/null 2>&1 &
SERVER_PID=$!
sleep 1
if ps -p $SERVER_PID > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PASSED${NC}: Server starts without panicking"
    kill $SERVER_PID 2>/dev/null
    wait $SERVER_PID 2>/dev/null
    ((PASSED++))
else
    echo -e "${RED}✗ FAILED${NC}: Server failed to start or crashed"
    ((FAILED++))
fi
echo ""

# Test 11: Go tests
echo "Test 11: Running Go tests..."
if go test -count=1 ./... >/dev/null 2>&1; then
    echo -e "${GREEN}✓ PASSED${NC}: All tests pass"
    ((PASSED++))
else
    echo -e "${RED}✗ FAILED${NC}: Some tests failed"
    ((FAILED++))
fi
echo ""

# Summary
echo "=================================="
echo "Test Results Summary"
echo "=================================="
echo -e "Passed: ${GREEN}${PASSED}${NC}"
echo -e "Failed: ${RED}${FAILED}${NC}"
echo "Total:  $((PASSED + FAILED))"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All bug fixes verified successfully!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed. Please review.${NC}"
    exit 1
fi