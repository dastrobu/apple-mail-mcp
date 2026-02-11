package jxa

import (
	"context"
	"encoding/json"
	"fmt"
	"os/exec"
)

// Result represents the result of a JXA script execution
type Result struct {
	Success bool           `json:"success"`
	Data    map[string]any `json:"data,omitempty"`
	Error   string         `json:"error,omitempty"`
}

// Execute runs a JXA script with the given arguments and returns the parsed result
func Execute(ctx context.Context, script string, args ...string) (any, error) {
	// Build osascript command
	cmdArgs := []string{"-l", "JavaScript", "-e", script}
	cmdArgs = append(cmdArgs, args...)

	cmd := exec.CommandContext(ctx, "osascript", cmdArgs...)
	output, err := cmd.CombinedOutput()
	if err != nil {
		// Provide more context about the failure
		if len(output) > 0 {
			return nil, fmt.Errorf("osascript execution failed: %w\nOutput: %s\nArguments: %v", err, string(output), args)
		}
		return nil, fmt.Errorf("osascript execution failed: %w\nArguments: %v", err, args)
	}

	// Check if output is empty
	if len(output) == 0 {
		return nil, fmt.Errorf("osascript returned empty output (expected JSON)\nArguments: %v", args)
	}

	// Parse JSON output
	var result map[string]any
	if err := json.Unmarshal(output, &result); err != nil {
		return nil, fmt.Errorf("failed to parse osascript JSON output: %w\nRaw output: %s\nArguments: %v", err, string(output), args)
	}

	// Check for script-level errors
	success, hasSuccess := result["success"].(bool)
	if !hasSuccess {
		return nil, fmt.Errorf("script output missing 'success' field or invalid type\nOutput: %s\nArguments: %v", string(output), args)
	}

	if !success {
		errMsg := "unknown error (script returned success=false with no error message)"
		if errVal, ok := result["error"].(string); ok && errVal != "" {
			errMsg = errVal
		}
		return nil, fmt.Errorf("JXA script error: %s\nArguments: %v", errMsg, args)
	}

	// Extract and return data field
	data, ok := result["data"]
	if !ok {
		return nil, fmt.Errorf("script output missing 'data' field\nOutput: %s\nArguments: %v", string(output), args)
	}

	return data, nil
}
