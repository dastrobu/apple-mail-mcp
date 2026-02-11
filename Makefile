.PHONY: build clean test test-scripts fmt vet help

# Binary name
BINARY=mail-mcp-server

# Build the binary
build:
	go build -o $(BINARY) ./cmd/mail-mcp-server

# Clean build artifacts
clean:
	rm -f $(BINARY)
	go clean

# Run Go tests
test:
	go test -v -count=1 ./...

# Test JXA scripts directly (requires Mail.app running)
test-scripts:
	@echo "Testing list_mailboxes.js..."
	@osascript -l JavaScript internal/tools/scripts/list_mailboxes.js || echo "Failed"
	@echo "\nTesting get_messages.js..."
	@osascript -l JavaScript internal/tools/scripts/get_messages.js "INBOX" "" 5 || echo "Failed"
	@echo "\nTesting search_messages.js..."
	@osascript -l JavaScript internal/tools/scripts/search_messages.js "test" "subject" 10 || echo "Failed"
	@echo "\nNote: get_message_content.js requires a valid message ID"

# Format Go code
fmt:
	gofmt -w .

# Run go vet
vet:
	go vet ./...

# Download and verify dependencies
deps:
	go mod download
	go mod verify

# Tidy dependencies
tidy:
	go mod tidy

# Run all checks (format, vet, test)
check: fmt vet test

# Display help
help:
	@echo "Available targets:"
	@echo "  build        - Build the binary"
	@echo "  clean        - Remove build artifacts"
	@echo "  test         - Run Go tests"
	@echo "  test-scripts - Test JXA scripts directly (requires Mail.app)"
	@echo "  fmt          - Format Go code"
	@echo "  vet          - Run go vet"
	@echo "  deps         - Download and verify dependencies"
	@echo "  tidy         - Tidy dependencies"
	@echo "  check        - Run fmt, vet, and test"
	@echo "  help         - Display this help message"