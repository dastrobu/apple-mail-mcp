package tools

import (
	"context"
	_ "embed"
	"fmt"

	"github.com/dastrobu/apple-mail-mcp/internal/jxa"
	"github.com/modelcontextprotocol/go-sdk/mcp"
)

//go:embed scripts/list_mailboxes.js
var listMailboxesScript string

// ListMailboxesInput defines input parameters for list_mailboxes tool
type ListMailboxesInput struct {
	Account string `json:"account" jsonschema:"Name of the email account"`
}

// RegisterListMailboxes registers the list_mailboxes tool with the MCP server
func RegisterListMailboxes(srv *mcp.Server) {
	mcp.AddTool(srv,
		&mcp.Tool{
			Name:        "list_mailboxes",
			Description: "Lists all mailboxes (folders) for a specific account in Apple Mail.",
			Annotations: &mcp.ToolAnnotations{
				Title:           "List Mailboxes",
				ReadOnlyHint:    true,
				IdempotentHint:  true,
				DestructiveHint: new(false),
				OpenWorldHint:   new(true),
			},
		},
		handleListMailboxes,
	)
}

func handleListMailboxes(ctx context.Context, request *mcp.CallToolRequest, input ListMailboxesInput) (*mcp.CallToolResult, any, error) {
	data, err := jxa.Execute(ctx, listMailboxesScript, input.Account)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to execute list_mailboxes: %w", err)
	}

	return nil, data, nil
}
