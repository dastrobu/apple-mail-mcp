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

  // Parse arguments: accountName, mailboxPathStr (JSON), messageId, replyContent, contentFormat, contentJson, openingWindow, replyToAll
  const accountName = argv[0] || "";
  const mailboxPathStr = argv[1] || "";
  const messageId = argv[2] ? parseInt(argv[2]) : 0;
  const replyContent = argv[3] || "";
  const contentFormat = argv[4] || "plain";
  const contentJson = argv[5] || "";
  const openingWindow = argv[6] === "true";
  const replyToAll = argv[7] === "true";

  if (!accountName) {
    return JSON.stringify({
      success: false,
      error: "Account name is required",
    });
  }

  if (!mailboxPathStr) {
    return JSON.stringify({
      success: false,
      error: "Mailbox path is required",
    });
  }

  // Parse mailboxPath from JSON
  let mailboxPath;
  try {
    mailboxPath = JSON.parse(mailboxPathStr);
  } catch (e) {
    return JSON.stringify({
      success: false,
      error: "Invalid mailbox path JSON: " + e.toString(),
    });
  }

  try {
    const targetAccount = Mail.accounts[accountName];
    let currentContainer = targetAccount;
    for (let i = 0; i < mailboxPath.length; i++) {
      currentContainer = currentContainer.mailboxes[mailboxPath[i]];
    }
    const targetMailbox = currentContainer;

    const matches = targetMailbox.messages.whose({ id: messageId })();
    if (matches.length === 0) {
      return JSON.stringify({ success: false, error: "Message not found" });
    }
    const targetMessage = matches[0];

    // BUG FIX: Instead of targetMessage.reply(), we create a NEW outgoing message.
    // Mail.app's reply() method wraps ALL scripted content in <blockquote type="cite">,
    // which makes the reply look like quoted text to the recipient.
    // Creating a new message avoids this wrapper.

    let subject = targetMessage.subject();
    if (!subject.toLowerCase().startsWith("re:")) {
      subject = "Re: " + subject;
    }

    const replyMessage = Mail.OutgoingMessage({
      subject: subject,
      visible: openingWindow,
    });
    Mail.outgoingMessages.push(replyMessage);

    // Setup recipients (sender of original message becomes primary recipient)
    Mail.make({
      new: "toRecipient",
      withProperties: { address: targetMessage.sender() },
      at: replyMessage.toRecipients,
    });

    if (replyToAll) {
      // Add other recipients if replyToAll is requested
      const recipients = targetMessage.toRecipients();
      const myEmail = Mail.primaryEmail();
      for (const r of recipients) {
        const addr = r.address();
        if (addr !== myEmail && addr !== targetMessage.sender()) {
          Mail.make({
            new: "ccRecipient",
            withProperties: { address: addr },
            at: replyMessage.ccRecipients,
          });
        }
      }
    }

    // Set content
    if (contentFormat === "markdown" && contentJson) {
      try {
        const styledBlocks = JSON.parse(contentJson);
        renderStyledBlocks(Mail, replyMessage, styledBlocks, log);
      } catch (e) {
        return JSON.stringify({
          success: false,
          error: "Failed to render rich text: " + e.toString(),
        });
      }
    } else {
      Mail.make({
        new: "paragraph",
        withData: replyContent,
        at: replyMessage.content,
      });
    }

    replyMessage.save();

    return JSON.stringify({
      success: true,
      data: {
        draft_id: replyMessage.id(),
        subject: replyMessage.subject(),
        message: "Reply created as new message to avoid blockquote wrapping",
      },
      logs: logs.join("\n"),
    });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.toString() });
  }
}

function renderStyledBlocks(Mail, msg, styledBlocks, log) {
  for (let i = 0; i < styledBlocks.length; i++) {
    const block = styledBlocks[i];
    const props = {};
    if (block.font) props.font = block.font;
    if (block.size) props.size = block.size;
    if (block.color) props.color = block.color;

    Mail.make({
      new: "paragraph",
      withData: block.text,
      withProperties: props,
      at: msg.content,
    });

    if (block.inline_styles && block.inline_styles.length > 0) {
      const paraIndex = msg.content.paragraphs.length - 1;
      for (let j = 0; j < block.inline_styles.length; j++) {
        const style = block.inline_styles[j];
        try {
          for (let charIdx = style.start; charIdx < style.end; charIdx++) {
            const char = msg.content.paragraphs[paraIndex].characters[charIdx];
            if (style.font) char.font = style.font;
            if (style.size) char.size = style.size;
            if (style.color) char.color = style.color;
          }
        } catch (e) {
          log("Error applying inline style: " + e.toString());
        }
      }
    }
  }
}
