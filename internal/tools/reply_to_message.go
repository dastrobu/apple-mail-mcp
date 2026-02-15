package tools

import (
	"context"
	_ "embed"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/dastrobu/apple-mail-mcp/internal/jxa"
	"github.com/dastrobu/apple-mail-mcp/internal/richtext"
	"github.com/modelcontextprotocol/go-sdk/mcp"
)

//go:embed scripts/reply_to_message.js
var replyToMessageScript string

// ReplyToMessageInput defines input parameters for reply_to_message tool
type ReplyToMessageInput struct {
	Account       string   `json:"account" jsonschema:"Name of the email account"`
	MailboxPath   []string `json:"mailboxPath" jsonschema:"Path to the mailbox as an array (e.g. ['Inbox'] for top-level or ['Inbox','GitHub'] for nested mailbox). Use the mailboxPath field from get_selected_messages. Note: Mailbox names are case-sensitive."`
	MessageID     int      `json:"message_id" jsonschema:"The unique ID of the message to reply to"`
	ReplyContent  string   `json:"reply_content" jsonschema:"Reply message content (supports Markdown formatting)"`
	ContentFormat string   `json:"content_format,omitempty" jsonschema:"Content format: 'plain' or 'markdown'. Default is 'markdown'"`
	OpeningWindow *bool    `json:"opening_window,omitempty" jsonschema:"Whether to show the window for the reply message. Default is false."`
	ReplyToAll    *bool    `json:"reply_to_all,omitempty" jsonschema:"Whether to reply to all recipients. Default is false (reply to sender only)."`
}

// RegisterReplyToMessage registers the reply_to_message tool with the MCP server
func RegisterReplyToMessage(srv *mcp.Server, richtextConfig *richtext.PreparedConfig) {
	mcp.AddTool(srv,
		&mcp.Tool{
			Name:        "reply_to_message",
			Description: "Creates a reply to a specific message and saves it as a draft. To avoid a known rendering bug in Mail.app where reply content is automatically wrapped in a blockquote (causing it to appear with a purple/blue quote bar to recipients), this tool creates a NEW message with 'Re: ' prepended to the subject and recipients copied from the original message. Note: This approach does not include the quoted original message text. The draft remains in the Drafts mailbox for review and manual sending. IMPORTANT: Use the mailboxPath field from get_selected_messages output. PERFORMANCE: Uses fast whose() filtering.",
			InputSchema: GenerateSchema[ReplyToMessageInput](),
			Annotations: &mcp.ToolAnnotations{
				Title:           "Reply to Message (Draft)",
				ReadOnlyHint:    false,
				IdempotentHint:  false,
				DestructiveHint: new(false),
				OpenWorldHint:   new(true),
			},
		},
		func(ctx context.Context, request *mcp.CallToolRequest, input ReplyToMessageInput) (*mcp.CallToolResult, any, error) {
			return handleReplyToMessage(ctx, request, input, richtextConfig)
		},
	)
}

func handleReplyToMessage(ctx context.Context, request *mcp.CallToolRequest, input ReplyToMessageInput, richtextConfig *richtext.PreparedConfig) (*mcp.CallToolResult, any, error) {
	// Validate mailboxPath
	if len(input.MailboxPath) == 0 {
		return nil, nil, fmt.Errorf("mailboxPath is required and must be a non-empty array")
	}

	// Marshal mailboxPath to JSON for passing to JXA script
	mailboxPathJSON, err := json.Marshal(input.MailboxPath)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to marshal mailbox path: %w", err)
	}

	// Apply defaults for optional parameters
	openingWindow := false
	if input.OpeningWindow != nil {
		openingWindow = *input.OpeningWindow
	}

	replyToAll := false
	if input.ReplyToAll != nil {
		replyToAll = *input.ReplyToAll
	}

	// Determine content format (default to markdown)
	contentFormat := strings.ToLower(strings.TrimSpace(input.ContentFormat))
	if contentFormat == "" {
		contentFormat = ContentFormatDefault
	}

	// Process content based on format
	var contentJSON string
	switch contentFormat {
	case ContentFormatMarkdown:
		// Parse Markdown and convert to styled blocks
		doc, err := richtext.ParseMarkdown([]byte(input.ReplyContent))
		if err != nil {
			return nil, nil, fmt.Errorf("failed to parse Markdown: %w", err)
		}

		styledBlocks, err := richtext.ConvertMarkdownToStyledBlocks(doc, []byte(input.ReplyContent), richtextConfig)
		if err != nil {
			return nil, nil, fmt.Errorf("failed to convert Markdown to styled blocks: %w", err)
		}

		// Encode styled blocks as JSON
		encoded, err := json.Marshal(styledBlocks)
		if err != nil {
			return nil, nil, fmt.Errorf("failed to encode styled blocks: %w", err)
		}
		contentJSON = string(encoded)

	case ContentFormatPlain:
		// Plain text - just pass the content directly
		contentJSON = ""

	default:
		return nil, nil, fmt.Errorf("invalid content_format: %s (must be '%s' or '%s')", contentFormat, ContentFormatPlain, ContentFormatMarkdown)
	}

	data, err := jxa.Execute(ctx, replyToMessageScript,
		input.Account,
		string(mailboxPathJSON),
		fmt.Sprintf("%d", input.MessageID),
		input.ReplyContent,
		contentFormat,
		contentJSON,
		fmt.Sprintf("%t", openingWindow),
		fmt.Sprintf("%t", replyToAll))
	if err != nil {
		return nil, nil, fmt.Errorf("failed to execute reply_to_message: %w", err)
	}

	return nil, data, nil
}
