function run(argv) {
  const Mail = Application("Mail");
  Mail.includeStandardAdditions = true;

  // Collect logs instead of using console.log
  const logs = [];

  // Helper function to log messages
  function log(message) {
    logs.push(message);
  }

  // Parse arguments
  const outgoingIdStr = argv[0] || "";
  const rawNewSubject = argv[1] || "";
  const newContent = argv[2] || "";
  const toRecipientsJson = argv[3] || "";
  const ccRecipientsJson = argv[4] || "";
  const bccRecipientsJson = argv[5] || "";
  const newSender = argv[6] || "";
  const openingWindow = argv[7] === "true";

  const outgoingId = outgoingIdStr ? parseInt(outgoingIdStr) : 0;

  // Validate required arguments
  if (!outgoingId || outgoingId < 1) {
    return JSON.stringify({
      success: false,
      error: "Outgoing message ID is required and must be a positive integer",
    });
  }

  try {
    // Find the OutgoingMessage by ID
    const allOutgoing = Mail.outgoingMessages();
    let foundMessage = null;

    for (let i = 0; i < allOutgoing.length; i++) {
      if (allOutgoing[i].id() === outgoingId) {
        foundMessage = allOutgoing[i];
        break;
      }
    }

    if (!foundMessage) {
      return JSON.stringify({
        success: false,
        error:
          "OutgoingMessage with ID " +
          outgoingId +
          " not found. The message may have been sent, closed, or Mail.app may have been restarted.",
      });
    }

    // Read existing properties from the OutgoingMessage
    const existingSubject = foundMessage.subject();
    const existingSender = foundMessage.sender();
    const existingContent = foundMessage.content();

    // Read existing recipients
    const existingTo = [];
    try {
      const toRecips = foundMessage.toRecipients();
      for (let i = 0; i < toRecips.length; i++) {
        existingTo.push(toRecips[i].address());
      }
    } catch (e) {
      log("Error reading To recipients: " + e.toString());
    }

    const existingCc = [];
    try {
      const ccRecips = foundMessage.ccRecipients();
      for (let i = 0; i < ccRecips.length; i++) {
        existingCc.push(ccRecips[i].address());
      }
    } catch (e) {
      log("Error reading CC recipients: " + e.toString());
    }

    const existingBcc = [];
    try {
      const bccRecips = foundMessage.bccRecipients();
      for (let i = 0; i < bccRecips.length; i++) {
        existingBcc.push(bccRecips[i].address());
      }
    } catch (e) {
      log("Error reading BCC recipients: " + e.toString());
    }

    // Trim and determine final values (new values override existing)
    const newSubject = rawNewSubject.trim();
    const finalSubject = newSubject || existingSubject;
    const finalContent = newContent || existingContent;
    const finalSender = newSender || existingSender;

    // Parse recipient arrays from JSON (empty string means keep existing)
    let finalTo = existingTo;
    if (toRecipientsJson) {
      try {
        finalTo = JSON.parse(toRecipientsJson);
      } catch (e) {
        return JSON.stringify({
          success: false,
          error: "Invalid To recipients JSON: " + e.toString(),
        });
      }
    }

    let finalCc = existingCc;
    if (ccRecipientsJson) {
      try {
        finalCc = JSON.parse(ccRecipientsJson);
      } catch (e) {
        return JSON.stringify({
          success: false,
          error: "Invalid CC recipients JSON: " + e.toString(),
        });
      }
    }

    let finalBcc = existingBcc;
    if (bccRecipientsJson) {
      try {
        finalBcc = JSON.parse(bccRecipientsJson);
      } catch (e) {
        return JSON.stringify({
          success: false,
          error: "Invalid BCC recipients JSON: " + e.toString(),
        });
      }
    }

    // Delete the old OutgoingMessage
    Mail.delete(foundMessage);

    // Create new outgoing message with updated properties
    const msgProps = {
      subject: finalSubject,
      visible: openingWindow,
    };

    if (finalSender) {
      msgProps.sender = finalSender;
    }

    const msg = Mail.make({
      new: "outgoingMessage",
      withProperties: msgProps,
    });

    // Add To recipients
    for (let i = 0; i < finalTo.length; i++) {
      if (finalTo[i]) {
        try {
          const recip = Mail.ToRecipient({ address: finalTo[i] });
          msg.toRecipients.push(recip);
        } catch (e) {
          log("Error adding To recipient: " + e.toString());
        }
      }
    }

    // Add CC recipients
    for (let i = 0; i < finalCc.length; i++) {
      if (finalCc[i]) {
        try {
          const recip = Mail.CcRecipient({ address: finalCc[i] });
          msg.ccRecipients.push(recip);
        } catch (e) {
          log("Error adding CC recipient: " + e.toString());
        }
      }
    }

    // Add BCC recipients
    for (let i = 0; i < finalBcc.length; i++) {
      if (finalBcc[i]) {
        try {
          const recip = Mail.BccRecipient({ address: finalBcc[i] });
          msg.bccRecipients.push(recip);
        } catch (e) {
          log("Error adding BCC recipient: " + e.toString());
        }
      }
    }

    // Set content
    Mail.make({
      new: "paragraph",
      withData: finalContent,
      at: msg.content,
    });

    // Save the new message
    msg.save();

    // Get the new OutgoingMessage ID
    const newOutgoingId = msg.id();
    const newSubjectResult = msg.subject();
    const newSenderResult = msg.sender();

    // Read back recipients
    const toAddrs = [];
    try {
      const recipients = msg.toRecipients();
      for (let i = 0; i < recipients.length; i++) {
        toAddrs.push(recipients[i].address());
      }
    } catch (e) {
      log("Error reading To recipients: " + e.toString());
    }

    const ccAddrs = [];
    try {
      const recipients = msg.ccRecipients();
      for (let i = 0; i < recipients.length; i++) {
        ccAddrs.push(recipients[i].address());
      }
    } catch (e) {
      log("Error reading CC recipients: " + e.toString());
    }

    const bccAddrs = [];
    try {
      const recipients = msg.bccRecipients();
      for (let i = 0; i < recipients.length; i++) {
        bccAddrs.push(recipients[i].address());
      }
    } catch (e) {
      log("Error reading BCC recipients: " + e.toString());
    }

    // Check if all recipients were added successfully
    let message =
      "OutgoingMessage replaced successfully (old message deleted, new message created with updated properties)";
    let warning = null;
    const requestedToCount = finalTo.length;
    const requestedCcCount = finalCc.length;
    const requestedBccCount = finalBcc.length;
    const totalRequested =
      requestedToCount + requestedCcCount + requestedBccCount;
    const totalAdded = toAddrs.length + ccAddrs.length + bccAddrs.length;

    if (totalRequested > 0 && totalAdded < totalRequested) {
      if (totalAdded === 0) {
        warning =
          "No recipients could be added. Please add recipients manually in Mail.app before sending.";
        message =
          "OutgoingMessage replaced successfully, but recipients could not be added";
      } else {
        warning =
          "Some recipients could not be added (" +
          totalAdded +
          " of " +
          totalRequested +
          " added). Please verify recipients in Mail.app.";
        message =
          "OutgoingMessage replaced successfully, but some recipients could not be added";
      }
    }

    const result = {
      outgoing_id: newOutgoingId,
      old_outgoing_id: outgoingId,
      subject: newSubjectResult,
      sender: newSenderResult,
      to_recipients: toAddrs,
      cc_recipients: ccAddrs,
      bcc_recipients: bccAddrs,
      message: message,
    };

    if (warning) {
      result.warning = warning;
    }

    return JSON.stringify({
      success: true,
      data: result,
      logs: logs.join("\n"),
    });
  } catch (e) {
    return JSON.stringify({
      success: false,
      error: "Failed to replace outgoing message: " + e.toString(),
    });
  }
}
