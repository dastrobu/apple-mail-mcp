package log

import (
	"context"
	"io"
	"log"
)

// Logger is an interface for logging diagnostics
type Logger interface {
	Printf(format string, v ...any)
}

// contextKey is a private type for context keys to avoid collisions
type contextKey string

const loggerKey contextKey = "logger"

// WithLogger adds a logger to the context
func WithLogger(ctx context.Context, logger Logger) context.Context {
	return context.WithValue(ctx, loggerKey, logger)
}

// FromContext retrieves the logger from context
// Returns a no-op logger if not present
func FromContext(ctx context.Context) Logger {
	if logger, ok := ctx.Value(loggerKey).(Logger); ok {
		return logger
	}
	// Return no-op logger if not present
	return log.New(io.Discard, "", 0)
}
