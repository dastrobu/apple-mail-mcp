package jxa

import (
	"context"
	_ "embed"
	"fmt"
	"time"
)

//go:embed scripts/startup_check.js
var startupCheckScript string

// StartupCheck performs a basic connectivity check with Mail.app
// It verifies that Mail.app is running and accessible via JXA
// Returns the Mail.app properties if successful
//
// Common errors:
// - "signal: killed" - macOS is blocking automation; grant permissions in System Settings
// - "Mail.app is not running" - Start Mail.app before running the server
func StartupCheck(ctx context.Context) (map[string]any, error) {
	// Use a timeout for the startup check
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	result, err := Execute(ctx, startupCheckScript)
	if err != nil {
		return nil, fmt.Errorf("Mail.app startup check failed: %w", err)
	}

	// Verify we got valid data back
	data, ok := result.(map[string]any)
	if !ok {
		return nil, fmt.Errorf("startup check returned unexpected data type: %T", result)
	}

	running, ok := data["running"].(bool)
	if !ok || !running {
		return nil, fmt.Errorf("Mail.app is not properly accessible")
	}

	return data, nil
}
