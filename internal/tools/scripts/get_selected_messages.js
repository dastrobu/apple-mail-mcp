#!/usr/bin/osascript -l JavaScript

function run(argv) {
    const Mail = Application('Mail');
    Mail.includeStandardAdditions = true;
    
    // Parse arguments: limit, startAt (optional, defaults to 0)
    const limit = parseInt(argv[0]);
    const startAt = argv[1] ? parseInt(argv[1]) : 0;
    
    if (!limit || limit < 1) {
        return JSON.stringify({
            success: false,
            error: 'Limit is required and must be at least 1'
        });
    }
    
    if (startAt < 0) {
        return JSON.stringify({
            success: false,
            error: 'startAt must be 0 or greater'
        });
    }
    
    if (limit > 100) {
        return JSON.stringify({
            success: false,
            error: 'Limit cannot exceed 100'
        });
    }
    
    try {
        // Get the selected messages from the frontmost Mail viewer
        const viewers = Mail.messageViewers();
        
        if (!viewers || viewers.length === 0) {
            return JSON.stringify({
                success: false,
                error: 'No Mail viewer windows are open'
            });
        }
        
        // Get the frontmost viewer
        const viewer = viewers[0];
        const selectedMessages = viewer.selectedMessages();
        
        if (!selectedMessages || selectedMessages.length === 0) {
            return JSON.stringify({
                success: true,
                data: {
                    selectedMessagesCount: 0,
                    messages: []
                }
            });
        }
        
        const selectedMessagesCount = selectedMessages.length;
        
        // Check if startAt is beyond available messages
        if (startAt >= selectedMessagesCount) {
            return JSON.stringify({
                success: true,
                data: {
                    selectedMessagesCount: selectedMessagesCount,
                    messages: []
                }
            });
        }
        
        // Extract message details (limited by limit parameter, starting at startAt)
        const result = [];
        const endAt = Math.min(startAt + limit, selectedMessagesCount);
        for (let i = startAt; i < endAt; i++) {
            const msg = selectedMessages[i];
            
            // Get mailbox and account information
            const mailbox = msg.mailbox();
            const account = mailbox.account();
            
            result.push({
                id: msg.id(),
                subject: msg.subject(),
                sender: msg.sender(),
                dateReceived: msg.dateReceived().toISOString(),
                dateSent: msg.dateSent().toISOString(),
                readStatus: msg.readStatus(),
                flaggedStatus: msg.flaggedStatus(),
                junkMailStatus: msg.junkMailStatus(),
                mailbox: mailbox.name(),
                account: account.name()
            });
        }
        
        return JSON.stringify({
            success: true,
            data: {
                selectedMessagesCount: selectedMessagesCount,
                messages: result
            }
        });
    } catch (e) {
        return JSON.stringify({
            success: false,
            error: e.toString()
        });
    }
}