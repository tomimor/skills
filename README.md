# tomim-skills

Agent skills I use daily across Cursor and Claude Code. Each skill teaches an AI coding agent how to perform a specific workflow -- reviewing PRs, managing GitHub issues, writing in my voice, and more.

## What Are Agent Skills?

Agent skills are markdown files that give AI coding assistants specialized knowledge and workflows. Drop a skill into your `~/.cursor/skills/` or `~/.claude/skills/` directory, and the agent learns how to perform that task using your preferred approach.

## Skills

### GitHub Workflow

| Skill | Description |
|-------|-------------|
| [pr-dashboard](skills/pr-dashboard/SKILL.md) | Generate a status overview of your open PRs for any repo. Shows title, reviews, CI, comments, and a recommended next step per PR. |
| [miguel-review](skills/miguel-review/SKILL.md) | Opinionated code review biased toward minimal diffs, deletions over additions, and zero tolerance for dead code or premature abstractions. |
| [gh-pr-comment-assistant](skills/gh-pr-comment-assistant/SKILL.md) | Fetch PR review comments, group and prioritize them, summarize what each reviewer is asking, and help plan fixes. |
| [gh-issue-creator](skills/gh-issue-creator/SKILL.md) | Create well-labeled GitHub issues using bug, feature, or tech debt templates. Fetches labels dynamically and enforces concise descriptions. |
| [gh-pr-description-updater](skills/gh-pr-description-updater/SKILL.md) | Read or update a PR description following the repo's PR template. Enforces brevity and template compliance. |

### Writing

| Skill | Description |
|-------|-------------|
| [writing-voice](skills/writing-voice/SKILL.md) | Write in a direct, personal, sensory style. Bans AI-giveaway phrases, enforces visual formatting, and includes platform-specific guidance for LinkedIn, X, blog, email, and technical writing. |

## Install

### Quick install (all skills)

```bash
curl -fsSL https://raw.githubusercontent.com/tomim/tomim-skills/main/install.sh | bash -s -- --all
```

### Install a single skill

```bash
curl -fsSL https://raw.githubusercontent.com/tomim/tomim-skills/main/install.sh | bash -s -- --skill pr-dashboard
```

### Manual install

Copy any skill directory into your platform's skills folder:

```bash
# Cursor
cp -r skills/pr-dashboard ~/.cursor/skills/

# Claude Code
cp -r skills/pr-dashboard ~/.claude/skills/
```

### Install script options

| Flag | Description |
|------|-------------|
| `--all` | Install all skills (non-interactive) |
| `--skill <name>` | Install a single skill by name |
| `--target <dir>` | Override the install directory |
| `--force` | Overwrite existing skills without confirming |

Running without flags starts an interactive picker.

## Platform Compatibility

Skills use the same SKILL.md format across platforms. The only difference is where they live on disk:

| Platform | Install path |
|----------|-------------|
| Cursor | `~/.cursor/skills/<skill-name>/` |
| Claude Code | `~/.claude/skills/<skill-name>/` |

All skills in this repo require the [GitHub CLI](https://cli.github.com/) (`gh`) except `writing-voice`.

## License

[MIT](LICENSE)
