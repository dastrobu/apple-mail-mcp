# Test Scripts

This directory contains test scripts for validating Mail MCP server functionality.

## test-reply.js

Tests the draft lookup logic used in the `reply_to_message` tool.

### Purpose

This script validates that draft IDs can be reliably found after creating a reply draft. It simulates the exact lookup process used in `reply_to_message.js`:

1. Creates a reply draft (not visible)
2. Saves and waits for sync (4 seconds)
3. Searches Drafts mailbox by subject using `whose()`
4. Finds the most recent match by `dateReceived`
5. Verifies the draft can be found by ID

### Usage

1. Open Mail.app and select a message
2. Run the test script:

```bash
./scripts/test-reply.js "This is a test reply"
```

Or with default reply text:

```bash
./scripts/test-reply.js
```

### Expected Output

The script will print detailed logs showing each step:

```
=== Draft Lookup Logic Test ===
Reply Content: This is a test reply

Step 1: Getting selected message...
  ✓ Selected message ID: 12345
  ✓ Subject: Original message subject

Step 2: Creating reply draft...
  ✓ Reply created
  ✓ Content added
  ✓ Reply saved

Step 3: OutgoingMessage details:
  Subject: Re: Original message subject
  Sender: your@email.com
  OutgoingMessage.id(): 67890

Step 4: Waiting for draft to sync to Drafts mailbox...
  (4 second delay)
  ✓ Sync wait complete

Step 5: Searching Drafts mailbox...
  ✓ Got Drafts mailbox
  Found 1 draft(s) with matching subject

Step 6: Finding most recent draft...
  Candidate drafts:
    [0] ID: 12346 | Date: 2024-02-13T08:04:15.000Z ← MOST RECENT

  ✓ Selected draft ID: 12346

Step 7: Verifying draft lookup by ID...
  ✓ Draft verified by ID lookup

=== RESULTS ===
Draft ID Lookup: SUCCESS

OutgoingMessage.id(): 67890
Drafts Message.id(): 12346
IDs Match: NO

Draft Details:
  Subject: Re: Original message subject
  Sender: your@email.com
  Date: 2024-02-13T08:04:15.000Z

✓ Draft lookup logic works correctly
✓ Draft can be found by ID in Drafts mailbox
✓ Ready for use with replace_draft tool
```

### What It Tests

- ✅ Draft creation and saving
- ✅ Sync delay (4 seconds)
- ✅ Drafts mailbox search by subject
- ✅ Finding most recent draft by date
- ✅ Draft verification by ID
- ✅ OutgoingMessage.id() vs Message.id() difference

### Key Findings

**Important**: `OutgoingMessage.id()` and `Message.id()` are different!

- `OutgoingMessage.id()` - ID from the in-memory message object
- `Message.id()` - ID from the message in the Drafts mailbox

The script demonstrates that we **must** search the Drafts mailbox to get the correct ID. This is why `reply_to_message.js` uses the search-by-subject approach instead of using `replyMessage.id()` directly.

### Troubleshooting

**"No message viewers open"**
- Open Mail.app and ensure a mailbox window is visible

**"No messages selected"**
- Select a message in Mail.app before running the script

**"Draft not found in Drafts mailbox after sync"**
- The 4-second delay may be insufficient for your system
- Try increasing the delay in the script
- Check if Mail.app is fully synced with your email server
- Verify the Drafts mailbox exists

**Multiple candidates found**
- The script handles this by finding the most recent draft by `dateReceived`
- This is the same logic used in the actual tools

### Related Files

- `internal/tools/scripts/reply_to_message.js` - Production implementation
- `internal/tools/scripts/create_draft.js` - Similar lookup logic
- `internal/tools/scripts/replace_draft.js` - Uses draft IDs
- `docs/DRAFT_MANAGEMENT.md` - Detailed draft ID documentation

### Development Notes

This script uses JXA best practices:

- ✅ Proper Object Specifier dereferencing with `()`
- ✅ Efficient `whose()` for filtering (constant-time lookup)
- ✅ Date-based comparison for finding most recent draft
- ✅ Clear error messages and validation
- ✅ JSON output format for tool integration

The test validates the core draft lookup logic before making changes to the production tools.