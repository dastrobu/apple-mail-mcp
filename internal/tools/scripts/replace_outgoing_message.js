function run(argv) {
  const Mail = Application("Mail");
  Mail.includeStandardAdditions = true;
  const SENTINEL = "__KEEP__";

  // Check if Mail.app is running
  if (!Mail.running()) {
    return JSON.stringify({
      success: false,
      error: "Mail.app is not running.",
      errorCode: "MAIL_APP_NOT_RUNNING",
    });
  }

  // Collect logs instead of using console.log
  const logs = [];
  function log(message) {
    logs.push(message);
  }

  // Parse arguments
  // argv[0]: outgoingId
  // argv[1]: newSubject
  // argv[2]: toRecipientsJson
  // argv[3]: ccRecipientsJson
  // argv[4]: bccRecipientsJson
  // argv[5]: newSender

  const outgoingId = argv[0] ? parseInt(argv[0]) : 0;
  const newSubject = argv[1] || "";
  const toRecipientsJson = argv[2] || "";
  const ccRecipientsJson = argv[3] || "";
  const bccRecipientsJson = argv[4] || "";
  const newSender = argv[5] || "";

  if (!outgoingId || outgoingId < 1) {
    return JSON.stringify({
      success: false,
      error: "Outgoing message ID is required",
    });
  }

  try {
    // 1. Find the old draft to capture current state and then delete
    const allOutgoing = Mail.outgoingMessages();
    let oldMessage = null;
    for (let i = 0; i < allOutgoing.length; i++) {
      if (allOutgoing[i].id() === outgoingId) {
        oldMessage = allOutgoing[i];
        break;
      }
    }

    if (!oldMessage) {
      return JSON.stringify({
        success: false,
        error: "Existing draft with ID " + outgoingId + " not found.",
      });
    }

    // Capture existing properties to support __KEEP__ sentinel (null in Go)
    const oldSubject = oldMessage.subject();
    const oldSender = oldMessage.sender();

    const getAddresses = (collection) => {
      const addresses = [];
      try {
        const items = collection();
        for (let i = 0; i < items.length; i++) {
          addresses.push(items[i].address());
        }
      } catch (e) {
        log("Error reading recipients: " + e.toString());
      }
      return addresses;
    };

    const oldTo = getAddresses(oldMessage.toRecipients);
    const oldCc = getAddresses(oldMessage.ccRecipients);
    const oldBcc = getAddresses(oldMessage.bccRecipients);

    // 2. Create a fresh OutgoingMessage (visible for accessibility)
    log("Creating fresh outgoing message...");
    const newMsg = Mail.make({
      new: "outgoingMessage",
      withProperties: {
        visible: true,
      },
    });

    // 3. Apply properties to new message
    // Subject
    if (newSubject === SENTINEL) {
      newMsg.subject = oldSubject;
    } else {
      newMsg.subject = newSubject;
    }

    // Sender
    if (newSender === SENTINEL) {
      newMsg.sender = oldSender;
    } else if (newSender) {
      newMsg.sender = newSender;
    }

    // Recipients
    function updateRecipients(
      targetCollection,
      constructorName,
      json,
      fallback,
    ) {
      let addrs = [];
      if (json === SENTINEL) {
        addrs = fallback;
      } else if (json && json !== "") {
        try {
          addrs = JSON.parse(json) || [];
        } catch (e) {
          log("Error parsing recipients JSON: " + e.toString());
        }
      }

      addrs.forEach((addr) => {
        targetCollection.push(Mail[constructorName]({ address: addr }));
      });
    }

    updateRecipients(
      newMsg.toRecipients,
      "ToRecipient",
      toRecipientsJson,
      oldTo,
    );
    updateRecipients(
      newMsg.ccRecipients,
      "CcRecipient",
      ccRecipientsJson,
      oldCc,
    );
    updateRecipients(
      newMsg.bccRecipients,
      "BccRecipient",
      bccRecipientsJson,
      oldBcc,
    );

    newMsg.save();

    // 4. Delete old message
    try {
      Mail.delete(oldMessage);
      log("Deleted old draft ID: " + outgoingId);
    } catch (e) {
      log("Warning: Could not delete old draft: " + e.toString());
    }

    // Activate Mail to bring the new window to front for Go's paste operation
    Mail.activate();

    return JSON.stringify({
      success: true,
      data: {
        outgoing_id: newMsg.id(),
        old_outgoing_id: outgoingId,
        subject: newMsg.subject(),
        message: "Draft replaced with fresh instance. Window ready for paste.",
      },
      logs: logs.join("\n"),
    });
  } catch (e) {
    return JSON.stringify({
      success: false,
      error: "Failed to replace draft: " + e.toString(),
      logs: logs.join("\n"),
    });
  }
}
