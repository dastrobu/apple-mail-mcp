function run(argv) {
    try {
        // Initialize Mail.app
        const Mail = Application('Mail');
        Mail.includeStandardAdditions = true;
        
        // Parse arguments: accountName
        const accountFilter = argv[0] || '';
        
        if (!accountFilter) {
            return JSON.stringify({
                success: false,
                error: 'Account name is required'
            });
        }
        
        // Get all accounts
        const accounts = Mail.accounts();
        const mailboxes = [];
        
        // Iterate through accounts and their mailboxes
        for (let i = 0; i < accounts.length; i++) {
            const account = accounts[i];
            const accountName = account.name();
            
            // Apply account filter if provided
            if (accountFilter && accountName !== accountFilter) {
                continue;
            }
            
            const accountMailboxes = account.mailboxes();
            
            // Add each mailbox with account info
            for (let j = 0; j < accountMailboxes.length; j++) {
                const mailbox = accountMailboxes[j];
                mailboxes.push({
                    name: mailbox.name(),
                    account: accountName,
                    unreadCount: mailbox.unreadCount()
                });
            }
        }
        
        // Return success with mailbox data
        return JSON.stringify({
            success: true,
            data: {
                mailboxes: mailboxes,
                count: mailboxes.length
            }
        });
    } catch (e) {
        return JSON.stringify({
            success: false,
            error: e.toString()
        });
    }
}