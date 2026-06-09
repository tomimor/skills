# Lottie Creator MCP — setup & troubleshooting

The **LottieFiles Creator MCP** (`@lottiefiles/creator-mcp`) connects an AI
assistant (Claude, Cursor, Windsurf, and 40+ others) to the LottieFiles Creator
API through a local bridge, so the assistant can build and edit animations in
Creator on your behalf via natural language.

> Don't confuse it with `mcp-server-lottiefiles` (a community package that only
> *searches* existing animations). For authoring, use `@lottiefiles/creator-mcp`.
> Official guide: lottie.link/mcp-guide.

## Prerequisites

- A LottieFiles account with **Creator** access.
- Node.js available (the MCP runs via `npx`).
- An MCP-capable assistant.

## Claude Code (one command)

```bash
claude mcp add lottiefiles-creator -- npx -y @lottiefiles/creator-mcp@latest
```

## Claude Desktop (manual config)

Edit the config file and add the server under `mcpServers`:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "lottiefiles-creator": {
      "command": "npx",
      "args": ["-y", "@lottiefiles/creator-mcp@latest"]
    }
  }
}
```

Restart the assistant after editing. On first use you'll be prompted to
authenticate with your LottieFiles account.

> Config shape can change between MCP versions — confirm against the official
> guide at lottie.link/mcp-guide (or docs.lottiefiles.com → Creator → AI Tools →
> Lottie Creator MCP) if the server fails to start.

## Verify before building

List the assistant's MCP tools and confirm the LottieFiles server connected and
exposed its tools — or just ask it: *"Using the lottiefiles tool, search for a
rocket launch animation."* If it didn't connect, fix setup first; don't silently
fall back to hand-writing Lottie JSON, which defeats the point of the workflow.

## Pair with the motion-design skill

The MCP supplies the tools; install/keep the LottieFiles motion-design skill (or
use [motion-design.md](motion-design.md) here) for the judgment — easing,
timing, choreography — that makes output look intentional.

## Common issues

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| No LottieFiles tools listed | Server not registered / assistant not restarted | Re-run install, restart assistant |
| Auth error on build | Not logged in to LottieFiles | Complete the auth prompt; check Creator access |
| `npx` not found | Node.js missing | Install Node, reopen terminal |
| Build succeeds but looks generic | No motion spec in the prompt | Add timing/easing/choreography (see prompt-template.md) |
