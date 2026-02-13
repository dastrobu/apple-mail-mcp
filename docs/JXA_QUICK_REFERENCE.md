# JXA Quick Reference Card

Essential patterns for scripting Apple Mail with JavaScript for Automation.

## Object Specifier Dereferencing

```javascript
// ❌ WRONG - Returns Object Specifier (opaque pointer)
const name = mailbox.name;
const count = messages.length;  // Exception: .length works

// ✅ CORRECT - Returns JavaScript value
const name = mailbox.name();
const messages = mailbox.messages();
```

**Rule:** Always use `()` to dereference properties (except `.length`).

## Name Lookup

```javascript
// ✅ Direct name lookup - Fast O(1)
const inbox = account.mailboxes["Inbox"];
const github = inbox.mailboxes["GitHub"];

// Also works without brackets (no spaces/special chars)
const inbox = account.mailboxes.Inbox;

// ❌ Don't loop for name-based lookup - Slow O(n)
for (let i = 0; i < mailboxes.length; i++) {
  if (mailboxes[i].name() === "Inbox") { /* ... */ }
}
```

## Filtering with whose()

```javascript
// ✅ FAST - Constant time O(1), ~0.3ms
const matches = mailbox.messages.whose({
  id: messageId
})();

// With logical operators
const filtered = app.reminders.whose({
  _and: [
    {completed: true},
    {completionDate: {'>': yesterday}}
  ]
})();

// ❌ SLOW - Linear time O(n), ~1000ms for 500 items
const messages = mailbox.messages();
for (let i = 0; i < messages.length; i++) {
  if (messages[i].id() === messageId) { /* ... */ }
}
```

**Performance:** `whose()` is 150-3000x faster than loops!

## Nested Mailboxes

```javascript
// Build mailbox path
function getMailboxPath(mailbox, accountName) {
  const path = [];
  let current = mailbox;
  
  while (current) {
    const name = current.name();
    if (name === accountName) break;
    path.unshift(name);
    try {
      current = current.container();
    } catch (e) {
      break;
    }
  }
  return path;
}

// Navigate to nested mailbox
const mailboxPath = JSON.parse('["Inbox", "GitHub"]');
let targetMailbox = account.mailboxes[mailboxPath[0]];
for (let i = 1; i < mailboxPath.length; i++) {
  targetMailbox = targetMailbox.mailboxes[mailboxPath[i]];
}
```

## Converting Elements to Arrays

```javascript
// ❌ WRONG - Elements are not arrays
const acc = app.accounts;
acc.forEach(a => console.log(a.name()));  // Error!

// ✅ CORRECT - Dereference first
const acc = app.accounts();
acc.forEach(a => console.log(a.name()));

// Exception: .length works on both
const count1 = app.accounts.length;     // Works
const count2 = app.accounts().length;   // Also works
```

## Script Structure

```javascript
function run(argv) {
  const Mail = Application("Mail");
  Mail.includeStandardAdditions = true;
  
  // Parse arguments
  const param1 = argv[0] || "";
  const param2 = argv[1] || "";
  const param3 = argv[2] ? parseInt(argv[2]) : 0;
  
  // Validate required arguments
  if (!param1) {
    return JSON.stringify({
      success: false,
      error: "Parameter 1 is required"
    });
  }
  
  try {
    // Perform operations
    const result = doSomething(param1, param2);
    
    // Return success with data wrapped in 'data' field
    return JSON.stringify({
      success: true,
      data: result
    });
  } catch (e) {
    return JSON.stringify({
      success: false,
      error: e.toString()
    });
  }
}
```

## Error Handling

```javascript
// ✅ GOOD - Structured JSON responses
if (!required) {
  return JSON.stringify({
    success: false,
    error: "Parameter is required"
  });
}

try {
  const result = operation();
  return JSON.stringify({
    success: true,
    data: result
  });
} catch (e) {
  return JSON.stringify({
    success: false,
    error: e.toString()
  });
}

// ❌ BAD - Empty catch blocks
try {
  const count = messages.length;
} catch (e) {}  // Don't ignore errors
```

## Modern JavaScript

```javascript
// ✅ Use const/let
const Mail = Application("Mail");
let current = mailbox;

// ✅ Template literals
const error = `Message ${id} not found in ${mailboxPath.join(" > ")}`;

// ✅ Arrow functions
messages.forEach(msg => console.log(msg.subject()));

// ✅ for...of loops
for (const msg of messages) {
  console.log(msg.subject());
}

// ✅ Destructuring
const {id, subject, sender} = messageData;
```

## Date Handling

```javascript
// ✅ ISO format (consistent)
const dateStr = message.dateReceived().toISOString();

// ❌ Locale format (inconsistent)
const dateStr = message.dateReceived().toLocaleString();
```

## Enumeration Properties

```javascript
// ❌ FAILS - "Types cannot be converted"
app.accounts.whose({
  authentication: "password"
})();

// ✅ WORKS - Use _match with ObjectSpecifier()
app.accounts.whose({
  _match: [ObjectSpecifier().authentication, "password"]
})();
```

## Common Patterns

### Get Selected Messages
```javascript
const viewers = Mail.messageViewers();
const viewer = viewers[0];
const selectedMessages = viewer.selectedMessages();
```

### Access Account and Mailbox
```javascript
// Direct name lookup
const account = Mail.accounts["Exchange"];
const mailbox = account.mailboxes["Inbox"];
```

### Find Message by ID
```javascript
const matches = mailbox.messages.whose({ id: messageId })();
const message = matches[0];
```

### Create Message
```javascript
const msg = Mail.OutgoingMessage({
  subject: "Test",
  sender: "me@example.com"
});
Mail.outgoingMessages.push(msg);
```

### Add Content
```javascript
Mail.make({
  new: "paragraph",
  withData: "Your text here\n",
  at: message.content
});
```

## Performance Numbers

| Operation | whose() | JavaScript Filter | Loop |
|-----------|---------|-------------------|------|
| 100 items | 0.3ms | 10ms | 200ms |
| 500 items | 0.3ms | 50ms | 1000ms |
| 1000 items | 0.3ms | 100ms | 2000ms |

**Key Insight:** `whose()` is constant-time O(1) regardless of collection size!

## Checklist for New Scripts

- [ ] Use `const`/`let` instead of `var`
- [ ] Dereference Object Specifiers with `()`
- [ ] Use `whose()` for filtering
- [ ] Use name lookup instead of loops
- [ ] Validate all arguments explicitly
- [ ] Return structured JSON with success/error
- [ ] Wrap output data in `data` field
- [ ] Use template literals for strings
- [ ] Use ISO format for dates
- [ ] Handle nested mailbox paths as arrays

## Resources

- [JXA Cookbook](https://github.com/JXA-Cookbook/JXA-Cookbook)
- [Working with Objects](../bru6.de/working-with-objects.md)
- [Mail Editing Guide](MAIL_EDITING.md)
- [Nested Mailbox Support](../internal/tools/scripts/NESTED_MAILBOX_SUPPORT.md)