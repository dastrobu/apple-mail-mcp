package main

import (
	"context"
	"log"

	"github.com/dastrobu/apple-mail-mcp/internal/tools"
	"github.com/modelcontextprotocol/go-sdk/mcp"
)

const (
	serverName    = "apple-mail"
	serverVersion = "0.1.0"
)

func main() {
	if err := run(); err != nil {
		log.Fatalf("Server error: %v", err)
	}
}

func run() error {
	// Create MCP server
	srv := mcp.NewServer(&mcp.Implementation{
		Name:    serverName,
		Version: serverVersion,
	}, nil)

	// Register all tools
	tools.RegisterAll(srv)

	// Log to stderr (stdout is used for MCP communication)
	log.Printf("Apple Mail MCP Server v%s initialized\n", serverVersion)

	// Run the server on STDIO transport
	ctx := context.Background()
	if err := srv.Run(ctx, &mcp.StdioTransport{}); err != nil {
		return err
	}

	return nil
}
