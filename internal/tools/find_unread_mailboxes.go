package tools

import (
	"context"
	_ "embed"
	"fmt"

	"github.com/dastrobu/apple-mail-mcp/internal/jxa"
	"github.com/modelcontextprotocol/go-sdk/mcp"
)

//go:embed scripts/find_unread_mailboxes.js
var findUnreadMailboxesScript string

// FindUnreadMailboxesInput defines the input parameters for the find_unread_mailboxes tool.
type FindUnreadMailboxesInput struct {
	Account string `json:"account" jsonschema:"The name of the email account to search in"`
}

// RegisterFindUnreadMailboxesTool registers the tool with the MCP server.
func RegisterFindUnreadMailboxesTool(srv *mcp.Server) {
	mcp.AddTool(srv,
		&mcp.Tool{
			Name:        "find_unread_mailboxes",
			Description: "Finds all mailboxes in a given account that have unread messages.",
			Annotations: &mcp.ToolAnnotations{
				Title:           "Find Mailboxes with Unread Messages",
				ReadOnlyHint:    true,
				IdempotentHint:  true,
				DestructiveHint: new(false),
				OpenWorldHint:   new(true),
			},
		},
		handleFindUnreadMailboxes,
	)
}

func handleFindUnreadMailboxes(ctx context.Context, request *mcp.CallToolRequest, input FindUnreadMailboxesInput) (*mcp.CallToolResult, any, error) {
	if input.Account == "" {
		return nil, nil, fmt.Errorf("account name is required")
	}

	data, err := jxa.Execute(ctx, findUnreadMailboxesScript, input.Account)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to execute find_unread_mailboxes script: %w", err)
	}

	return nil, data, nil
}
