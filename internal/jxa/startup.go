package jxa

import (
	"context"
	"fmt"
	"time"
)

// startupCheckScript is a minimal JXA script that verifies Mail.app is accessible
const startupCheckScript = `
function run(argv) {
    try {
        const Mail = Application('Mail');
        Mail.includeStandardAdditions = true;
        
        // Check if Mail is running
        if (!Mail.running()) {
            return JSON.stringify({
                success: false,
                error: 'Mail.app is not running. Please start Mail.app and try again.'
            });
        }
        
        // Try to access accounts to verify we can interact with Mail
        const accounts = Mail.accounts();
        const accountCount = accounts.length;
        
        return JSON.stringify({
            success: true,
            data: {
                running: true,
                accountCount: accountCount,
                version: Mail.version()
            }
        });
    } catch (e) {
        return JSON.stringify({
            success: false,
            error: 'Failed to access Mail.app: ' + e.toString()
        });
    }
}
`

// StartupCheck performs a basic connectivity check with Mail.app
// It verifies that Mail.app is running and accessible via JXA
//
// Common errors:
// - "signal: killed" - macOS is blocking automation; grant permissions in System Settings
// - "Mail.app is not running" - Start Mail.app before running the server
func StartupCheck(ctx context.Context) error {
	// Use a timeout for the startup check
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	result, err := Execute(ctx, startupCheckScript)
	if err != nil {
		return fmt.Errorf("Mail.app startup check failed: %w", err)
	}

	// Verify we got valid data back
	data, ok := result.(map[string]any)
	if !ok {
		return fmt.Errorf("startup check returned unexpected data type: %T", result)
	}

	running, ok := data["running"].(bool)
	if !ok || !running {
		return fmt.Errorf("Mail.app is not properly accessible")
	}

	return nil
}
