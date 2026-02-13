package tools

import (
	"context"
	_ "embed"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/dastrobu/apple-mail-mcp/internal/jxa"
	"github.com/modelcontextprotocol/go-sdk/mcp"
)

//go:embed scripts/create_outgoing_message.js
var createOutgoingMessageScript string

// CreateOutgoingMessageInput defines input parameters for create_outgoing_message tool
type CreateOutgoingMessageInput struct {
	Subject       string   `json:"subject" jsonschema:"Subject line of the email"`
	Content       string   `json:"content" jsonschema:"Body text of the email"`
	ToRecipients  []string `json:"to_recipients" jsonschema:"List of To recipient email addresses"`
	CcRecipients  []string `json:"cc_recipients,omitempty" jsonschema:"List of CC recipient email addresses (optional)"`
	BccRecipients []string `json:"bcc_recipients,omitempty" jsonschema:"List of BCC recipient email addresses (optional)"`
	Sender        string   `json:"sender,omitempty" jsonschema:"Sender email address (optional, uses default account if omitted)"`
	OpeningWindow *bool    `json:"opening_window,omitempty" jsonschema:"Whether to show the compose window. Default is false"`
}

// RegisterCreateOutgoingMessage registers the create_outgoing_message tool with the MCP server
func RegisterCreateOutgoingMessage(srv *mcp.Server) {
	mcp.AddTool(srv,
		&mcp.Tool{
			Name:        "create_outgoing_message",
			Description: "Creates a new outgoing email message and returns its OutgoingMessage ID immediately (no delay). The message is saved but not sent. Use replace_outgoing_message to modify it. This is the fast alternative to create_draft - returns OutgoingMessage.id() which works with replace_outgoing_message. Note: The OutgoingMessage only exists in memory while Mail.app is running. For persistent drafts that survive Mail.app restart, use create_draft instead.",
			Annotations: &mcp.ToolAnnotations{
				Title:           "Create Outgoing Message",
				ReadOnlyHint:    false,
				IdempotentHint:  false,
				DestructiveHint: new(false),
				OpenWorldHint:   new(true),
			},
		},
		handleCreateOutgoingMessage,
	)
}

func handleCreateOutgoingMessage(ctx context.Context, request *mcp.CallToolRequest, input CreateOutgoingMessageInput) (*mcp.CallToolResult, any, error) {
	// Trim and validate subject
	subject := strings.TrimSpace(input.Subject)
	if subject == "" {
		return nil, nil, fmt.Errorf("subject is required and cannot be empty or whitespace-only")
	}

	// Validate content
	if input.Content == "" {
		return nil, nil, fmt.Errorf("content is required")
	}

	// Apply defaults for optional parameters
	openingWindow := false
	if input.OpeningWindow != nil {
		openingWindow = *input.OpeningWindow
	}

	// Encode recipient arrays as JSON strings
	toRecipientsJSON, err := json.Marshal(input.ToRecipients)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to encode To recipients: %w", err)
	}

	ccRecipientsJSON := ""
	if len(input.CcRecipients) > 0 {
		encoded, err := json.Marshal(input.CcRecipients)
		if err != nil {
			return nil, nil, fmt.Errorf("failed to encode CC recipients: %w", err)
		}
		ccRecipientsJSON = string(encoded)
	}

	bccRecipientsJSON := ""
	if len(input.BccRecipients) > 0 {
		encoded, err := json.Marshal(input.BccRecipients)
		if err != nil {
			return nil, nil, fmt.Errorf("failed to encode BCC recipients: %w", err)
		}
		bccRecipientsJSON = string(encoded)
	}

	data, err := jxa.Execute(ctx, createOutgoingMessageScript,
		subject,
		input.Content,
		string(toRecipientsJSON),
		ccRecipientsJSON,
		bccRecipientsJSON,
		input.Sender,
		fmt.Sprintf("%t", openingWindow))
	if err != nil {
		return nil, nil, fmt.Errorf("failed to execute create_outgoing_message: %w", err)
	}

	return nil, data, nil
}
