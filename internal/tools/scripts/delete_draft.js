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

  const draftId = args.draft_id;

  if (draftId === undefined || draftId === null) {
    return JSON.stringify({
      success: false,
      error: "draft_id is required.",
      errorCode: "MISSING_PARAMETERS",
      logs: logs.join("\n"),
    });
  }

  // 4. Execution wrapped in try/catch
  try {
    let draftFound = null;
    let accountName = "";

    // 1. Search in every account's "Drafts" mailbox
    const accounts = Mail.accounts();
    for (let i = 0; i < accounts.length; i++) {
      const account = accounts[i];
      try {
        // Access the drafts mailbox for the account
        // account.draftsMailbox() returns the mailbox object
        const draftsBox = account.draftsMailbox();

        // Use whose() for fast filtering
        const messages = draftsBox.messages.whose({ id: draftId })();

        if (messages.length > 0) {
          draftFound = messages[0];
          accountName = account.name();
          log(`Found draft in account: ${accountName}`);
          break;
        }
      } catch (e) {
        // Account might not have a drafts mailbox configured
      }
    }

    // 2. If not found, search in local "Drafts" mailboxes (On My Mac)
    if (!draftFound) {
      try {
        const localDrafts = Mail.mailboxes.whose({
          _or: [{ name: "Drafts" }, { name: "Entwürfe" }],
        })();

        for (let i = 0; i < localDrafts.length; i++) {
          const messages = localDrafts[i].messages.whose({ id: draftId })();
          if (messages.length > 0) {
            draftFound = messages[0];
            accountName = "Local / On My Mac";
            log(`Found draft in local mailbox: ${localDrafts[i].name()}`);
            break;
          }
        }
      } catch (e) {
        log(`Checking local mailboxes failed: ${e.message}`);
      }
    }

    if (!draftFound) {
      return JSON.stringify({
        success: false,
        error: `Draft with ID ${draftId} not found in any account.`,
        logs: logs.join("\n"),
      });
    }

    const subject = draftFound.subject();

    // Delete the draft
    Mail.delete(draftFound);
    log(`Deleted draft with ID ${draftId}.`);

    return JSON.stringify({
      success: true,
      data: {
        draft_id: draftId,
        subject: subject,
        account: accountName,
        message: "Draft deleted successfully.",
      },
      logs: logs.join("\n"),
    });
  } catch (e) {
    log(`Error deleting draft: ${e.toString()}`);
    return JSON.stringify({
      success: false,
      error: `Failed to delete draft: ${e.toString()}`,
      logs: logs.join("\n"),
    });
  }
}
