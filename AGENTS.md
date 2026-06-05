# AGENTS.md

Instructions for AI agents working in this repo.

## Repo structure

```
tomim-skills/
├── skills/                  # All discoverable skills (own + vendor symlinks)
│   ├── miguel-review/       # Own skill (regular directory)
│   ├── impeccable -> ../vendor/impeccable/.claude/skills/impeccable  # Vendor symlink
│   └── ...
├── vendor/                  # Third-party skill repos (git submodules)
│   └── impeccable/          # pbakaus/impeccable
├── install.sh               # Install script with vendor support
├── README.md
└── AGENTS.md                # This file
```

`~/.cursor/skills` is a symlink to `skills/`. `~/.claude/skills` is a real directory whose entries are per-skill symlinks back into `skills/` -- Claude Code does not load skills from a symlinked top-level directory, so the per-skill symlinks are how it picks them up while live edits in this repo still take effect. Any skill directory (or symlink) inside `skills/` with a `SKILL.md` is automatically available to agents in both Cursor and Claude Code.

Re-create the per-skill symlinks if anything drifts:

```bash
./install.sh --symlink --all --force --target ~/.claude/skills
```

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

4. **MANDATORY: Add the skill to `README.md`**. Every skill registered in `install.sh` must appear in the README's
   skill catalog under an appropriate `###` section. If no existing section fits, create a new one. **Do not skip this
   step.** The README is the public catalog -- a skill missing from it is effectively undiscoverable. If the skill is
   adapted from a vendor (e.g. gstack), credit the source in the description with a link.

5. Commit the new directory, the updated `install.sh`, and the updated `README.md` together in a single commit.

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

4. **MANDATORY: Add the vendor skill set to `README.md`**. Same rule as own skills -- every vendor skill exposed via
   `skills/` must appear in the README catalog, with a link to the upstream repo. Do not skip this step.

5. Commit `.gitmodules`, the `vendor/<name>` submodule, the new symlinks, the updated `install.sh`, and the updated
   `README.md` together.

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
| `install.sh` | Installs skills to `~/.cursor/skills` or `~/.claude/skills`. Contains the `SKILLS` and `VENDOR_SKILLS` registries. Pass `--symlink` to link skills instead of copying them, which is how `~/.claude/skills` is wired. |
| `.gitmodules` | Git submodule definitions for vendor skills |
| `skills/` | The single directory both platforms read from |
| `vendor/` | Git submodules for third-party skill repos |
