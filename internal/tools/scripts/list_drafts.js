function run(argv) {
  const Mail = Application("Mail");
  Mail.includeStandardAdditions = true;

  // Check if Mail.app is running
  if (!Mail.running()) {
    return JSON.stringify({
      success: false,
      error: "Mail.app is not running. Please start Mail.app and try again.",
      errorCode: "MAIL_APP_NOT_RUNNING",
    });
  }

  // Collect logs instead of using console.log
  const logs = [];

  // Helper function to log messages
  function log(message) {
    logs.push(message);
  }

  // Parse arguments
  const accountName = argv[0] || "";
  const limitStr = argv[1] || "";

  // Validate account name
  if (!accountName) {
    return JSON.stringify({
      success: false,
      error: "Account name is required",
    });
  }

  // Parse and validate limit
  const limit = limitStr ? parseInt(limitStr) : 50;
  if (limit < 1 || limit > 1000) {
    return JSON.stringify({
      success: false,
      error: "Limit must be between 1 and 1000",
    });
  }

  try {
    // Use name lookup syntax to find account directly
    let targetAccount;
    try {
      targetAccount = Mail.accounts[accountName];
    } catch (e) {
      return JSON.stringify({
        success: false,
        error:
          'Account "' + accountName + '" not found. Error: ' + e.toString(),
      });
    }

    // Verify account exists by trying to access a property
    try {
      targetAccount.name();
    } catch (e) {
      return JSON.stringify({
        success: false,
        error:
          'Account "' +
          accountName +
          '" not found. Please verify the account name is correct.',
      });
    }

    // Get Drafts mailbox for this account
    // Use Mail.draftsMailbox() which is locale-independent
    const draftsMailbox = Mail.draftsMailbox();

    // Get all draft messages
    const allDrafts = draftsMailbox.messages();
    const totalDrafts = allDrafts.length;

    // Limit the number of drafts to process
    const maxProcess = Math.min(totalDrafts, limit);
    const drafts = [];

    for (let i = 0; i < maxProcess; i++) {
      const msg = allDrafts[i];

      try {
        // Get basic properties
        const id = msg.id();
        const subject = msg.subject();
        const sender = msg.sender();
        const dateReceived = msg.dateReceived();
        const dateSent = msg.dateSent();

        // Get content preview
        let content = "";
        try {
          content = msg.content();
        } catch (e) {
          content = "";
        }

        const contentPreview =
          content.length > 100 ? content.substring(0, 100) + "..." : content;

        // Get recipient counts
        let toCount = 0;
        let ccCount = 0;
        let bccCount = 0;

        try {
          toCount = msg.toRecipients.length;
        } catch (e) {
          log("Error reading To recipients count: " + e.toString());
          toCount = 0;
        }

        try {
          ccCount = msg.ccRecipients.length;
        } catch (e) {
          log("Error reading CC recipients count: " + e.toString());
          ccCount = 0;
        }

        try {
          bccCount = msg.bccRecipients.length;
        } catch (e) {
          log("Error reading BCC recipients count: " + e.toString());
          bccCount = 0;
        }

        // Get recipient addresses
        const toRecipients = [];
        try {
          const toRecips = msg.toRecipients();
          for (let j = 0; j < toRecips.length; j++) {
            toRecipients.push(toRecips[j].address());
          }
        } catch (e) {
          log("Error reading To recipients: " + e.toString());
        }

        const ccRecipients = [];
        try {
          const ccRecips = msg.ccRecipients();
          for (let j = 0; j < ccRecips.length; j++) {
            ccRecipients.push(ccRecips[j].address());
          }
        } catch (e) {
          log("Error reading CC recipients: " + e.toString());
        }

        const bccRecipients = [];
        try {
          const bccRecips = msg.bccRecipients();
          for (let j = 0; j < bccRecips.length; j++) {
            bccRecipients.push(bccRecips[j].address());
          }
        } catch (e) {
          log("Error reading BCC recipients: " + e.toString());
        }

        // Get mailbox (should be Drafts)
        let mailboxName = "Drafts";
        try {
          mailboxName = msg.mailbox().name();
        } catch (e) {
          log("Error reading mailbox name: " + e.toString());
        }

        drafts.push({
          draft_id: id,
          subject: subject,
          sender: sender,
          date_received: dateReceived.toISOString(),
          date_sent: dateSent ? dateSent.toISOString() : null,
          content_preview: contentPreview,
          content_length: content.length,
          to_recipients: toRecipients,
          cc_recipients: ccRecipients,
          bcc_recipients: bccRecipients,
          to_count: toCount,
          cc_count: ccCount,
          bcc_count: bccCount,
          total_recipients: toCount + ccCount + bccCount,
          mailbox: mailboxName,
          account: accountName,
        });
      } catch (e) {
        log("Error reading draft " + i + ": " + e.toString());
        // Skip this draft and continue
      }
    }

    return JSON.stringify({
      success: true,
      data: {
        drafts: drafts,
        count: drafts.length,
        total_drafts: totalDrafts,
        limit: limit,
        has_more: totalDrafts > limit,
      },
      logs: logs.join("\n"),
    });
  } catch (e) {
    return JSON.stringify({
      success: false,
      error: "Failed to list drafts: " + e.toString(),
    });
  }
}
