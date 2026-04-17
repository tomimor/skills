# AGENTS.md

Instructions for AI agents working in this repo.

## Repo structure

```
tomim-skills/
├── skills/                  # All discoverable skills (own + vendor symlinks)
│   ├── miguel-review/       # Own skill (regular directory)
│   ├── polish -> ../vendor/impeccable/.claude/skills/polish  # Vendor symlink
│   └── ...
├── vendor/                  # Third-party skill repos (git submodules)
│   └── impeccable/          # pbakaus/impeccable
├── install.sh               # Install script with vendor support
├── README.md
└── AGENTS.md                # This file
```

`~/.cursor/skills` and `~/.claude/skills` are both symlinks to `skills/`. Any skill directory (or symlink) inside `skills/` with a `SKILL.md` is automatically available to agents in both Cursor and Claude Code.

## Adding a new own skill

Own skills are skills you write and maintain yourself. They live as regular directories under `skills/`.

1. Create the directory and SKILL.md:

```
skills/<skill-name>/
├── SKILL.md              # Required
├── references/           # Optional -- detailed docs the agent reads on demand
│   └── some-reference.md
└── examples.md           # Optional
```

2. SKILL.md must have YAML frontmatter with `name` and `description`:

```yaml
---
name: my-skill-name
description: >-
  What this skill does and when to use it. Include trigger phrases
  so the agent knows when to activate it. Use when the user mentions
  X, Y, or Z.
---
```

3. Register the skill in `install.sh` by adding an entry to the `SKILLS` array:

```bash
SKILLS=(
  ...existing entries...
  "my-skill-name:Short description for the install picker"
)
```

4. Commit the new directory and the updated `install.sh`.

### Own skill conventions

- **Name**: lowercase, hyphens, max 64 chars (e.g. `miguel-review`, `gh-issue-creator`)
- **Description**: third person, includes both WHAT it does and WHEN to use it
- **SKILL.md body**: under 500 lines; use reference files for detailed content
- **Reference files**: one level deep only (link from SKILL.md, never chain references)
- **No narration comments**: don't add comments that just repeat what the code does

## Adding a new vendor skill set

Vendor skills come from external repos maintained by other people. They live as git submodules under `vendor/` with symlinks in `skills/`.

1. Add the submodule:

```bash
git submodule add https://github.com/<owner>/<repo> vendor/<name>
```

2. Add an entry to the `VENDOR_SKILLS` array in `install.sh`:

```bash
VENDOR_SKILLS=(
  ...existing entries...
  "<name>:<owner>/<repo>:<path-to-skills-dir-inside-repo>"
)
```

The format is `name:github-repo:skills-path`. For example, Impeccable stores its skills in `.claude/skills`, so its entry is:

```
"impeccable:pbakaus/impeccable:.claude/skills"
```

3. Create symlinks from `skills/` to each skill in the vendor repo:

```bash
for skill_dir in vendor/<name>/<skills-path>/*/; do
  ln -sf "../vendor/<name>/<skills-path>/$(basename "$skill_dir")" "skills/$(basename "$skill_dir")"
done
```

4. Commit `.gitmodules`, the `vendor/<name>` submodule, the new symlinks, and the updated `install.sh`.

### Vendor skill rules

- **Never edit files inside `vendor/`**. Those are managed by the upstream repo. To make changes, contribute upstream or override with an own skill of the same name (own skills take priority over vendor symlinks).
- **Name conflicts**: if an own skill and a vendor skill share the same name, the own skill wins. The `link_vendor_skills` function in `install.sh` skips symlink creation when a non-symlink directory already exists.
- **Updating vendors**: run `./install.sh --update-vendor` to pull latest from all vendor submodules and re-link.

## Updating vendor skills

```bash
./install.sh --update-vendor
```

This runs `git submodule update --remote --merge` and re-creates the symlinks. After updating, commit the changed submodule pointer:

```bash
git add vendor/<name>
git commit -m "update <name> to v<new-version>"
```

## Key files

| File | Purpose |
|------|---------|
| `install.sh` | Installs skills to `~/.cursor/skills` or `~/.claude/skills`. Contains the `SKILLS` and `VENDOR_SKILLS` registries. |
| `.gitmodules` | Git submodule definitions for vendor skills |
| `skills/` | The single directory both platforms read from |
| `vendor/` | Git submodules for third-party skill repos |
