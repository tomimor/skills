# Worked example

A short how-to page, before and after, with the reasoning for each change. The point isn't the specific page—it's the order of operations: structure first, then voice, then mechanics.

## Before

````markdown
# Configuring Your Webhook Endpoint

In this section we will discuss how webhooks can be configured. Webhooks are a
powerful feature that allow you to receive events.

Note that this feature is currently in beta and new event types will be added
soon.

1. Click on the **Settings** tab to open settings.
2. Simply enter your endpoint URL (e.g. https://example.com/hooks) in the field.
3. Hit **Save**.
4. A verification request is sent by our servers to your endpoint. Your endpoint
   must return a 200 within 5 seconds, otherwise the webhook will be disabled.

For more information about retries, click [here](https://example.com/retries).
````

## After

````markdown
# Configure a webhook endpoint

A *webhook* is an HTTP callback that delivers events to a URL you control. This
page shows you how to register an endpoint and verify it.

**Note:** Your endpoint must return a `200` response within 5 seconds. If it
doesn't, the service disables the webhook.

1. Open the **Settings** tab.
2. In the **Endpoint URL** field, enter your URL, for example
   `https://example.com/hooks`.
3. Click **Save**.

   The service sends a verification request to your endpoint.

For more information, see [Webhook retry behavior](https://example.com/retries).
````

## What changed, and why

| Change | Rule |
|--------|------|
| "Configuring Your Webhook Endpoint" → "Configure a webhook endpoint" | Sentence case, task-based heading |
| Deleted "In this section we will discuss…" | No pre-announcements; no first person; no future tense |
| Deleted "powerful feature" | Don't editorialize about the product |
| "allow you to receive" → defined the term instead | "lets you" over "allows you to"—and a definition serves the reader better than a capability claim |
| Deleted "currently in beta and new event types will be added soon" | Timeless wording; no pre-announcing unreleased work |
| "Click on the **Settings** tab to open settings" → "Open the **Settings** tab" | No "click on"; the trailing purpose clause was circular |
| "Simply enter your endpoint URL" → "In the **Endpoint URL** field, enter your URL" | Cut "simply"; location before action; named the actual field |
| "e.g." → "for example" | No Latin abbreviations |
| "Hit **Save**" → "Click **Save**" | "Hit" is violent; "click" is the verb for a button |
| "A verification request is sent by our servers" → "The service sends a verification request" | Active voice, named actor |
| Moved the 5-second requirement out of step 4 into a `Note:` before step 1 | A constraint the reader must know before starting isn't a step |
| "otherwise the webhook will be disabled" → "the service disables the webhook" | Present tense, active voice, named actor |
| "click [here]" → "see [Webhook retry behavior]" | Descriptive link text; "see," not "click" |
| Wrapped `200` and the URL in code font | Code font for values and paths |

Note what did **not** change: the 5-second timeout, the `200` status code, and the example URL. Style edits never touch the facts—see the "Rewriting without breaking the docs" section of [SKILL.md](SKILL.md).

## Review report format

When asked to review rather than rewrite, the same page produces this:

```
### Must fix
1. `webhooks.md:5`—"this feature is currently in beta and new event types
   will be added soon"
   → Delete. Timeless wording, and it pre-announces unreleased work.

### Should fix
1. `webhooks.md:1`—"Configuring Your Webhook Endpoint"
   → "Configure a webhook endpoint" (sentence case, task-based heading).
   Heads up: this changes the page anchor.
2. `webhooks.md:12`—"A verification request is sent by our servers"
   → "The service sends a verification request." (passive voice)
3. `webhooks.md:15`—"click [here](...)"
   → "see [Webhook retry behavior](...)" (descriptive link text)

### Nice to have
1. `webhooks.md:9`—"Click on the **Settings** tab" → "Open the **Settings**
   tab." Two more instances of "click on" at lines 21 and 34.

### Content question
- `webhooks.md:12`—the page says verification must return 200 "within 5
  seconds," but the retries page says 10. Which is correct? Not changing it.
```
