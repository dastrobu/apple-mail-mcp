#!/usr/bin/osascript -l JavaScript

/**
 * Test script for draft lookup logic in reply_to_message
 *
 * This script tests the draft ID lookup process that happens after creating
 * a reply draft. It simulates the exact logic used in reply_to_message.js
 * to verify that draft IDs can be reliably found in the Drafts mailbox.
 *
 * Usage:
 *   1. Select a message in Mail.app
 *   2. Run: ./test-reply.js [reply_content]
 *
 * Example:
 *   ./test-reply.js "Thanks for the update!"
 *   ./test-reply.js  # Uses default reply text
 *
 * The script will:
 *   1. Create a reply draft (not visible)
 *   2. Save and wait for sync (4 seconds)
 *   3. Search Drafts mailbox by subject
 *   4. Find most recent match by dateReceived
 *   5. Report the draft ID and verification results
 */

function run(argv) {
  const Mail = Application("Mail");
  Mail.includeStandardAdditions = true;

  const replyContent = argv[0] || "This is a test reply";

  console.log("=== Draft Lookup Logic Test ===");
  console.log("Reply Content:", replyContent);
  console.log("");

  try {
    // Get the selected message
    console.log("Step 1: Getting selected message...");
    const viewers = Mail.messageViewers();
    if (!viewers || viewers.length === 0) {
      console.log("ERROR: No message viewers open");
      return JSON.stringify({
        success: false,
        error:
          "No message viewers open. Please open Mail.app and select a message.",
      });
    }

    const viewer = viewers[0];
    const selectedMessages = viewer.selectedMessages();

    if (!selectedMessages || selectedMessages.length === 0) {
      console.log("ERROR: No messages selected");
      return JSON.stringify({
        success: false,
        error: "No messages selected. Please select a message in Mail.app.",
      });
    }

    const targetMessage = selectedMessages[0];
    const messageId = targetMessage.id();
    const messageSubject = targetMessage.subject();
    console.log("  ✓ Selected message ID:", messageId);
    console.log("  ✓ Subject:", messageSubject);
    console.log("");

    // Create reply draft (not visible)
    console.log("Step 2: Creating reply draft...");
    const replyMessage = targetMessage.reply({
      openingWindow: false, // Don't show window
      replyToAll: false,
    });

    if (!replyMessage) {
      console.log("ERROR: Failed to create reply");
      return JSON.stringify({
        success: false,
        error: "Failed to create reply message",
      });
    }
    console.log("  ✓ Reply created");

    // Add content
    Mail.make({
      new: "paragraph",
      withData: replyContent,
      at: replyMessage.content,
    });
    console.log("  ✓ Content added");

    // Save the reply
    replyMessage.save();
    console.log("  ✓ Reply saved");
    console.log("");

    // Get OutgoingMessage details BEFORE sync
    const outgoingSubject = replyMessage.subject();
    const outgoingSender = replyMessage.sender();
    console.log("Step 3: OutgoingMessage details:");
    console.log("  Subject:", outgoingSubject);
    console.log("  Sender:", outgoingSender);

    // Try to get OutgoingMessage.id() (this will be different from Drafts Message.id())
    let outgoingId = null;
    try {
      outgoingId = replyMessage.id();
      console.log("  OutgoingMessage.id():", outgoingId);
    } catch (e) {
      console.log("  OutgoingMessage.id(): ERROR -", e.toString());
    }
    console.log("");

    // Wait for sync
    console.log("Step 4: Waiting for draft to sync to Drafts mailbox...");
    console.log("  (4 second delay)");
    delay(4);
    console.log("  ✓ Sync wait complete");
    console.log("");

    // Search Drafts mailbox
    console.log("Step 5: Searching Drafts mailbox...");
    const draftsMailbox = Mail.draftsMailbox();
    console.log("  ✓ Got Drafts mailbox");

    // Use whose() to search by subject
    const matchingDrafts = draftsMailbox.messages.whose({
      subject: outgoingSubject,
    })();

    console.log(
      "  Found",
      matchingDrafts.length,
      "draft(s) with matching subject",
    );

    if (matchingDrafts.length === 0) {
      console.log("ERROR: No drafts found with subject:", outgoingSubject);
      return JSON.stringify({
        success: false,
        error: "Draft not found in Drafts mailbox after sync",
        outgoingSubject: outgoingSubject,
        outgoingId: outgoingId,
      });
    }

    // Find most recent match by dateReceived
    console.log("");
    console.log("Step 6: Finding most recent draft...");
    let mostRecent = matchingDrafts[0];
    let mostRecentDate = mostRecent.dateReceived();

    console.log("  Candidate drafts:");
    for (let i = 0; i < matchingDrafts.length; i++) {
      const draft = matchingDrafts[i];
      const draftId = draft.id();
      const draftDate = draft.dateReceived();
      const isMostRecent = draftDate >= mostRecentDate;

      console.log(
        "    [" + i + "] ID:",
        draftId,
        "| Date:",
        draftDate.toISOString(),
        isMostRecent ? "← MOST RECENT" : "",
      );

      if (draftDate > mostRecentDate) {
        mostRecent = draft;
        mostRecentDate = draftDate;
      }
    }

    const finalDraftId = mostRecent.id();
    console.log("");
    console.log("  ✓ Selected draft ID:", finalDraftId);
    console.log("");

    // Verify we can find the draft by ID
    console.log("Step 7: Verifying draft lookup by ID...");
    const verifyDrafts = draftsMailbox.messages.whose({
      id: finalDraftId,
    })();

    if (verifyDrafts.length === 0) {
      console.log("  ✗ VERIFICATION FAILED - Draft not found by ID");
      return JSON.stringify({
        success: false,
        error: "Draft ID verification failed",
        draftId: finalDraftId,
      });
    }

    console.log("  ✓ Draft verified by ID lookup");
    console.log("");

    // Get final draft details
    const finalDraft = verifyDrafts[0];
    const finalSubject = finalDraft.subject();
    const finalSender = finalDraft.sender();
    const finalDate = finalDraft.dateReceived();

    // Summary
    console.log("=== RESULTS ===");
    console.log("Draft ID Lookup: SUCCESS");
    console.log("");
    console.log("OutgoingMessage.id():", outgoingId || "(unavailable)");
    console.log("Drafts Message.id():", finalDraftId);
    console.log("IDs Match:", outgoingId === finalDraftId ? "YES" : "NO");
    console.log("");
    console.log("Draft Details:");
    console.log("  Subject:", finalSubject);
    console.log("  Sender:", finalSender);
    console.log("  Date:", finalDate.toISOString());
    console.log("");
    console.log("✓ Draft lookup logic works correctly");
    console.log("✓ Draft can be found by ID in Drafts mailbox");
    console.log("✓ Ready for use with replace_draft tool");

    return JSON.stringify({
      success: true,
      data: {
        draft_id: finalDraftId,
        subject: finalSubject,
        sender: finalSender,
        date_received: finalDate.toISOString(),
        outgoing_id: outgoingId,
        ids_match: outgoingId === finalDraftId,
        candidates_found: matchingDrafts.length,
        message: "Draft lookup successful",
      },
    });
  } catch (e) {
    console.log("");
    console.log("=== ERROR ===");
    console.log(e.toString());
    console.log(e.stack || "");
    return JSON.stringify({
      success: false,
      error: e.toString(),
    });
  }
}
