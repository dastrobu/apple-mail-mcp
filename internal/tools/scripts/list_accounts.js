function run(argv) {
    try {
        // Initialize Mail.app
        const Mail = Application('Mail');
        Mail.includeStandardAdditions = true;
        
        // Parse arguments: filterEnabled
        const filterEnabledArg = argv[0] || '';
        
        if (!filterEnabledArg) {
            return JSON.stringify({
                success: false,
                error: 'Filter enabled flag is required (true or false)'
            });
        }
        
        const filterEnabled = filterEnabledArg.toLowerCase() === 'true';
        
        // Get all accounts
        const accounts = Mail.accounts();
        const accountList = [];
        
        // Iterate through accounts and gather information
        for (let i = 0; i < accounts.length; i++) {
            const account = accounts[i];
            const isEnabled = account.enabled();
            
            // Apply enabled filter if requested
            if (filterEnabled && !isEnabled) {
                continue;
            }
            
            // Get basic account information
            const accountInfo = {
                name: account.name(),
                enabled: isEnabled,
                emailAddresses: []
            };
            
            // Try to get email addresses (may not be available for all account types)
            try {
                const addresses = account.emailAddresses();
                if (addresses && addresses.length > 0) {
                    for (let j = 0; j < addresses.length; j++) {
                        accountInfo.emailAddresses.push(addresses[j]);
                    }
                }
            } catch (e) {
                // Email addresses may not be available for some account types
                accountInfo.emailAddresses = [];
            }
            
            // Get mailbox count
            try {
                const mailboxes = account.mailboxes();
                accountInfo.mailboxCount = mailboxes ? mailboxes.length : 0;
            } catch (e) {
                accountInfo.mailboxCount = 0;
            }
            
            accountList.push(accountInfo);
        }
        
        // Return success with account data
        return JSON.stringify({
            success: true,
            data: {
                accounts: accountList,
                count: accountList.length
            }
        });
    } catch (e) {
        return JSON.stringify({
            success: false,
            error: e.toString()
        });
    }
}