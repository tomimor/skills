# Lottie Creator MCP — setup & troubleshooting

The Lottie Creator MCP connects an AI assistant (Claude, Cursor, Windsurf, and
40+ others) to the LottieFiles Creator API through a local bridge, so the
assistant can build and edit animations in Creator on your behalf via natural
language.

## Prerequisites

- A LottieFiles account with **Creator** access.
- Node.js available (the MCP runs via `npx`).
- An MCP-capable assistant.

## Install with Smithery (fastest)

```bash
npx -y smithery install mcp-server-lottiefiles --client claude
```

Swap `--client claude` for `cursor`, `windsurf`, etc. as needed.

## Manual config

Open the assistant's MCP config and add the LottieFiles server:

- **Claude Desktop**: `Settings → Developer → Edit Config`
- **Claude Code**: `~/.claude.json` or a project-level `.mcp.json`

```json
{
  "mcpServers": {
    "lottiefiles": {
      "command": "npx",
      "args": ["-y", "mcp-server-lottiefiles"]
    }
  }
}
```

Restart the assistant after editing. On first use you may be prompted to
authenticate with your LottieFiles account.

> Config shape can change between MCP versions — confirm against the official
> docs at docs.lottiefiles.com (Creator → AI Tools → Lottie Creator MCP) and the
> Smithery package page if the server fails to start.

## Verify before building

List the assistant's MCP tools and confirm the LottieFiles server connected and
exposed its tools. If it didn't connect, fix setup first — don't silently
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
