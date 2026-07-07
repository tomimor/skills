# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A personal library of agent skills shared between Cursor and Claude Code. There is no application code to build or run — the "product" is the `skills/` directory plus `install.sh`, which installs skills into `~/.cursor/skills` and `~/.claude/skills`. `AGENTS.md` contains the full step-by-step instructions for adding skills; read it before adding or changing one.

## Commands

```bash
bash install.sh --check       # Validate frontmatter + SKILLS-array sync (this is what CI runs)
shellcheck install.sh         # Lint the install script (also run by CI)
bash install.sh --help        # Smoke test / list all skills
./install.sh --update-vendor  # Pull latest vendor submodules and re-link
git submodule update --init --recursive   # Populate vendor/ after a fresh clone
```

There are no tests beyond `--check` and shellcheck. CI (`.github/workflows/ci.yml`) fails if any skill directory is missing from the `SKILLS` array in `install.sh`, if any `SKILL.md` lacks `name:`/`description:` frontmatter, or if the frontmatter `name` doesn't match the directory name — so always run `bash install.sh --check` after adding or renaming a skill.

## Architecture

Everything hangs off one directory: any folder (or symlink) inside `skills/` containing a `SKILL.md` is automatically discoverable by both Cursor and Claude Code. Two kinds of entries live there:

- **Own skills** — regular directories (e.g. `skills/miguel-review/`), authored in this repo.
- **Vendor skills** — symlinks pointing into git submodules under `vendor/` (e.g. `skills/impeccable -> ../vendor/impeccable/.claude/skills/impeccable`). Never edit files inside `vendor/`; to change vendor behavior, contribute upstream or shadow it with an own skill of the same name (own directories take priority — `link_vendor_skills` skips symlink creation when a real directory already exists).

`install.sh` is the single registry and tool: the `SKILLS` array lists every own skill (name + picker description) and the `VENDOR_SKILLS` array lists every vendor pack (`name:owner/repo:skills-subdir[:comma-separated-skill-filter]` — the optional 4th field pins which of the vendor's skills get linked).

`index.html` is a static landing page; `README.md` is the public catalog.

## Adding a skill — the sync rule

A skill isn't "added" until four things land together in one commit (see AGENTS.md for the full procedure):

1. The `skills/<name>/` directory with a valid `SKILL.md` (YAML frontmatter: `name` matching the directory, `description` in third person covering both what it does and when to trigger it).
2. An entry in the `SKILLS` array in `install.sh`.
3. A row in the README's skill catalog under an appropriate `###` section (credit the source with a link if adapted from elsewhere).
4. For vendor packs: `.gitmodules`, the `vendor/<name>` submodule, the `skills/` symlinks, and a row in the README's vendor table.

## Skill authoring conventions

- Names: lowercase, hyphens, max 64 chars.
- `SKILL.md` body under 500 lines; push detail into reference files.
- Reference files go one level deep only — link them from `SKILL.md`, never chain reference → reference.
- No narration comments that just restate what the code does.
- The `create-skill` skill (`skills/create-skill/SKILL.md`) is the in-repo authoring guide.

## Local machine wiring (context for symlink code)

`--self` wires the author's machine: `~/.cursor/skills` is a single symlink to this repo's `skills/`, but `~/.claude/skills` must be a real directory of per-skill symlinks because Claude Code doesn't load skills through a symlinked top-level directory. If the Claude side drifts, re-create it with `./install.sh --symlink --all --force --target ~/.claude/skills`.
