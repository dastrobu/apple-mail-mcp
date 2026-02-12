package opts

import (
	"fmt"
	"os"

	"github.com/jessevdk/go-flags"
	"github.com/joho/godotenv"
)

// Options defines the command-line options for the MCP server
type Options struct {
	Transport string `long:"transport" env:"TRANSPORT" description:"Transport type: stdio or http" default:"stdio" choice:"stdio" choice:"http"`
	Port      int    `long:"port" env:"PORT" description:"HTTP port (only used with --transport=http)" default:"8787"`
	Host      string `long:"host" env:"HOST" description:"HTTP host (only used with --transport=http)" default:"localhost"`
	Debug     bool   `long:"debug" env:"DEBUG" description:"Enable debug logging of tool calls and results to stderr"`
}

// Parse parses command-line arguments and environment variables
// It also loads .env file if present (but doesn't fail if missing)
func Parse() (*Options, error) {
	// Try to load .env file (ignore error if file doesn't exist)
	// This allows local development with .env files while working in production with env vars
	_ = godotenv.Load()

	var opts Options
	parser := flags.NewParser(&opts, flags.Default)

	if _, err := parser.Parse(); err != nil {
		if flagsErr, ok := err.(*flags.Error); ok && flagsErr.Type == flags.ErrHelp {
			os.Exit(0)
		}
		return nil, fmt.Errorf("failed to parse options: %w", err)
	}

	return &opts, nil
}
