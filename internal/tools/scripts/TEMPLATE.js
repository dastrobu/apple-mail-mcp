// JXA Script Template for Apple Mail MCP Server
// 
// This is a template for creating new JXA scripts that interact with Mail.app
// Copy this file and modify it for your specific use case.
//
// IMPORTANT: All scripts must follow this structure for compatibility with the MCP server

function run(argv) {
    try {
        // ===== INITIALIZATION =====
        // Initialize Mail.app - REQUIRED for all scripts
        const Mail = Application('Mail');
        Mail.includeStandardAdditions = true;
        
        // ===== ARGUMENT PARSING =====
        // Parse command-line arguments passed from Go
        // Example: const mailboxName = argv[0] || 'INBOX';
        // Example: const limit = argv[1] ? parseInt(argv[1]) : 50;
        
        // TODO: Parse your arguments here
        const param1 = argv[0] || '';
        const param2 = argv[1] || '';
        
        // ===== INPUT VALIDATION =====
        // Validate inputs before proceeding
        // Example: if (!mailboxName) { throw new Error('Mailbox name is required'); }
        
        // TODO: Add validation logic here
        
        // ===== MAIN LOGIC =====
        // Perform Mail.app operations here
        
        // Common patterns:
        
        // Get all accounts:
        // const accounts = Mail.accounts();
        
        // Get mailboxes:
        // const mailboxes = account.mailboxes();
        
        // Get messages:
        // const messages = mailbox.messages();
        
        // Access message properties (use method calls, not direct property access):
        // message.subject()
        // message.sender()
        // message.dateReceived()
        // message.content()
        // message.id()
        
        // Convert dates to ISO strings:
        // const dateStr = message.dateReceived().toISOString();
        
        // TODO: Implement your logic here
        const result = {
            example: "data"
        };
        
        // ===== RETURN SUCCESS =====
        // Always return JSON with success=true and data
        return JSON.stringify({
            success: true,
            data: result
        });
        
    } catch (e) {
        // ===== ERROR HANDLING =====
        // Return JSON with success=false and error message
        return JSON.stringify({
            success: false,
            error: e.toString()
        });
    }
}

// ===== TESTING =====
// Test this script directly from command line:
// osascript -l JavaScript scripts/TEMPLATE.js "arg1" "arg2"

// ===== NOTES =====
//
// 1. Always use try-catch to handle errors
// 2. Return JSON strings, not JavaScript objects
// 3. Use method calls for Mail.app properties: .name(), not .name
// 4. Keep scripts focused on a single task
// 5. Validate inputs before using them
// 6. Convert dates to ISO strings for consistency
// 7. Mail.app must be running for scripts to work
// 8. Test scripts independently before integrating

// ===== COMMON MAIL.APP OBJECTS =====
//
// Application('Mail')
//   .accounts() -> Array of Account objects
//   
// Account
//   .name() -> String
//   .mailboxes() -> Array of Mailbox objects
//   
// Mailbox
//   .name() -> String
//   .messages() -> Array of Message objects
//   .unreadCount() -> Number
//   
// Message
//   .id() -> Number
//   .subject() -> String
//   .sender() -> String
//   .content() -> String
//   .dateReceived() -> Date
//   .dateSent() -> Date
//   .wasRead() -> Boolean
//   .mailbox() -> Mailbox
//   .messageSize() -> Number