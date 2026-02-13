# Draft Management in Apple Mail MCP Server

This document explains how draft email management works in the Mail MCP server, including important limitations and best practices.

## Overview

The Mail MCP server provides three tools for working with email drafts:
1. `create_draft` - Create a new draft email
2. `reply_to_message` - Create a reply draft to an existing message
3. `replace_draft` - Replace an existing draft with updated content

## Important Limitation: Draft IDs

**Key Issue:** Draft IDs returned by `create_draft` and `reply_to_message` are subject to a timing-dependent lookup process.

### How Draft ID Lookup Works

When you create a draft:

1. **OutgoingMessage Created**: Mail.app creates an `OutgoingMessage` object in memory
2. **Draft Saved**: The message is saved to the Drafts mailbox
3. **Sync Delay**: The server waits 4 seconds for the draft to fully sync
4. **Mailbox Search**: The server searches the Drafts mailbox by subject to find the draft
5. **ID Returned**: The Message ID from the Drafts mailbox is returned

### Why This Process is Fragile

1. **Different ID Spaces**: 
   - `OutgoingMessage.id()` returns a different ID than `Message.id()` in the Drafts mailbox
   - The server must search to map between these ID spaces

2. **Subject-Based Lookup**:
   - Multiple drafts can have identical subjects
   - The server finds the most recent draft with matching subject
   - If you create multiple drafts with the same subject rapidly, lookup may fail

3. **Sync Timing**:
   - Exchange accounts and slow systems may need more than 4 seconds to sync
   - Network delays can affect draft visibility in the Drafts mailbox
   - The fixed 4-second delay is a compromise between speed and reliability

4. **Race Conditions**:
   - If you create drafts faster than the sync delay, lookups may return wrong IDs
   - Concurrent draft creation is not supported

## Best Practices

### 1. Use Unique Subjects

When creating multiple drafts, use unique subjects to avoid lookup collisions:

```json
{
  "subject": "Draft 2024-02-13 08:04:15",
  "content": "Draft content here"
}
```

### 2. Wait Between Draft Operations

Allow time for drafts to sync before creating new ones:

- **Minimum wait**: 4 seconds between `create_draft` calls
- **Recommended wait**: 5-6 seconds for Exchange accounts
- **Safe wait**: 10 seconds for maximum reliability

### 3. Verify Draft IDs

After creating a draft, verify the returned ID works before using it:

```json
// Create draft
{ "tool": "create_draft", ... }
// Returns: { "draft_id": 12345 }

// Wait a moment, then verify
{ "tool": "replace_draft", "draft_id": 12345, ... }
```

If `replace_draft` fails with "Draft with ID X not found", the sync took longer than expected.

### 4. Use list_messages to Find Drafts

If draft IDs are unreliable, you can list messages in the Drafts mailbox to find drafts by other criteria:

```json
{
  "tool": "list_messages",
  "account": "Your Account",
  "mailboxPath": ["Drafts"],
  "limit": 50
}
```

Then search the results by subject, date, or content to find your draft.

## Tool-Specific Notes

### create_draft

**Returns**: `draft_id` - The Message ID in the Drafts mailbox

**Reliability**: 
- High for unique subjects
- Medium for duplicate subjects
- Lower on Exchange accounts or slow networks

**Recommendations**:
- Use unique subjects
- Wait 4+ seconds before using the ID
- Check the Drafts mailbox manually if lookup fails

### reply_to_message

**Returns**: `draft_id` - The Message ID in the Drafts mailbox

**Reliability**:
- Same as `create_draft`
- Reply subjects are usually unique (Re: Original Subject)
- Multiple replies to the same message can cause collisions

**Recommendations**:
- Same as `create_draft`
- If creating multiple replies, add unique content to differentiate them

### replace_draft

**Requires**: `draft_id` - The Message ID from the Drafts mailbox

**How it Works**:
1. Finds the draft by ID in Drafts mailbox
2. Reads current draft properties
3. Deletes the old draft
4. Creates a new draft with updated properties
5. Searches Drafts mailbox to find the new draft
6. Returns new draft ID

**Reliability**:
- Depends on input ID being correct
- Depends on new draft lookup succeeding
- Can fail if draft was moved/deleted externally

**Recommendations**:
- Verify input ID is from Drafts mailbox (not OutgoingMessage)
- Use recent IDs (< 30 seconds old)
- Check if draft exists before replacing
- Handle "Draft not found" errors gracefully

## Troubleshooting

### "Draft with ID X not found"

**Causes**:
1. Draft ID is from OutgoingMessage, not Drafts mailbox
2. Draft was manually moved or deleted in Mail.app
3. Sync hasn't completed yet
4. ID lookup failed during creation

**Solutions**:
1. Use `list_messages` to find drafts by subject/date
2. Wait longer and retry
3. Create a new draft instead of replacing

### Multiple Drafts with Same Subject

**Problem**: Draft ID lookup returns wrong draft

**Solutions**:
1. Delete duplicate drafts manually in Mail.app
2. Use more unique subjects
3. Add timestamps to subjects
4. Query drafts by multiple criteria (subject + date + sender)

### Draft IDs Change After Replace

**Expected Behavior**: `replace_draft` deletes the old draft and creates a new one

**Important**:
- The returned `new_draft_id` is different from the input `draft_id`
- Any threading headers (In-Reply-To, References) are lost
- Update your draft ID references after replace operations

## Future Improvements

Potential enhancements to make draft management more reliable:

1. **Unique Markers**: Automatically add hidden markers to draft content for reliable lookup
2. **Message-Data-ID**: Use Mail.app's Message-Data-ID header if available
3. **list_drafts Tool**: Dedicated tool to list and search drafts
4. **Longer Timeouts**: Make sync delay configurable
5. **Retry Logic**: Automatically retry draft lookups with exponential backoff

## Summary

Draft management in the Mail MCP server works well for typical use cases but has limitations due to Mail.app's API:

✅ **Works Well For**:
- Creating drafts with unique subjects
- Single draft operations with proper delays
- Interactive use with human-paced operations

⚠️ **Challenging For**:
- Rapid draft creation (< 4 seconds apart)
- Drafts with duplicate subjects
- Exchange accounts with slow sync
- Automated batch operations

When in doubt, use `list_messages` on the Drafts mailbox to verify draft IDs and find drafts by content rather than relying solely on returned IDs.