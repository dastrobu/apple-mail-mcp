# Draft Management in Apple Mail MCP Server

This document explains how draft email management works in the Mail MCP server, including important limitations and best practices.

## Overview

The Mail MCP server provides the `reply_to_message` tool for creating draft emails. This tool creates a reply to an existing message and saves it as a draft in the Drafts mailbox.

> **Note**: The `create_draft` and `replace_draft` tools have been removed from this server. Only `reply_to_message` remains for draft creation.

## Important Limitation: Draft IDs

**Key Issue:** Draft IDs returned by `reply_to_message` are subject to a timing-dependent lookup process.

### How Draft ID Lookup Works

When you create a reply draft:

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
   - Multiple drafts can have identical subjects (especially multiple replies to the same message)
   - The server finds the most recent draft with matching subject
   - If you create multiple reply drafts rapidly, lookup may fail

3. **Sync Timing**:
   - Exchange accounts and slow systems may need more than 4 seconds to sync
   - Network delays can affect draft visibility in the Drafts mailbox
   - The fixed 4-second delay is a compromise between speed and reliability

4. **Race Conditions**:
   - If you create drafts faster than the sync delay, lookups may return wrong IDs
   - Concurrent draft creation is not supported

## Best Practices

### 1. Wait Between Draft Operations

Allow time for drafts to sync before creating new ones:

- **Minimum wait**: 4 seconds between `reply_to_message` calls
- **Recommended wait**: 5-6 seconds for Exchange accounts
- **Safe wait**: 10 seconds for maximum reliability

### 2. Verify Draft IDs

After creating a draft, verify the returned ID works by using other tools:

```json
// Create reply draft
{ "tool": "reply_to_message", ... }
// Returns: { "draft_id": 12345 }

// Wait a moment, then verify by listing drafts
{ "tool": "list_drafts", "account": "...", "limit": 10 }
```

If the draft doesn't appear in the list, the sync took longer than expected.

### 3. Use list_drafts to Find Drafts

The `list_drafts` tool provides a reliable way to find drafts by other criteria:

```json
{
  "tool": "list_drafts",
  "account": "Your Account",
  "limit": 50
}
```

Then search the results by subject, date, or content to find your draft.

### 4. Make Reply Content Unique

If creating multiple replies to the same message, add unique content to help differentiate them:

```json
{
  "tool": "reply_to_message",
  "reply_content": "Response #1 - [2024-02-13 08:04:15]",
  ...
}
```

## Tool-Specific Notes

### reply_to_message

**Returns**: `draft_id` - The Message ID in the Drafts mailbox

**Reliability**:
- High for single replies to unique messages
- Medium when creating multiple replies to the same message
- Lower on Exchange accounts or slow networks

**How it Works**:
1. Creates an `OutgoingMessage` reply to the specified message
2. Mail.app automatically includes quoted original message
3. Sets recipients based on original message (sender or all recipients if `reply_to_all` is true)
4. Saves the reply to the Drafts mailbox
5. Waits 4 seconds for sync
6. Searches Drafts mailbox by subject to find the draft
7. Returns the Message ID

**Recommendations**:
- Wait 4+ seconds before using the returned ID
- Use unique reply content if creating multiple replies
- Check the Drafts mailbox manually if lookup fails
- Use `list_drafts` to verify drafts were created successfully

## Editing Drafts

To edit a draft after creation, you have two options:

### Option 1: Use Outgoing Message Tools

The recommended approach is to use the outgoing message tools:

1. Use `list_outgoing_messages` to find the draft by subject or other criteria
2. Use `replace_outgoing_message` to update the draft content

These tools work directly with `OutgoingMessage` objects and don't require the draft to be fully synced to the Drafts mailbox.

### Option 2: Manual Editing in Mail.app

Simply open Mail.app and edit the draft manually. The draft ID in the Drafts mailbox will remain stable as long as you don't move or delete the draft.

## Troubleshooting

### "Draft with ID X not found"

**Causes**:
1. Sync hasn't completed yet
2. Draft was manually moved or deleted in Mail.app
3. ID lookup failed during creation due to multiple drafts with same subject

**Solutions**:
1. Use `list_drafts` to find drafts by subject/date
2. Wait longer and retry with longer delay
3. Use `list_outgoing_messages` which works with OutgoingMessage objects

### Multiple Reply Drafts to Same Message

**Problem**: Draft ID lookup returns wrong draft when creating multiple replies to the same message

**Solutions**:
1. Add unique content to each reply (
timestamps, sequence numbers, etc.)
2. Wait at least 4 seconds between reply operations
3. Use `list_drafts` to verify which draft was created
4. Delete duplicate drafts manually in Mail.app

### Exchange Account Delays

**Problem**: Draft IDs not found even after 4-second delay

**Solutions**:
1. Use 6-10 second delays for Exchange accounts
2. Check network connectivity and Exchange server status
3. Use `list_outgoing_messages` instead, which doesn't require mailbox sync

## Alternatives to Draft Management

If draft ID reliability is critical for your use case, consider these alternatives:

### 1. Use Outgoing Message Tools

The `create_outgoing_message`, `list_outgoing_messages`, and `replace_outgoing_message` tools work directly with Mail.app's `OutgoingMessage` objects without requiring mailbox sync. These are more reliable for programmatic draft management.

### 2. Manual Draft Management

Create drafts using `reply_to_message`, then have the user edit them manually in Mail.app. This avoids the complexity of programmatic draft updates.

### 3. Direct Email Sending

If drafts are only an intermediate step, consider using other email sending tools or APIs that don't require Mail.app integration.

## Summary

Draft management in the Mail MCP server works well for typical use cases but has limitations due to Mail.app's API:

✅ **Works Well For**:
- Creating reply drafts with sufficient delays between operations
- Single reply operations with human-paced timing
- Interactive use where users can verify drafts in Mail.app

⚠️ **Challenging For**:
- Rapid draft creation (< 4 seconds apart)
- Multiple replies to the same message created in quick succession
- Exchange accounts with slow sync
- Automated batch operations requiring immediate draft access

**Recommendations**:
- Use `reply_to_message` for creating reply drafts
- Use `list_drafts` to verify and find drafts reliably
- Use `list_outgoing_messages` and `replace_outgoing_message` for editing drafts programmatically
- When in doubt, wait longer between operations and verify results with list tools