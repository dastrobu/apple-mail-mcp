function run(argv) {
    const Mail = Application('Mail');
    Mail.includeStandardAdditions = true;

    // --- Boilerplate: Mail.app running check and logging setup ---
    if (!Mail.running()) {
        return JSON.stringify({
            success: false,
            error: 'Mail.app is not running. Please start Mail.app and try again.',
            errorCode: 'MAIL_APP_NOT_RUNNING'
        });
    }

    const logs = [];
    function log(message) {
        logs.push(message);
    }

    // --- Argument parsing and validation ---
    const accountName = argv[0] || '';
    if (!accountName) {
        return JSON.stringify({
            success: false,
            error: 'Account name is required'
        });
    }

    // --- Helper function to get the full path of a mailbox ---
    function getMailboxPath(mailbox) {
        const path = [];
        let current = mailbox;
        while (current) {
            const name = current.name();
            // Stop when we reach the account itself
            if (name === accountName) {
                break;
            }
            path.unshift(name);
            try {
                // The container of a top-level mailbox is the account.
                // The container of an account will throw an error.
                current = current.container();
            } catch (e) {
                log(`Reached top of hierarchy for mailbox '${name}'.`);
                break;
            }
        }
        return path;
    }

    // --- Recursive function to find unread mailboxes ---
    function findUnreadRecursive(mailbox, unreadMailboxes) {
        log(`Checking mailbox: "${mailbox.name()}"`);
        try {
            // Check for unread messages
            if (mailbox.unreadCount() > 0) {
                const mailboxPath = getMailboxPath(mailbox);
                log(`Found ${mailbox.unreadCount()} unread in: "${mailboxPath.join(' > ')}"`);
                unreadMailboxes.push({
                    name: mailbox.name(),
                    path: mailboxPath,
                    unreadCount: mailbox.unreadCount()
                });
            }
        } catch (e) {
            log(`Could not get unread count for "${mailbox.name()}": ${e.toString()}`);
        }

        // Recurse into sub-mailboxes
        const subMailboxes = mailbox.mailboxes();
        if (subMailboxes && subMailboxes.length > 0) {
            for (let i = 0; i < subMailboxes.length; i++) {
                findUnreadRecursive(subMailboxes[i], unreadMailboxes);
            }
        }
    }

    try {
        log(`Searching for account: "${accountName}"`);
        const account = Mail.accounts.byName(accountName);

        // Verify that the account object is valid by accessing a property
        try {
            account.name();
        } catch (e) {
            log(`Error accessing account: ${e.toString()}`);
            return JSON.stringify({
                success: false,
                error: `Account '${accountName}' not found.`
            });
        }

        const unreadMailboxes = [];
        const topLevelMailboxes = account.mailboxes();

        log(`Found ${topLevelMailboxes.length} top-level mailboxes in account "${accountName}". Starting scan.`);
        for (let i = 0; i < topLevelMailboxes.length; i++) {
            findUnreadRecursive(topLevelMailboxes[i], unreadMailboxes);
        }
        log(`Scan complete. Found ${unreadMailboxes.length} mailboxes with unread messages.`);

        // --- Return success object ---
        return JSON.stringify({
            success: true,
            data: {
                mailboxes: unreadMailboxes,
                count: unreadMailboxes.length
            },
            logs: logs.join("\n")
        });

    } catch (e) {
        log(`A critical error occurred: ${e.toString()}`);
        // Generic error for permission issues, as they are hard to distinguish
        return JSON.stringify({
            success: false,
            error: 'Permission denied to access Mail.app. Please grant automation permissions in System Settings > Privacy & Security > Automation.',
            errorCode: 'MAIL_APP_NO_PERMISSIONS'
        });
    }
}
