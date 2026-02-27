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
  let args;
  try {
    args = JSON.parse(argv[0]);
  } catch (e) {
    return JSON.stringify({
      success: false,
      error: "Failed to parse input arguments JSON",
    });
  }

  const accountName = args.account || "";
  const mailboxPath = args.mailboxPath || [];
  const limit = args.limit || 50;

  // Validate account name
  if (!accountName) {
    return JSON.stringify({
      success: false,
      error: "Account name is required",
    });
  }

  // Validate mailbox path
  if (!Array.isArray(mailboxPath) || mailboxPath.length === 0) {
    return JSON.stringify({
      success: false,
      error: "Mailbox path must be a non-empty array",
    });
  }

  // Validate limit
  if (limit < 1 || limit > 1000) {
    return JSON.stringify({
      success: false,
      error: "Limit must be between 1 and 1000",
    });
  }

  try {
    // Find account using name lookup
    let targetAccount;
    try {
      targetAccount = Mail.accounts[accountName];
      targetAccount.name(); // Verify account exists
    } catch (e) {
      return JSON.stringify({
        success: false,
        error:
          'Account "' +
          accountName +
          '" not found. Please verify the account name is correct.',
      });
    }

    // Robust mailbox traversal function
    function findMailboxByPath(account, targetPath) {
      if (!targetPath || targetPath.length === 0) return account;

      try {
        let current = account;
        for (let i = 0; i < targetPath.length; i++) {
          const part = targetPath[i];
          let next = null;
          try {
            next = current.mailboxes.whose({ name: part })()[0];
          } catch (e) {}

          if (!next) {
            try {
              next = current.mailboxes[part];
              next.name();
            } catch (e) {}
          }
          if (!next) throw new Error("not found");
          current = next;
        }
        return current;
      } catch (e) {}

      try {
        const allMailboxes = account.mailboxes();
        for (let i = 0; i < allMailboxes.length; i++) {
          const mbx = allMailboxes[i];
          const path = [];
          let current = mbx;
          while (current) {
            try {
              const name = current.name();
              if (name === account.name()) break;
              path.unshift(name);
              current = current.container();
            } catch (e) {
              break;
            }
          }
          if (path.length === targetPath.length) {
            let match = true;
            for (let j = 0; j < path.length; j++) {
              if (path[j] !== targetPath[j]) {
                match = false;
                break;
              }
            }
            if (match) return mbx;
          }
        }
      } catch (e) {}
      return null;
    }

    let targetAccountRef =
      typeof targetAccount !== "undefined" ? targetAccount : accounts[0];
    let targetMailbox = findMailboxByPath(targetAccountRef, mailboxPath);
    if (!targetMailbox) {
      return JSON.stringify({
        success: false,
        error:
          "Mailbox path '" +
          mailboxPath.join(" > ") +
          "' not found in account '" +
          accountName +
          "'.",
      });
    }
    let currentContainer = targetMailbox; // Used by get_message_content
    let parentMailbox = targetMailbox; // Used by some scripts if any

    const msgs = targetMailbox.messages;

    // Fetch bulk properties only for active filters
    let subjects = null;
    let senders = null;
    let readStatuses = null;
    let flaggedStatuses = null;
    let datesReceived = null;

    let filterDateAfter = null;
    let filterDateBefore = null;

    if (args.subject) {
      subjects = msgs.subject();
    }
    if (args.sender) {
      senders = msgs.sender();
    }
    if (args.readStatus !== undefined && args.readStatus !== null) {
      readStatuses = msgs.readStatus();
    }
    if (args.flaggedOnly) {
      flaggedStatuses = msgs.flaggedStatus();
    }
    if (args.dateAfter) {
      try {
        filterDateAfter = new Date(args.dateAfter);
        datesReceived = msgs.dateReceived();
      } catch (e) {
        log("Invalid dateAfter format: " + e.toString());
      }
    }
    if (args.dateBefore) {
      try {
        filterDateBefore = new Date(args.dateBefore);
        if (!datesReceived) datesReceived = msgs.dateReceived();
      } catch (e) {
        log("Invalid dateBefore format: " + e.toString());
      }
    }

    let totalMessages = 0;
    if (subjects) totalMessages = subjects.length;
    else if (senders) totalMessages = senders.length;
    else if (readStatuses) totalMessages = readStatuses.length;
    else if (flaggedStatuses) totalMessages = flaggedStatuses.length;
    else if (datesReceived) totalMessages = datesReceived.length;
    else totalMessages = msgs.length;

    const matchingIndices = [];
    const subjectLower = args.subject ? args.subject.toLowerCase() : null;
    const senderLower = args.sender ? args.sender.toLowerCase() : null;

    for (let i = 0; i < totalMessages; i++) {
      let match = true;

      if (subjects && subjectLower) {
        const s = subjects[i];
        if (!s || s.toLowerCase().indexOf(subjectLower) === -1) match = false;
      }
      if (match && senders && senderLower) {
        const s = senders[i];
        if (!s || s.toLowerCase().indexOf(senderLower) === -1) match = false;
      }
      if (match && readStatuses) {
        if (readStatuses[i] !== args.readStatus) match = false;
      }
      if (match && flaggedStatuses) {
        if (flaggedStatuses[i] !== true) match = false;
      }
      if (match && datesReceived) {
        const d = datesReceived[i];
        if (filterDateAfter && d <= filterDateAfter) match = false;
        if (filterDateBefore && d >= filterDateBefore) match = false;
      }

      if (match) {
        matchingIndices.push(i);
      }
    }

    const totalMatches = matchingIndices.length;
    log("Found " + totalMatches + " matching messages");

    // Limit the number of messages to process
    const maxProcess = Math.min(totalMatches, limit);
    const messages = [];

    for (let i = 0; i < maxProcess; i++) {
      const idx = matchingIndices[i];
      const msg = msgs[idx];

      try {
        // Get basic properties
        const id = msg.id();
        const subject = msg.subject();
        const sender = msg.sender();
        const dateReceived = msg.dateReceived();
        const dateSent = msg.dateSent();
        const readStatus = msg.readStatus();
        const flaggedStatus = msg.flaggedStatus();
        const messageSize = msg.messageSize();

        // Get content preview
        let content = "";
        try {
          content = msg.content();
        } catch (e) {
          log("Error reading content for message " + id + ": " + e.toString());
          content = "";
        }

        const contentPreview =
          content.length > 100 ? content.substring(0, 100) + "..." : content;

        // Get recipient counts
        let toCount = 0;
        let ccCount = 0;

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

        // Get mailbox path for this message
        function getMailboxPath(mailbox, accountName) {
          const path = [];
          let current = mailbox;

          while (current) {
            try {
              const name = current.name();
              if (name === accountName) break;
              path.unshift(name);
              current = current.container();
            } catch (e) {
              break;
            }
          }
          return path;
        }

        let messageMboxPath = mailboxPath;
        try {
          const msgMailbox = msg.mailbox();
          messageMboxPath = getMailboxPath(msgMailbox, accountName);
        } catch (e) {
          log(
            "Error reading mailbox path for message " +
              id +
              ": " +
              e.toString(),
          );
        }

        messages.push({
          id: id,
          subject: subject,
          sender: sender,
          date_received: dateReceived.toISOString(),
          date_sent: dateSent ? dateSent.toISOString() : null,
          read_status: readStatus,
          flagged_status: flaggedStatus,
          message_size: messageSize,
          content_preview: contentPreview,
          content_length: content.length,
          to_count: toCount,
          cc_count: ccCount,
          total_recipients: toCount + ccCount,
          mailbox_path: messageMboxPath,
          account: accountName,
        });
      } catch (e) {
        log("Error reading message " + i + ": " + e.toString());
        // Skip this message and continue
      }
    }

    return JSON.stringify({
      success: true,
      data: {
        messages: messages,
        count: messages.length,
        total_matches: totalMatches,
        limit: limit,
        has_more: totalMatches > limit,
        filters_applied: {
          subject: args.subject || null,
          sender: args.sender || null,
          read_status:
            args.readStatus !== undefined && args.readStatus !== null
              ? args.readStatus
              : null,
          flagged_only: args.flaggedOnly || false,
          date_after: args.dateAfter || null,
          date_before: args.dateBefore || null,
        },
      },
      logs: logs.join("\n"),
    });
  } catch (e) {
    return JSON.stringify({
      success: false,
      error: "Failed to find messages: " + e.toString(),
    });
  }
}
