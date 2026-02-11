#!/usr/bin/osascript -l JavaScript

function run(argv) {
    const Mail = Application('Mail');
    Mail.includeStandardAdditions = true;
    
    // Parse arguments: accountName, mailboxName, messageId, replyContent
    const accountName = argv[0] || '';
    const mailboxName = argv[1] || '';
    const messageId = parseInt(argv[2]);
    const replyContent = argv[3] || '';
    
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
        
        // Create reply message
        const replyMessage = Mail.OutgoingMessage({
            sender: targetAccount.fullName() + ' <' + targetAccount.emailAddress() + '>',
            subject: 'Re: ' + targetMessage.subject(),
            content: replyContent,
            visible: false
        });
        
        // Set the recipient to the original sender
        const originalSender = targetMessage.sender();
        // Parse sender email from "Name <email@domain.com>" format
        let senderEmail = originalSender;
        const emailMatch = originalSender.match(/<([^>]+)>/);
        if (emailMatch) {
            senderEmail = emailMatch[1];
        }
        
        replyMessage.toRecipients.push(Mail.Recipient({
            address: senderEmail
        }));
        
        // Add CC recipients from original message if any
        try {
            const originalCcRecipients = targetMessage.ccRecipients();
            for (let i = 0; i < originalCcRecipients.length; i++) {
                replyMessage.ccRecipients.push(Mail.Recipient({
                    address: originalCcRecipients[i].address()
                }));
            }
        } catch (e) {
            // No CC recipients or error accessing them
        }
        
        // Set reply-to headers to maintain thread
        try {
            const messageId = targetMessage.messageId();
            if (messageId) {
                // Note: Mail.app handles In-Reply-To and References headers automatically
                // when using reply() method, but we're creating manually so we set these
                replyMessage.properties()['in-reply-to'] = messageId;
            }
        } catch (e) {
            // Continue if we can't set headers
        }
        
        // Find the Drafts mailbox
        let draftsMailbox = null;
        const mailboxes = targetAccount.mailboxes();
        
        for (let i = 0; i < mailboxes.length; i++) {
            const mbName = mailboxes[i].name();
            // Check for common drafts mailbox names
            if (mbName === 'Drafts' || mbName === 'Draft' || 
                mbName.toLowerCase() === 'drafts' || mbName.toLowerCase() === 'draft') {
                draftsMailbox = mailboxes[i];
                break;
            }
        }
        
        if (!draftsMailbox) {
            return JSON.stringify({
                success: false,
                error: 'Drafts mailbox not found in account. Please ensure a Drafts mailbox exists.'
            });
        }
        
        // Save the message to drafts
        draftsMailbox.messages.push(replyMessage);
        
        // Get the draft message ID (it's the last message in drafts)
        const draftMessages = draftsMailbox.messages();
        let draftId = null;
        if (draftMessages.length > 0) {
            draftId = draftMessages[draftMessages.length - 1].id();
        }
        
        const result = {
            draft_id: draftId,
            subject: replyMessage.subject(),
            to_recipients: [senderEmail],
            drafts_mailbox: draftsMailbox.name(),
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