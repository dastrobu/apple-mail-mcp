package tools

import (
	"context"
	_ "embed"
	"fmt"

	"github.com/dastrobu/apple-mail-mcp/internal/jxa"
	"github.com/modelcontextprotocol/go-sdk/mcp"
)

//go:embed scripts/reply_to_message.js
var replyToMessageScript string

// ReplyToMessageInput defines input parameters for reply_to_message tool
type ReplyToMessageInput struct {
	Account      string `json:"account" jsonschema:"Name of the email account"`
	Mailbox      string `json:"mailbox" jsonschema:"Name of the mailbox containing the message to reply to"`
	MessageID    int    `json:"message_id" jsonschema:"The unique ID of the message to reply to"`
	ReplyContent string `json:"reply_content" jsonschema:"The content/body of the reply message"`
}

// RegisterReplyToMessage registers the reply_to_message tool with the MCP server
func RegisterReplyToMessage(srv *mcp.Server) {
	mcp.AddTool(srv,
		&mcp.Tool{
			Name:        "reply_to_message",
			Description: "Creates a reply to a specific message and saves it as a draft in the Drafts mailbox. The reply is not sent automatically - it remains in drafts for review and manual sending.",
			Annotations: &mcp.ToolAnnotations{
				Title:           "Reply to Message (Draft)",
				ReadOnlyHint:    false,
				IdempotentHint:  false,
				DestructiveHint: new(false),
				OpenWorldHint:   new(true),
			},
		},
		handleReplyToMessage,
	)
}

func handleReplyToMessage(ctx context.Context, request *mcp.CallToolRequest, input ReplyToMessageInput) (*mcp.CallToolResult, any, error) {
	data, err := jxa.Execute(ctx, replyToMessageScript, input.Account, input.Mailbox, fmt.Sprintf("%d", input.MessageID), input.ReplyContent)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to execute reply_to_message: %w", err)
	}

	return nil, data, nil
}
