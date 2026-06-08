---
name: governance-message
description: >-
  Generate a Slack-ready governance proposal message from a single proposal URL
  (forum post, Tally vote, Snapshot, etc.). Fetches the page, extracts proposer,
  summary, context, and risk, then drafts the message using the fixed governance
  template. Use when the user mentions governance message, gov proposal, gov
  message, gobernanza, Slack message for a proposal, ZKsync proposal summary,
  Tally vote summary, or pastes a proposal link and asks for a write-up.
---

# Governance Message

Turn a governance proposal URL into a concise, Slack-ready summary using the
fixed template below.

## Critical rules

1. **Input is a single URL.** The skill argument is the proposal link. If the
   user did not provide one, ask for it before doing anything else.
2. **Fetch before drafting.** Always pull the page via `WebFetch` first. Never
   draft from prior knowledge of the proposal -- proposals get amended.
3. **Clarification gate.** If voting stance, risk level, or rationale are not
   derivable from the page, STOP and ask the user via `AskUserQuestion`. Never
   guess a stance.
4. **Confirmation gate.** Show the full draft to the user and wait for explicit
   approval before posting, copying, or sending anywhere.
5. **Template is fixed.** Do not invent sections. Do not reorder. Do not drop
   bullets. The structure below is the contract.
6. **Concision.** Each section is 1-2 sentences or 1-3 bullets. Aim for a
   message a reader can scan in under 30 seconds.
7. **Always English.** The drafted message is always written in English,
   regardless of the language the user is speaking. If the source proposal is
   in another language, translate it. Conversation around the draft can be in
   any language, but the deliverable is English.
8. **Slack mrkdwn only.** The output uses Slack's `mrkdwn` flavor, not
   GitHub/CommonMark. That means `*bold*` (single asterisks), `_italic_`,
   `<url|label>` for links, no `#` headers, no `**bold**`, no `[label](url)`,
   no horizontal rules. See [Slack mrkdwn cheatsheet](#slack-mrkdwn-cheatsheet).
9. **Plain message, not a document.** The deliverable is a single chat message
   ready to paste into Slack. Never write it to a `.md` file. Never wrap it
   in a fenced code block. Never add a title, preamble, or trailing
   explanation. Emit the message as the bare chat reply with the Slack mrkdwn
   characters (`*`, `<url|label>`, `•`, `:emoji:`) as literal text so the
   user copies it straight from the chat into Slack.

## Workflow

### Step 1 -- Receive the URL

The user invokes the skill with a link. Examples:

- `https://forum.zknation.io/t/...`
- `https://www.tally.xyz/gov/zksync/proposal/...`
- `https://snapshot.org/#/.../proposal/...`

If no URL was provided, ask:

```
Question: "Paste the proposal URL you want summarized."
```

### Step 2 -- Fetch the page

Use `WebFetch` with a prompt that extracts only what the template needs:

```
WebFetch(url=<URL>, prompt="Extract the following from this governance
proposal page:
- Title
- Proposer (name + role/affiliation if shown)
- Date posted / voting window
- One-paragraph summary of what is being asked
- Background / context
- Amounts, timelines, or parameters being requested
- Stated risks and mitigations
- Any linked companion proposal (forum <-> Tally/Snapshot)
Return as structured bullet points.")
```

If the page is behind auth or rate-limited, tell the user and ask them to
paste the proposal text.

### Step 3 -- Identify missing inputs

The template requires three things the page rarely states for you:

| Field | Where to get it |
|-------|------------------|
| **Voting Stance** | Approve or Reject -- ask the user |
| **Risk Level** | Low / Medium / High -- propose one based on the diff, then confirm |
| **Companion link** | If you only have a forum link, ask for the Tally/Snapshot link (and vice versa) |

Use `AskUserQuestion`:

```
Question: "What's your voting stance on this proposal?"
Options: Approve | Reject | Abstain | Need more discussion

Question: "What risk level should I assign?"
Options: Low Risk | Medium Risk | High Risk
```

### Step 4 -- Draft the message

Fill the template verbatim, in Slack mrkdwn. Keep the title bracket format
exactly as shown. The fenced block below is documentation; the actual chat
output in Step 5 is plain text with no backticks.

````
[Gov Proposal: <Short Title> -> <Risk Level> -> <Voting Stance>]

*Summary:* <1-2 sentences on the proposal's objective and main ask.>

• *Voting Stance:* <Approve :white_check_mark: | Reject :x:>
• *Proposer:* <Name + relevant affiliation>
• *Link to Proposal:* <<forum-url>|Forum> - <<voting-url>|Tally>

*Context:*
• <1-2 bullets on the background or issue being addressed.>

*Analysis:*
<1 sentence general overview of why this matters.>
• PRO: <Strongest argument in favor.>
• CON: <Strongest argument against.>

*Voting Stance Explanation:*
• <Bullet justifying the stance: operational need, risk, benefit.>
• <Optional second bullet if a second reason is genuinely distinct.>

*Message for voting reasons:*
<1-2 sentence rationale suitable for the on-chain vote reason field.>
````

### Step 5 -- Present for copy-paste

Emit the message as the bare chat reply -- plain text with Slack mrkdwn
characters (`*Bold:*`, `<url|label>`, `•`, `:emoji:`) written literally.

- No fenced code block, no triple backticks, no indentation that triggers a
  code block.
- No "Here is the draft for your review:" prose.
- No headings, no list of what changed, no recap of the proposal.
- No trailing summary after the message.

After the message, on a new line, ask the confirm question. That single
question is the only thing allowed alongside the draft.

```
Question: "Ready as-is, or want edits?"
Options: Looks good | Edit a section | Regenerate | Cancel
```

### Step 6 -- Iterate or hand off

On "Looks good", reply in one line ("Done.") and stop -- the user copies the
message from the chat themselves. Do not save the message to a file unless
the user explicitly asks. Do not auto-send to Slack unless the user
explicitly asks and a Slack MCP tool is connected.

On "Edit a section", ask which section and what to change, then re-emit the
full message as plain chat text (still no code block).

## Template field guidelines

- **Title:** Short, descriptive. No proposal number unless the protocol uses
  numbers as primary IDs (e.g. ZIP-XX). Keep under 8 words.
- **Risk Level:** Low = routine funding, parameter tweaks, well-precedented
  ops. Medium = new program, sizable funding, novel mechanism. High =
  protocol-level changes, large token movements, governance structure changes,
  irreversible actions.
- **Voting Stance emoji:** Approve uses `:white_check_mark:`, Reject uses
  `:x:`, Abstain uses `:black_square_button:`. Slack renders these inline.
- **Link to Proposal:** Always include both forum and on-chain links when both
  exist. Forum-only or vote-only is fine if only one exists; do not invent
  the other.
- **Analysis:** Exactly one general-overview sentence, exactly one PRO bullet,
  exactly one CON bullet. If you cannot identify a real CON, the proposal is
  probably under-analyzed -- push back instead of inventing one.
- **Message for voting reasons:** Reads well as a standalone on-chain comment
  -- no internal jargon, no "we" without antecedent.

## Anti-patterns

- Do NOT draft without fetching the page.
- Do NOT guess the voting stance from the proposer's tone.
- Do NOT fabricate a CON to look balanced -- name a real one or note that the
  PRO clearly dominates.
- Do NOT add sections the template doesn't have (Timeline, Next Steps,
  Appendix, etc.). Out-of-template content belongs in a reply, not the lead
  message.
- Do NOT exceed 3 bullets in any section.
- Do NOT use GitHub/CommonMark syntax (`**bold**`, `[label](url)`, `#` headers,
  `---` rules) -- Slack renders them as literal characters.
- Do NOT include the raw URL inline when a `<url|label>` works.
- Do NOT post or send the message before the user explicitly approves the draft.
- Do NOT write the message to a file. The deliverable is a plain chat reply
  ready to copy-paste into Slack.
- Do NOT wrap the message in a fenced code block, triple backticks, or any
  indentation that would render as code. Emit it as plain chat text.
- Do NOT wrap the message in prose ("Here is your governance message:" /
  "Let me know if you'd like changes"). The bare message is the whole reply.

## Slack mrkdwn cheatsheet

Slack `mrkdwn` is similar to Markdown but with key differences. Use these
exact tokens in every draft:

| Need | Slack mrkdwn | NOT |
|------|--------------|-----|
| Bold | `*bold*` | `**bold**` |
| Italic | `_italic_` | `*italic*` |
| Strikethrough | `~strike~` | `~~strike~~` |
| Inline code | `` `code` `` | same as Markdown |
| Code block | ` ```...``` ` | same as Markdown |
| Link | `<https://x.com\|label>` | `[label](https://x.com)` |
| Bare link | `<https://x.com>` | `https://x.com` |
| Bullet | `• item` or `- item` | `* item` |
| Blockquote | `> text` | same as Markdown |
| Heading | not supported -- use `*Bold:*` | `# Heading` |
| Horizontal rule | not supported -- use a blank line | `---` |
| User mention | `<@U12345>` | `@username` |
| Channel mention | `<#C12345\|name>` | `#channel` |
| Emoji | `:white_check_mark:` | unicode also works |

The pipe `|` inside `<url|label>` must NOT be escaped when pasted into Slack;
the table above escapes it only because it conflicts with Markdown table
syntax.
