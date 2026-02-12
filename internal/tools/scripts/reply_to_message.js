#!/usr/bin/osascript -l JavaScript

function run(argv) {
    const Mail = Application('Mail');
    Mail.includeStandardAdditions = true;
    
    // Parse arguments: accountName, mailboxName, messageId, replyContent, openingWindow, replyToAll
    const accountName = argv[0] || '';
    const mailboxName = argv[1] || '';
    const messageId = argv[2] ? parseInt(argv[2]) : 0;
    const replyContent = argv[3] || '';
    const openingWindow = argv[4] === 'true';
    const replyToAll = argv[5] === 'true';
    
    if (!accountName) {
        return JSON.stringify({
            success: false,
            error: 'Account name is required'
        });
    }
    
    if (!mailboxName) {
        return JSON.stringify({
            success: false,
            error: 'Mailbox name is required'
        });
    }
    
    if (!messageId || messageId < 1) {
        return JSON.stringify({
            success: false,
            error: 'Message ID is required and must be a positive integer'
        });
    }
    
    if (!replyContent) {
        return JSON.stringify({
            success: false,
            error: 'Reply content is required'
        });
    }
    
    try {
        // Find specific account and mailbox
        let targetAccount = null;
        let targetMailbox = null;
        const accounts = Mail.accounts();
        
        for (let i = 0; i < accounts.length; i++) {
            const account = accounts[i];
            if (account.name() === accountName) {
                targetAccount = account;
                const mailboxes = account.mailboxes();
                for (let j = 0; j < mailboxes.length; j++) {
                    if (mailboxes[j].name() === mailboxName) {
                        targetMailbox = mailboxes[j];
                        break;
                    }
                }
                break;
            }
        }
        
        if (!targetAccount) {
            return JSON.stringify({
                success: false,
                error: `Account "${accountName}" not found. Please verify the account name is correct.`
            });
        }
        
        if (!targetMailbox) {
            return JSON.stringify({
                success: false,
                error: `Mailbox "${mailboxName}" not found in account "${accountName}". Please verify the mailbox name is correct.`
            });
        }
        
        // Find the message by ID
        let targetMessage = null;
        const messages = targetMailbox.messages();
        
        for (let i = 0; i < messages.length; i++) {
            if (messages[i].id() === messageId) {
                targetMessage = messages[i];
                break;
            }
        }
        
        if (!targetMessage) {
            return JSON.stringify({
                success: false,
                error: `Message with ID ${messageId} not found in mailbox "${mailboxName}". The message may have been deleted or moved.`
            });
        }
        
        // Use Mail.app's built-in reply method to create the reply
        // This properly sets up threading, headers, and recipients
        const replyMessage = targetMessage.reply({
            openingWindow: openingWindow,
            replyToAll: replyToAll
        });
        
        if (!replyMessage) {
            return JSON.stringify({
                success: false,
                error: 'Failed to create reply message. The reply() method returned null.'
            });
        }
        
        // Set the reply content
        replyMessage.content = replyContent;
        
        // The reply is automatically saved as a draft by Mail.app
        // Get the draft message details
        const draftId = replyMessage.id();
        const subject = replyMessage.subject();
        
        // Get recipient addresses
        const toRecipients = [];
        try {
            const recipients = replyMessage.toRecipients();
            for (let i = 0; i < recipients.length; i++) {
                toRecipients.push(recipients[i].address());
            }
        } catch (e) {
            // If we can't get recipients, continue
        }
        
        const result = {
            draft_id: draftId,
            subject: subject,
            to_recipients: toRecipients,
            message: 'Reply saved to drafts successfully'
        };
        
        return JSON.stringify({
            success: true,
            data: result
        });
    } catch (e) {
        return JSON.stringify({
            success: false,
            error: `Failed to create reply draft: ${e.toString()}`
        });
    }
}