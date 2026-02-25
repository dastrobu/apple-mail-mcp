function run(argv) {
  const Mail = Application("Mail");
  Mail.includeStandardAdditions = true;
  const SystemEvents = Application("System Events");

  // 1. CRITICAL: Check if running FIRST
  if (!Mail.running()) {
    return JSON.stringify({
      success: false,
      error: "Mail.app is not running. Please start Mail.app and try again.",
      errorCode: "MAIL_APP_NOT_RUNNING",
    });
  }

  // 2. Logging setup
  const logs = [];
  function log(message) {
    logs.push(message);
  }

  // 3. Argument Parsing & Validation
  let args;
  try {
    args = JSON.parse(argv[0]);
  } catch (e) {
    return JSON.stringify({
      success: false,
      error: "Failed to parse input arguments JSON",
      logs: logs.join("\n"),
    });
  }

  const outgoingIdToReplace = args.outgoing_id;

  if (outgoingIdToReplace === undefined || outgoingIdToReplace === null) {
    return JSON.stringify({
      success: false,
      error: "A valid outgoing_id is required.",
      errorCode: "MISSING_PARAMETERS",
      logs: logs.join("\n"),
    });
  }
  log(`Attempting to replace outgoing message with ID: ${outgoingIdToReplace}`);

  // 4. Execution wrapped in try/catch
  try {
    // --- Find the Old Message ---
    // We search directly in Mail.outgoingMessages (open windows/drafts)
    const messages = Mail.outgoingMessages.whose({ id: outgoingIdToReplace })();

    if (messages.length === 0) {
      return JSON.stringify({
        success: false,
        error: `Outgoing message with ID ${outgoingIdToReplace} not found.`,
      });
    }

    const oldMsg = messages[0];
    log(`Found message to replace. Subject: "${oldMsg.subject()}"`);

    // --- Capture State from Old Message ---
    const oldSubject = oldMsg.subject();
    const oldSender = oldMsg.sender();

    const getAddresses = (recipients) => {
      try {
        return recipients().map((r) => r.address());
      } catch (e) {
        log(`Warning: Could not read recipients: ${e.toString()}`);
        return [];
      }
    };
    const oldTo = getAddresses(oldMsg.toRecipients);
    const oldCc = getAddresses(oldMsg.ccRecipients);
    const oldBcc = getAddresses(oldMsg.bccRecipients);

    // --- Create a New Outgoing Message ---
    const newMsg = Mail.OutgoingMessage({ visible: true });
    Mail.outgoingMessages.push(newMsg);
    log("Created new empty outgoing message window.");

    // --- Apply New/Old Properties ---
    newMsg.subject = args.subject !== undefined ? args.subject : oldSubject;

    const senderToSet = args.sender !== undefined ? args.sender : oldSender;
    if (senderToSet) {
      newMsg.sender = senderToSet;
    }

    const updateRecipients = (collection, newRecipients, fallback) => {
      const addresses = newRecipients !== undefined ? newRecipients : fallback;
      if (Array.isArray(addresses)) {
        addresses.forEach((addr) =>
          collection.push(Mail.Recipient({ address: addr })),
        );
      }
    };

    updateRecipients(newMsg.toRecipients, args.to_recipients, oldTo);
    updateRecipients(newMsg.ccRecipients, args.cc_recipients, oldCc);
    updateRecipients(newMsg.bccRecipients, args.bcc_recipients, oldBcc);
    log("Applied properties to new message.");

    // --- Delete the Old Message ---
    Mail.delete(oldMsg);
    log(`Deleted old outgoing message with ID ${outgoingIdToReplace}.`);

    // NOTE: We are NOT saving the message here. It exists as an open window.

    Mail.activate();
    const pid = SystemEvents.processes.byName("Mail").unixId();

    // 5. CRITICAL: Return `outgoing_id` of the *new* message
    return JSON.stringify({
      success: true,
      data: {
        outgoing_id: newMsg.id(),
        subject: newMsg.subject(),
        pid: pid,
        message: "Outgoing message was successfully replaced.",
      },
      logs: logs.join("\n"),
    });
  } catch (e) {
    log(`Error during message replacement: ${e.toString()}`);
    return JSON.stringify({
      success: false,
      error: `Failed to replace outgoing message: ${e.toString()}`,
      logs: logs.join("\n"),
    });
  }
}
