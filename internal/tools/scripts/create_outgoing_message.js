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
  const rawSubject = argv[0] || "";
  const content = argv[1] || "";
  const toRecipientsJson = argv[2] || "";
  const ccRecipientsJson = argv[3] || "";
  const bccRecipientsJson = argv[4] || "";
  const sender = argv[5] || "";
  const openingWindow = argv[6] === "true";

  // Trim and validate subject
  const subject = rawSubject.trim();
  if (!subject) {
    return JSON.stringify({
      success: false,
      error: "Subject is required and cannot be empty or whitespace-only",
    });
  }

  if (!content) {
    return JSON.stringify({
      success: false,
      error: "Content is required",
    });
  }

  try {
    // Parse recipient arrays from JSON
    let toRecipients = [];
    try {
      toRecipients = JSON.parse(toRecipientsJson);
    } catch (e) {
      return JSON.stringify({
        success: false,
        error: "Invalid To recipients JSON: " + e.toString(),
      });
    }

    let ccRecipients = [];
    if (ccRecipientsJson) {
      try {
        ccRecipients = JSON.parse(ccRecipientsJson);
      } catch (e) {
        return JSON.stringify({
          success: false,
          error: "Invalid CC recipients JSON: " + e.toString(),
        });
      }
    }

    let bccRecipients = [];
    if (bccRecipientsJson) {
      try {
        bccRecipients = JSON.parse(bccRecipientsJson);
      } catch (e) {
        return JSON.stringify({
          success: false,
          error: "Invalid BCC recipients JSON: " + e.toString(),
        });
      }
    }

    // Create the outgoing message
    const msgProps = {
      subject: subject,
      visible: openingWindow,
    };

    if (sender) {
      msgProps.sender = sender;
    }

    const msg = Mail.make({
      new: "outgoingMessage",
      withProperties: msgProps,
    });

    // Add To recipients
    for (let i = 0; i < toRecipients.length; i++) {
      if (toRecipients[i]) {
        try {
          const recip = Mail.ToRecipient({ address: toRecipients[i] });
          msg.toRecipients.push(recip);
        } catch (e) {
          log("Error adding To recipient: " + e.toString());
        }
      }
    }

    // Add CC recipients
    for (let i = 0; i < ccRecipients.length; i++) {
      if (ccRecipients[i]) {
        try {
          const recip = Mail.CcRecipient({ address: ccRecipients[i] });
          msg.ccRecipients.push(recip);
        } catch (e) {
          log("Error adding CC recipient: " + e.toString());
        }
      }
    }

    // Add BCC recipients
    for (let i = 0; i < bccRecipients.length; i++) {
      if (bccRecipients[i]) {
        try {
          const recip = Mail.BccRecipient({ address: bccRecipients[i] });
          msg.bccRecipients.push(recip);
        } catch (e) {
          log("Error adding BCC recipient: " + e.toString());
        }
      }
    }

    // Set content
    Mail.make({
      new: "paragraph",
      withData: content,
      at: msg.content,
    });

    // Save the message
    msg.save();

    // Get the OutgoingMessage ID directly (no delay needed)
    const outgoingId = msg.id();
    const outgoingSubject = msg.subject();
    const outgoingSender = msg.sender();

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
    let message = "Outgoing message created successfully";
    let warning = null;
    const requestedToCount = toRecipients.length;
    const requestedCcCount = ccRecipients.length;
    const requestedBccCount = bccRecipients.length;
    const totalRequested =
      requestedToCount + requestedCcCount + requestedBccCount;
    const totalAdded = toAddrs.length + ccAddrs.length + bccAddrs.length;

    if (totalRequested > 0 && totalAdded < totalRequested) {
      if (totalAdded === 0) {
        warning =
          "No recipients could be added. Please add recipients manually in Mail.app before sending.";
        message =
          "Outgoing message created successfully, but recipients could not be added";
      } else {
        warning =
          "Some recipients could not be added (" +
          totalAdded +
          " of " +
          totalRequested +
          " added). Please verify recipients in Mail.app.";
        message =
          "Outgoing message created successfully, but some recipients could not be added";
      }
    }

    const result = {
      outgoing_id: outgoingId,
      subject: outgoingSubject,
      sender: outgoingSender,
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
      error: "Failed to create outgoing message: " + e.toString(),
    });
  }
}
