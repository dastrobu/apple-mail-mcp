# Apple Mail MCP Server

A Model Context Protocol (MCP) server providing programmatic access to macOS Mail.app using Go and JavaScript for Automation (JXA).

## Overview

This MCP server enables AI assistants and other MCP clients to interact with Apple Mail on macOS. It provides read-only access to mailboxes, messages, and search functionality through a clean, typed interface.

## Features

- **List Accounts**: Enumerate all configured email accounts with their properties
- **List Mailboxes**: Enumerate all available mailboxes and accounts
- **Get Message Content**: Fetch detailed content of individual messages
- **Get Selected Messages**: Retrieve currently selected message(s) in Mail.app
- **Reply to Message**: Create a reply to a message and save it as a draft

## Requirements

- macOS (Mail.app is macOS-only)
- Go 1.25 or later
- Mail.app must be running and configured with at least one email account

## Installation

### From Source

```bash
git clone https://github.com/dastrobu/apple-mail-mcp.git
cd apple-mail-mcp
go build -o mail-mcp-server
```

## Usage

The server uses stdio transport for MCP communication:

```bash
./mail-mcp-server
```

### Configuration

Add to your MCP client configuration (e.g., Claude Desktop):

```json
{
  "mcpServers": {
    "apple-mail": {
      "command": "/path/to/mail-mcp-server"
    }
  }
}
```

## Available Tools

### list_accounts

Lists all configured email accounts in Apple Mail.

**Parameters:**
- `enabled` (boolean, optional): Filter to only show enabled accounts (default: false)

**Output:**
- Array of account objects with:
  - `name`: Account name
  - `enabled`: Whether the account is enabled
  - `emailAddresses`: Array of email addresses associated with the account
  - `mailboxCount`: Number of mailboxes in the account
- `count`: Total number of accounts

**Example Output:**
```json
{
  "accounts": [
    {
      "name": "Exchange",
      "enabled": true,
      "emailAddresses": ["user@example.com"],
      "mailboxCount": 22
    }
  ],
  "count": 1
}
```

### list_mailboxes

Lists all available mailboxes across all Mail accounts.

**Output:**
- Array of mailbox objects with name and account information

### get_message_content

Fetches the full content of a specific message including body, headers, recipients, and attachments.

**Parameters:**
- `account` (string, required): Name of the email account
- `mailbox` (string, required): Name of the mailbox (e.g., "INBOX", "Sent")
- `message_id` (integer, required): The unique ID of the message

**Output:**
- Full message object including:
  - Basic fields: id, subject, sender, replyTo
  - Dates: dateReceived, dateSent
  - Content: content (body text), allHeaders
  - Status: readStatus, flaggedStatus
  - Recipients: toRecipients, ccRecipients, bccRecipients (with name and address)
  - Attachments: array of attachment objects with name, fileSize, and downloaded status
  - Note: mimeType is not included for attachments due to Mail.app API limitations

**Error Handling:**
- The tool gracefully handles missing or unavailable fields
- If a field cannot be accessed, it returns a safe default value (empty string, empty array, etc.)
- Clear error messages are provided for common issues:
  - Invalid account or mailbox names
  - Message not found or has been deleted
  - Missing required parameters

### get_selected_messages

Gets the currently selected message(s) in the frontmost Mail.app viewer window.

**Parameters:**
- None (operates on current selection)

**Output:**
- Object containing:
  - `count`: Number of selected messages
  - `messages`: Array of message objects, each with:
    - `id`: Unique message identifier
    - `subject`: Subject line
    - `sender`: Sender email address
    - `dateReceived`: When the message was received (ISO 8601)
    - `dateSent`: When the message was sent (ISO 8601)
    - `readStatus`: Whether the message has been read
    - `flaggedStatus`: Whether the message is flagged
    - `junkMailStatus`: Whether the message is marked as junk
    - `mailbox`: Name of the mailbox containing the message
    - `account`: Name of the account containing the message

**Behavior:**
- Returns empty array if no messages are selected
- Returns error if no Mail viewer windows are open
- Can return multiple messages if multiple are selected
- Selection state is transient and can change between calls

**Example Output:**
```json
{
  "count": 1,
  "messages": [
    {
      "id": 123456,
      "subject": "Meeting Tomorrow",
      "sender": "colleague@example.com",
      "dateReceived": "2024-02-11T10:30:00Z",
      "dateSent": "2024-02-11T10:25:00Z",
      "readStatus": true,
      "flaggedStatus": false,
      "junkMailStatus": false,
      "mailbox": "INBOX",
      "account": "Work"
    }
  ]
}
```

### reply_to_message

Creates a reply to a specific message and saves it as a draft in the Drafts mailbox. The reply is NOT sent automatically - it remains in drafts for review and manual sending.

**Parameters:**
- `account` (string, required): Name of the email account
- `mailbox` (string, required): Name of the mailbox containing the message to reply to
- `message_id` (integer, required): The unique ID of the message to reply to
- `reply_content` (string, required): The content/body of the reply message

**Output:**
- Object containing:
  - `draft_id`: ID of the created draft message
  - `subject`: Subject line of the reply (prefixed with "Re: ")
  - `to_recipients`: Array of recipient email addresses
  - `drafts_mailbox`: Name of the Drafts mailbox where the reply was saved
  - `message`: Confirmation message

**Behavior:**
- Creates a reply with "Re: " prefix on the subject
- Sets the recipient to the original message sender
- Includes CC recipients from the original message
- Saves the reply in the account's Drafts mailbox (not sent)
- Maintains email thread context with proper headers

**Error Handling:**
- Clear error messages for invalid account or mailbox names
- Message not found or has been deleted
- Missing Drafts mailbox
- Missing required parameters

## Architecture

The server is built with:
- **Go**: Main server implementation using the MCP Go SDK
- **JXA (JavaScript for Automation)**: Scripts embedded in the binary for Mail.app interaction
  - See [JXA Documentation](https://developer.apple.com/library/archive/releasenotes/InterapplicationCommunication/RN-JavaScriptForAutomation/Articles/Introduction.html#//apple_ref/doc/uid/TP40014508) for more details
  - See [Mac Automation Scripting Guide](https://developer.apple.com/library/archive/documentation/LanguagesUtilities/Conceptual/MacAutomationScriptingGuide/index.html#//apple_ref/doc/uid/TP40016239-CH56-SW1) for comprehensive automation documentation
- **STDIO Transport**: Simple, stateless communication protocol

All JXA scripts are embedded at compile time using `//go:embed`, making the server a single, self-contained binary.

## Development

### Build

```bash
make build
```

### Test JXA Scripts

```bash
make test-scripts
```

### Clean

```bash
make clean
```

## Project Structure

```
apple-mail-mcp/
├── cmd/
│   └── mail-mcp-server/      # Main application entry point
│       └── main.go
├── internal/
│   ├── jxa/                  # JXA script execution
│   │   └── executor.go
│   └── tools/                # MCP tool implementations
│       ├── scripts/          # Embedded JXA scripts
│       │   ├── list_accounts.js
│       │   ├── list_mailboxes.js
│       │   ├── get_message_content.js
│       │   ├── get_selected_messages.js
│       │   └── reply_to_message.js
│       ├── list_accounts.go
│       ├── list_mailboxes.go
│       ├── get_message_content.go
│       ├── get_selected_messages.go
│       ├── reply_to_message.go
│       └── tools.go          # Tool registration and helpers
├── go.mod
├── go.sum
├── Makefile
└── README.md
```

The project follows standard Go project layout:
- `cmd/` - Main application packages
- `internal/` - Private application code
  - `jxa/` - JXA script execution utilities
  - `tools/` - Individual MCP tool implementations (one file per tool)
  - `tools/scripts/` - JavaScript for Automation scripts embedded into the binary

Each tool is implemented in its own file within `internal/tools/`, making the codebase modular and easy to maintain.

## Error Handling

The server provides detailed error messages to help diagnose issues:

- **Script Errors**: Clear messages indicating what went wrong in JXA scripts
- **Missing Data**: Descriptive errors when expected data is not found
- **Invalid Parameters**: Validation errors with hints about correct usage
- **Argument Context**: Error messages include the arguments passed to help debugging

All tools handle errors gracefully and return informative error messages rather than generic failures.

## Limitations

- **macOS only**: Relies on Mail.app and JXA
- **Mostly read-only**: Only the `reply_to_message` tool creates drafts; no emails are sent automatically
- **Mail.app required**: Mail.app must be running for the server to work
- **Attachment MIME types**: Due to Mail.app API limitations, MIME types are not available for attachments

## Security & Privacy

- All operations are read-only except `reply_to_message` which creates drafts
- Draft replies are not sent automatically - they require manual review and sending
- No data is transmitted outside of the MCP connection
- The server runs locally on your machine
- Mail.app's security and permissions apply

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

MIT License - see LICENSE file for details

## Acknowledgments

Built with the [MCP Go SDK](https://github.com/modelcontextprotocol/go-sdk) from Anthropic.
