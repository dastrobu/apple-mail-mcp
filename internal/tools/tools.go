package tools

import "github.com/modelcontextprotocol/go-sdk/mcp"

// Pointer is a helper function to create pointer values for optional hints
func Pointer[T any](v T) *T {
	return &v
}

// RegisterAll registers all available tools with the MCP server
func RegisterAll(srv *mcp.Server) {
	RegisterListAccounts(srv)
	RegisterListMailboxes(srv)
	RegisterGetMessageContent(srv)
	RegisterGetSelectedMessages(srv)
	RegisterReplyToMessage(srv)
}
