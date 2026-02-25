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

  const accountName = args.account || "";
  const subject = args.subject || "";
  const toList = args.to_recipients || [];
  const ccList = args.cc_recipients || [];
  const bccList = args.bcc_recipients || [];

  log(`Received arguments: account='${accountName}', subject='${subject}'`);

  if (!accountName || !subject) {
    return JSON.stringify({
      success: false,
      error: "Account and Subject are required parameters.",
      errorCode: "MISSING_PARAMETERS",
      logs: logs.join("\n"),
    });
  }

  // 4. Execution wrapped in try/catch
  try {
    const accounts = Mail.accounts.whose({ name: accountName })();
    if (accounts.length === 0) {
      return JSON.stringify({
        success: false,
        error: `Account '${accountName}' not found.`,
        errorCode: "ACCOUNT_NOT_FOUND",
        logs: logs.join("\n"),
      });
    }
    const account = accounts[0];
    log(`Found account: ${account.name()}`);

    const msg = Mail.OutgoingMessage({
      subject: subject,
      visible: true,
    });
    Mail.outgoingMessages.push(msg);

    // Set the sender from the specified account before adding recipients
    msg.sender = account.emailAddresses()[0];

    // Add recipients
    if (Array.isArray(toList)) {
      toList.forEach((addr) =>
        msg.toRecipients.push(Mail.Recipient({ address: addr })),
      );
    }

    if (Array.isArray(ccList)) {
      ccList.forEach((addr) =>
        msg.ccRecipients.push(Mail.Recipient({ address: addr })),
      );
    }

    if (Array.isArray(bccList)) {
      bccList.forEach((addr) =>
        msg.bccRecipients.push(Mail.Recipient({ address: addr })),
      );
    }

    // NOTE: We are NOT saving the message here. It exists as an open window (OutgoingMessage).
    // This allows the user to decide whether to save it later (e.g. via replace_outgoing_message or manual action).

    Mail.activate();

    const mailProcess = SystemEvents.processes.byName("Mail");
    const pid = mailProcess.unixId();

    // 5. CRITICAL: Return 'outgoing_id' for the message.
    return JSON.stringify({
      success: true,
      data: {
        outgoing_id: msg.id(),
        subject: msg.subject(),
        pid: pid, // PID is still useful for the immediate paste operation in Go.
        message:
          "Outgoing message created successfully. Window opened for content pasting.",
      },
      logs: logs.join("\n"),
    });
  } catch (e) {
    let errorCode = "UNKNOWN_ERROR";
    if (e.toString().includes("Automation is not allowed")) {
      errorCode = "MAIL_APP_NO_PERMISSIONS";
    }
    log(`Error during draft creation: ${e.toString()}`);
    return JSON.stringify({
      success: false,
      error: `Failed to create draft: ${e.toString()}`,
      errorCode: errorCode,
      logs: logs.join("\n"),
    });
  }
}
