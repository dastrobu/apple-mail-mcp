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

        // Retrieve all Mail.app properties
        // Some properties may fail on certain macOS/Mail versions, so wrap each in try-catch
        const properties = {};

        // Helper function to safely get property
        function safeGet(name, getter) {
            try {
                properties[name] = getter();
            } catch (e) {
                properties[name] = null; // Property not available
            }
        }

        safeGet('alwaysBccMyself', () => Mail.alwaysBccMyself());
        safeGet('alwaysCcMyself', () => Mail.alwaysCcMyself());
        safeGet('applicationVersion', () => Mail.applicationVersion());
        safeGet('fetchInterval', () => Mail.fetchInterval());
        safeGet('backgroundActivityCount', () => Mail.backgroundActivityCount());
        safeGet('chooseSignatureWhenComposing', () => Mail.chooseSignatureWhenComposing());
        safeGet('colorQuotedText', () => Mail.colorQuotedText());
        safeGet('defaultMessageFormat', () => Mail.defaultMessageFormat());
        safeGet('downloadHtmlAttachments', () => Mail.downloadHtmlAttachments());
        safeGet('expandGroupAddresses', () => Mail.expandGroupAddresses());
        safeGet('fixedWidthFont', () => Mail.fixedWidthFont());
        safeGet('fixedWidthFontSize', () => Mail.fixedWidthFontSize());
        safeGet('includeAllOriginalMessageText', () => Mail.includeAllOriginalMessageText());
        safeGet('quoteOriginalMessage', () => Mail.quoteOriginalMessage());
        safeGet('checkSpellingWhileTyping', () => Mail.checkSpellingWhileTyping());
        safeGet('levelOneQuotingColor', () => Mail.levelOneQuotingColor());
        safeGet('levelTwoQuotingColor', () => Mail.levelTwoQuotingColor());
        safeGet('levelThreeQuotingColor', () => Mail.levelThreeQuotingColor());
        safeGet('messageFont', () => Mail.messageFont());
        safeGet('messageFontSize', () => Mail.messageFontSize());
        safeGet('messageListFont', () => Mail.messageListFont());
        safeGet('messageListFontSize', () => Mail.messageListFontSize());
        safeGet('newMailSound', () => Mail.newMailSound());
        safeGet('shouldPlayOtherMailSounds', () => Mail.shouldPlayOtherMailSounds());
        safeGet('sameReplyFormat', () => Mail.sameReplyFormat());
        safeGet('selectedSignature', () => Mail.selectedSignature());
        safeGet('fetchesAutomatically', () => Mail.fetchesAutomatically());
        safeGet('highlightSelectedConversation', () => Mail.highlightSelectedConversation());
        safeGet('useAddressCompletion', () => Mail.useAddressCompletion());
        safeGet('useFixedWidthFont', () => Mail.useFixedWidthFont());
        safeGet('primaryEmail', () => Mail.primaryEmail());

        return JSON.stringify({
            success: true,
            data: {
                running: true,
                accountCount: accountCount,
                version: Mail.version(),
                properties: properties
            }
        });
    } catch (e) {
        return JSON.stringify({
            success: false,
            error: 'Failed to access Mail.app: ' + e.toString()
        });
    }
}
