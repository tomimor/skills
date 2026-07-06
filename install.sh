#!/usr/bin/env bash
set -euo pipefail

REPO_URL="https://github.com/tomimor/skills"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

SKILLS=(
  "pr-dashboard:PR status overview for your open PRs"
  "miguel-review:Opinionated code review (minimal diffs, deletions over additions)"
  "gh-pr-comment-assistant:Analyze and plan fixes for PR review comments"
  "gh-issue-creator:Create GitHub issues from bug/feature/tech-debt templates"
  "gh-pr-description-updater:Read or update PR descriptions using repo template"
  "verify-pr:Three-phase PR verification (code review, test plan, upstream assumptions)"
  "writing-voice:Direct, personal writing style with AI-slop blacklist"
  "grill-me:Interview the user relentlessly about a plan or design via AskQuestion"
  "improve-prompt:Critique and rewrite a prompt using general prompt engineering best practices"
  "create-skill:Guide for authoring Cursor agent skills (forked from Cursor built-in)"
  "git-worktrees:Worktree workflow so parallel agent chats stop colliding on branches"
  "goal-cursor:Anthropic-style /goal loop adapted for Cursor's stop hook"
  "meta-ads-bulk-creator:Build Meta Ads Manager bulk-import files (.xlsx + Unicode .txt) from a YAML brief"
  "gh-pr-list:Numbered Slack message of your non-draft open PRs in the current repo"
  "gh-issue-triage:Pick the top 3 AI-ready issues in the current repo with a kickoff prompt for each"
  "review-pr:Review a teammate's PR and emit copy-paste-ready, senior-level comments"
  "investigate:Systematic root-cause debugging with the Iron Law (no fix without root cause) -- adapted from gstack"
  "benchmark:Performance regression detection for web pages (Core Web Vitals, bundles, baselines) -- adapted from gstack"
  "office-hours:YC-style premise interrogation and design partner. No code -- ends with an assignment -- adapted from gstack"
  "verification-before-completion:Gate that forces fresh proof before any 'done' claim -- adapted from obra/superpowers"
  "qa-manual:Drive a web feature in Chrome MCP through happy path + edges, produce evidence"
  "agent-guide-bootstrap:Bootstrap AGENTS.md + .agents/ guide system for a repo (progressive disclosure)"
  "governance-message:Slack-ready governance proposal summary from a single proposal URL"
  "teach:Stateful multi-session teaching workspace (mission, resources, HTML lessons) -- adapted from mattpocock/skills"
  "save-and-archive:Land worktree work onto main (commit, sync, ff-merge, push, cleanup) for solo projects"
  "whats-missing:Surface the single most important blindspot in a plan or decision -- not a list, the one piece that changes the call"
  "ui-review:Parallel frontend UI review (typography, layout, a11y, responsiveness, copy, polish) -- prioritized small fixes, never rewrites"
  "grid-review:Read-only audit of a page's layout grid (column adherence, baseline rhythm, optical alignment) with a critique"
  "update-branch:Pull the latest from main and merge it into the current working branch"
  "loop-cve-audit:Iterative CVE remediation loop -- scan, prove reachability, fix smallest-first, re-verify, repeat"
  "loop-react-doctor:Drive every React app to a verified react-doctor 100/100 (latest at run start), one root cause per iteration"
  "share-ready:Audit + fully configure link previews (OG, Twitter cards) and browser presentation (favicons, manifest), generate assets, verify locally"
)

VENDOR_SKILLS=(
  "impeccable:pbakaus/impeccable:.claude/skills"
  "remotion:remotion-dev/skills:skills"
  "improve:shadcn/improve:skills"
  "emil:emilkowalski/skill:skills:review-animations,emil-design-eng"
)

TARGET_DIR=""
INSTALL_ALL=false
SINGLE_SKILL=""
FORCE=false
UPDATE_VENDOR=false
SYMLINK=false
CHECK=false
SELF=false
SOURCE_DIR=""
CLEANUP_TMP=""

usage() {
  cat <<EOF
Usage: install.sh [OPTIONS]

Install agent skills to your Cursor or Claude Code skills directory.

Options:
  --all              Install all skills (non-interactive)
  --skill <name>     Install a single skill by name
  --target <dir>     Override the install directory
  --force            Overwrite existing skills without confirming
  --symlink          Symlink skills into the target instead of copying (live edits)
  --self             Wire this repo into your own ~/.cursor and ~/.claude (edit-once symlinks)
  --check            Validate skill frontmatter and SKILLS-array sync, then exit
  --update-vendor    Update vendor submodules to their latest versions
  -h, --help         Show this help message

Running without flags starts an interactive picker.

Available skills:
EOF
  for entry in "${SKILLS[@]}"; do
    name="${entry%%:*}"
    desc="${entry#*:}"
    printf "  %-30s %s\n" "$name" "$desc"
  done
  echo ""
  echo "Vendor skills (via git submodules):"
  for entry in "${VENDOR_SKILLS[@]}"; do
    local vendor_name="${entry%%:*}"
    local rest="${entry#*:}"
    local repo="${rest%%:*}"
    printf "  %-30s %s\n" "$vendor_name" "https://github.com/$repo"
  done
}

detect_platforms() {
  local platforms=()
  if [[ -d "$HOME/.cursor" ]]; then
    platforms+=("cursor:$HOME/.cursor/skills")
  fi
  if [[ -d "$HOME/.claude" ]]; then
    platforms+=("claude:$HOME/.claude/skills")
  fi
  echo "${platforms[@]:-}"
}

confirm_overwrite() {
  local dest="$1"
  if [[ -d "$dest" ]] && [[ "$FORCE" = false ]]; then
    printf "  Skill already exists at %s. Overwrite? [y/N] " "$dest"
    read -r answer
    [[ "$answer" =~ ^[Yy]$ ]] || return 1
  fi
  return 0
}

# Sets SOURCE_DIR to the skills directory. When run outside the repo, clones it
# to a temp dir and registers an EXIT trap to clean up. Must be called directly
# (not via $(...)) so the trap is installed in the main shell, not a subshell.
resolve_source_dir() {
  if [[ -d "$SCRIPT_DIR/skills" ]]; then
    SOURCE_DIR="$SCRIPT_DIR/skills"
    return
  fi

  if ! command -v git &>/dev/null; then
    echo "Error: git is required to download skills remotely." >&2
    exit 1
  fi

  CLEANUP_TMP="$(mktemp -d)"
  trap 'rm -rf "$CLEANUP_TMP"' EXIT
  echo "Downloading skills from $REPO_URL..." >&2
  git clone --depth 1 --quiet "$REPO_URL" "$CLEANUP_TMP/repo" 2>/dev/null
  SOURCE_DIR="$CLEANUP_TMP/repo/skills"
}

init_vendor_submodules() {
  if [[ -f "$SCRIPT_DIR/.gitmodules" ]]; then
    echo "Initializing vendor submodules..."
    git -C "$SCRIPT_DIR" submodule update --init --recursive --quiet 2>/dev/null || true
  fi
}

link_vendor_skills() {
  local skills_dir="$1"

  for entry in "${VENDOR_SKILLS[@]}"; do
    # Format: name:owner/repo:skills_subdir[:skill1,skill2,...]
    # The optional 4th field pins which skills to link; omit it to link them all.
    local vendor_name repo skills_subdir skills_filter
    IFS=':' read -r vendor_name repo skills_subdir skills_filter <<< "$entry"
    local vendor_skills_path="$SCRIPT_DIR/vendor/$vendor_name/$skills_subdir"

    if [[ ! -d "$vendor_skills_path" ]]; then
      echo "  Warning: vendor skills not found at $vendor_skills_path (run git submodule update)" >&2
      continue
    fi

    local version="unknown"
    local plugin_json="$SCRIPT_DIR/vendor/$vendor_name/.claude-plugin/plugin.json"
    if [[ -f "$plugin_json" ]] && command -v grep &>/dev/null; then
      version=$(grep -o '"version": *"[^"]*"' "$plugin_json" | head -1 | grep -o '"[^"]*"$' | tr -d '"')
    fi

    local skill_dirs=()
    if [[ -n "${skills_filter:-}" ]]; then
      local wanted name
      IFS=',' read -ra wanted <<< "$skills_filter"
      for name in "${wanted[@]}"; do
        skill_dirs+=("$vendor_skills_path/$name/")
      done
    else
      skill_dirs=("$vendor_skills_path"/*/)
    fi

    echo "  Linking $vendor_name skills (v$version)..."
    for skill_dir in "${skill_dirs[@]}"; do
      [[ -d "$skill_dir" ]] || continue
      local skill_name
      skill_name=$(basename "$skill_dir")
      local link_path="$skills_dir/$skill_name"
      local rel_target="../vendor/$vendor_name/$skills_subdir/$skill_name"

      if [[ -e "$link_path" ]] && [[ ! -L "$link_path" ]]; then
        echo "    Skipped $skill_name (local skill takes priority)"
        continue
      fi

      # -n (no-dereference): without it, re-running over an existing symlink that
      # points at a directory makes ln create the link *inside* that directory,
      # producing nested self-symlinks inside the submodules.
      ln -sfn "$rel_target" "$link_path"
      echo "    Linked $skill_name"
    done
  done
}

update_vendor() {
  echo "Updating vendor submodules..."
  git -C "$SCRIPT_DIR" submodule update --remote --merge --quiet 2>/dev/null
  link_vendor_skills "$SCRIPT_DIR/skills"
  echo "Vendor skills updated."
}

in_array() {
  local needle="$1"; shift
  local item
  for item in "$@"; do
    [[ "$item" == "$needle" ]] && return 0
  done
  return 1
}

# Validate every own skill (directory with a SKILL.md) and that the SKILLS array
# stays in sync with the directories on disk. Returns non-zero on any problem so
# it can gate CI.
check_skills() {
  local src="$SCRIPT_DIR/skills"
  local errors=0
  local -a dir_skills=()
  local -a arr_skills=()

  local entry
  for entry in "${SKILLS[@]}"; do
    arr_skills+=("${entry%%:*}")
  done

  local dir skill_name md decl_name
  for dir in "$src"/*/; do
    [[ -L "${dir%/}" ]] && continue   # vendor symlinks are validated upstream
    skill_name="$(basename "$dir")"
    dir_skills+=("$skill_name")
    md="$dir/SKILL.md"

    if [[ ! -f "$md" ]]; then
      echo "  ✗ $skill_name: missing SKILL.md"
      errors=$((errors + 1))
      continue
    fi

    decl_name="$(sed -n 's/^name:[[:space:]]*//p' "$md" | head -1 | tr -d ' "'\''\r')"
    if [[ -z "$decl_name" ]]; then
      echo "  ✗ $skill_name: SKILL.md has no 'name:' frontmatter"
      errors=$((errors + 1))
    elif [[ "$decl_name" != "$skill_name" ]]; then
      echo "  ✗ $skill_name: frontmatter name '$decl_name' != directory name"
      errors=$((errors + 1))
    fi

    if ! grep -qE '^description:' "$md"; then
      echo "  ✗ $skill_name: SKILL.md has no 'description:' frontmatter"
      errors=$((errors + 1))
    fi
  done

  local s
  for s in "${dir_skills[@]}"; do
    in_array "$s" "${arr_skills[@]}" || {
      echo "  ✗ $s: skill directory not listed in install.sh SKILLS array"
      errors=$((errors + 1))
    }
  done
  for s in "${arr_skills[@]}"; do
    [[ -d "$src/$s" ]] || {
      echo "  ✗ $s: in SKILLS array but no skills/$s directory"
      errors=$((errors + 1))
    }
  done

  if [[ $errors -eq 0 ]]; then
    echo "OK: ${#dir_skills[@]} own skills valid and in sync with the SKILLS array."
    return 0
  fi
  echo ""
  echo "$errors problem(s) found."
  return 1
}

# Wire this repo into the author's own machine with edit-once symlinks.
# Cursor loads skills from a symlinked top-level dir, so a single dir symlink
# works there. Claude Code does NOT, so it needs per-skill symlinks instead.
install_self() {
  resolve_source_dir
  local source_dir="$SOURCE_DIR"
  init_vendor_submodules

  echo "Linking vendor skills into repo skills/ ..."
  link_vendor_skills "$source_dir"

  if [[ -d "$HOME/.cursor" ]]; then
    if [[ -e "$HOME/.cursor/skills" && ! -L "$HOME/.cursor/skills" ]]; then
      echo "  Warning: ~/.cursor/skills is a real directory, not a symlink; leaving it untouched." >&2
    else
      ln -sfn "$source_dir" "$HOME/.cursor/skills"
      echo "  Cursor: ~/.cursor/skills -> $source_dir"
    fi
  fi

  if [[ -d "$HOME/.claude" ]]; then
    mkdir -p "$HOME/.claude/skills"
    local entry name
    for entry in "$source_dir"/*/; do
      name="$(basename "$entry")"
      ln -sfn "$source_dir/$name" "$HOME/.claude/skills/$name"
    done
    echo "  Claude: per-skill symlinks in ~/.claude/skills"
  fi

  echo ""
  echo "Done."
}

install_goal_cursor_hook() {
  local hooks_file="$HOME/.cursor/hooks.json"
  local hook_cmd="python3 \$HOME/.cursor/skills/goal-cursor/scripts/stop_hook.py"

  mkdir -p "$HOME/.cursor"

  HOOKS_FILE="$hooks_file" HOOK_CMD="$hook_cmd" python3 - <<'PY'
import json
import os
from pathlib import Path

path = Path(os.environ["HOOKS_FILE"])
cmd = os.environ["HOOK_CMD"]

if path.exists():
    try:
        data = json.loads(path.read_text("utf-8"))
    except json.JSONDecodeError:
        print(f"  Warning: {path} is not valid JSON; refusing to overwrite.")
        raise SystemExit(1)
else:
    data = {}

data.setdefault("version", 1)
hooks = data.setdefault("hooks", {})
stop_list = hooks.setdefault("stop", [])

if any(isinstance(h, dict) and h.get("command") == cmd for h in stop_list):
    print(f"  goal-cursor stop hook already present in {path}")
else:
    stop_list.append({"command": cmd, "loop_limit": None, "timeout": 60})
    path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    print(f"  Added goal-cursor stop hook to {path}")
PY
}

install_skill() {
  local source_dir="$1"
  local skill_name="$2"
  local target="$3"

  local src="$source_dir/$skill_name"
  local dest="$target/$skill_name"

  if [[ ! -d "$src" ]]; then
    echo "Error: Skill '$skill_name' not found in $source_dir" >&2
    return 1
  fi

  if ! confirm_overwrite "$dest"; then
    echo "  Skipped $skill_name"
    return 0
  fi

  mkdir -p "$target"
  rm -rf "$dest"
  if [[ "$SYMLINK" = true ]]; then
    ln -sfn "$src" "$dest"
    echo "  Linked $skill_name -> $dest"
  else
    cp -r "$src" "$dest"
    echo "  Installed $skill_name -> $dest"
  fi
}

pick_platform() {
  local platforms
  platforms=$(detect_platforms)

  if [[ -z "$platforms" ]]; then
    echo "No supported platform detected (checked ~/.cursor, ~/.claude)."
    echo "Use --target <dir> to specify an install directory."
    exit 1
  fi

  local platform_arr=()
  read -ra platform_arr <<< "$platforms"

  if [[ ${#platform_arr[@]} -eq 1 ]]; then
    TARGET_DIR="${platform_arr[0]#*:}"
    local name="${platform_arr[0]%%:*}"
    echo "Detected platform: $name"
    echo "Install directory: $TARGET_DIR"
    return
  fi

  echo "Multiple platforms detected:"
  local i=1
  for p in "${platform_arr[@]}"; do
    local name="${p%%:*}"
    local path="${p#*:}"
    echo "  $i) $name ($path)"
    ((i++))
  done

  printf "Pick a platform [1-%d]: " "${#platform_arr[@]}"
  read -r choice
  choice=$((choice - 1))

  if [[ $choice -lt 0 ]] || [[ $choice -ge ${#platform_arr[@]} ]]; then
    echo "Invalid choice." >&2
    exit 1
  fi

  TARGET_DIR="${platform_arr[$choice]#*:}"
}

pick_skills() {
  echo ""
  echo "Available skills:"
  local i=1
  for entry in "${SKILLS[@]}"; do
    local name="${entry%%:*}"
    local desc="${entry#*:}"
    echo "  $i) $name -- $desc"
    ((i++))
  done
  echo "  a) Install all"

  printf "Pick skills (comma-separated numbers, or 'a' for all): "
  read -r selection

  if [[ "$selection" = "a" ]]; then
    INSTALL_ALL=true
    return
  fi

  IFS=',' read -ra picks <<< "$selection"
  local selected=()
  for p in "${picks[@]}"; do
    p=$(echo "$p" | tr -d ' ')
    local idx=$((p - 1))
    if [[ $idx -ge 0 ]] && [[ $idx -lt ${#SKILLS[@]} ]]; then
      local entry="${SKILLS[$idx]}"
      selected+=("${entry%%:*}")
    fi
  done

  if [[ ${#selected[@]} -eq 0 ]]; then
    echo "No valid skills selected." >&2
    exit 1
  fi

  SELECTED_SKILLS=("${selected[@]}")
}

main() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --all) INSTALL_ALL=true; shift ;;
      --skill) SINGLE_SKILL="$2"; shift 2 ;;
      --target) TARGET_DIR="$2"; shift 2 ;;
      --force) FORCE=true; shift ;;
      --symlink) SYMLINK=true; shift ;;
      --self) SELF=true; shift ;;
      --check) CHECK=true; shift ;;
      --update-vendor) UPDATE_VENDOR=true; shift ;;
      -h|--help) usage; exit 0 ;;
      *) echo "Unknown option: $1" >&2; usage; exit 1 ;;
    esac
  done

  if [[ "$CHECK" = true ]]; then
    if check_skills; then exit 0; else exit 1; fi
  fi

  if [[ "$SELF" = true ]]; then
    install_self
    return
  fi

  if [[ "$UPDATE_VENDOR" = true ]]; then
    update_vendor
    echo ""
    echo "Done."
    return
  fi

  resolve_source_dir
  local source_dir="$SOURCE_DIR"

  init_vendor_submodules

  if [[ -z "$TARGET_DIR" ]]; then
    pick_platform
  else
    mkdir -p "$TARGET_DIR"
  fi

  echo ""

  if [[ -n "$SINGLE_SKILL" ]]; then
    install_skill "$source_dir" "$SINGLE_SKILL" "$TARGET_DIR"
  elif [[ "$INSTALL_ALL" = true ]]; then
    echo "Installing all skills to $TARGET_DIR..."
    for entry in "${SKILLS[@]}"; do
      install_skill "$source_dir" "${entry%%:*}" "$TARGET_DIR"
    done
  else
    SELECTED_SKILLS=()
    pick_skills
    if [[ "$INSTALL_ALL" = true ]]; then
      echo "Installing all skills to $TARGET_DIR..."
      for entry in "${SKILLS[@]}"; do
        install_skill "$source_dir" "${entry%%:*}" "$TARGET_DIR"
      done
    else
      echo "Installing selected skills to $TARGET_DIR..."
      for name in "${SELECTED_SKILLS[@]}"; do
        install_skill "$source_dir" "$name" "$TARGET_DIR"
      done
    fi
  fi

  echo ""
  echo "Linking vendor skills..."
  link_vendor_skills "$source_dir"

  if [[ "$TARGET_DIR" == *"/.cursor/skills" ]] && [[ -d "$TARGET_DIR/goal-cursor" ]]; then
    echo ""
    echo "Configuring goal-cursor stop hook..."
    install_goal_cursor_hook
    echo "  Tip: set GOAL_CURSOR_EVAL_MODEL, GOAL_CURSOR_MAX_TURNS, or ANTHROPIC_API_KEY to customise the evaluator."
  fi

  echo ""
  echo "Done."
}

main "$@"
