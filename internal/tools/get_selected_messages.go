package tools

import (
	"context"
	_ "embed"

	"github.com/dastrobu/apple-mail-mcp/internal/jxa"
	"github.com/modelcontextprotocol/go-sdk/mcp"
)

//go:embed scripts/get_selected_messages.js
var getSelectedMessagesScript string

// GetSelectedMessagesInput defines input parameters for get_selected_messages tool
// This tool takes no input parameters as it operates on the current selection
type GetSelectedMessagesInput struct{}

// RegisterGetSelectedMessages registers the get_selected_messages tool with the MCP server
func RegisterGetSelectedMessages(srv *mcp.Server) {
	mcp.AddTool(srv,
		&mcp.Tool{
			Name:        "get_selected_messages",
			Description: "Gets the currently selected message(s) in Mail.app. Returns details about all selected messages in the frontmost Mail viewer window.",
			Annotations: &mcp.ToolAnnotations{
				Title:           "Get Selected Messages",
				ReadOnlyHint:    true,
				IdempotentHint:  false, // Selection can change between calls
				DestructiveHint: Pointer(false),
				OpenWorldHint:   Pointer(true),
			},
		},
		handleGetSelectedMessages,
	)
}

func handleGetSelectedMessages(ctx context.Context, request *mcp.CallToolRequest, input GetSelectedMessagesInput) (*mcp.CallToolResult, any, error) {
	data, err := jxa.Execute(ctx, getSelectedMessagesScript)
	if err != nil {
		return nil, nil, err
	}

	return nil, data, nil
}
