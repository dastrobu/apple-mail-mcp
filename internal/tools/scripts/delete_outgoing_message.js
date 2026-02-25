function run(argv) {
  const Mail = Application("Mail");
  Mail.includeStandardAdditions = true;

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

  const outgoingId = args.outgoing_id;

  if (outgoingId === undefined || outgoingId === null) {
    return JSON.stringify({
      success: false,
      error: "outgoing_id is required.",
      errorCode: "MISSING_PARAMETERS",
      logs: logs.join("\n"),
    });
  }

  // 4. Execution wrapped in try/catch
  try {
    // Find the outgoing message using whose clause
    // Mail.outgoingMessages contains open composition windows
    const messages = Mail.outgoingMessages.whose({ id: outgoingId })();

    if (messages.length === 0) {
      return JSON.stringify({
        success: false,
        error: `Outgoing message with ID ${outgoingId} not found.`,
        logs: logs.join("\n"),
      });
    }

    const msg = messages[0];

    // Capture some info before deletion for confirmation
    const subject = msg.subject();

    // Delete the message (closes the window/deletes the object)
    Mail.delete(msg);
    log(`Deleted outgoing message with ID ${outgoingId}.`);

    return JSON.stringify({
      success: true,
      data: {
        deleted_id: outgoingId,
        subject: subject,
        message: "Outgoing message deleted successfully.",
      },
      logs: logs.join("\n"),
    });

  } catch (e) {
    log(`Error deleting outgoing message: ${e.toString()}`);
    return JSON.stringify({
      success: false,
      error: `Failed to delete outgoing message: ${e.toString()}`,
      logs: logs.join("\n"),
    });
  }
}
