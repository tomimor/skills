#!/usr/bin/env bash
set -euo pipefail

REPO_URL="https://github.com/tomimor/tomim-skills"
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
  "create-skill:Guide for authoring Cursor agent skills (forked from Cursor built-in)"
)

VENDOR_SKILLS=(
  "impeccable:pbakaus/impeccable:.claude/skills"
  "remotion:remotion-dev/skills:skills"
)

TARGET_DIR=""
INSTALL_ALL=false
SINGLE_SKILL=""
FORCE=false
UPDATE_VENDOR=false

usage() {
  cat <<EOF
Usage: install.sh [OPTIONS]

Install agent skills to your Cursor or Claude Code skills directory.

Options:
  --all              Install all skills (non-interactive)
  --skill <name>     Install a single skill by name
  --target <dir>     Override the install directory
  --force            Overwrite existing skills without confirming
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

resolve_source_dir() {
  if [[ -d "$SCRIPT_DIR/skills" ]]; then
    echo "$SCRIPT_DIR/skills"
    return
  fi

  local tmp
  tmp="$(mktemp -d)"
  echo "Downloading skills from $REPO_URL..." >&2
  if command -v git &>/dev/null; then
    git clone --depth 1 --quiet "$REPO_URL" "$tmp/repo" 2>/dev/null
    echo "$tmp/repo/skills"
  else
    echo "Error: git is required to download skills remotely." >&2
    exit 1
  fi
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
    local vendor_name="${entry%%:*}"
    local rest="${entry#*:}"
    local skills_subdir="${rest#*:}"
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

    echo "  Linking $vendor_name skills (v$version)..."
    for skill_dir in "$vendor_skills_path"/*/; do
      [[ -d "$skill_dir" ]] || continue
      local skill_name
      skill_name=$(basename "$skill_dir")
      local link_path="$skills_dir/$skill_name"
      local rel_target="../vendor/$vendor_name/$skills_subdir/$skill_name"

      if [[ -e "$link_path" ]] && [[ ! -L "$link_path" ]]; then
        echo "    Skipped $skill_name (local skill takes priority)"
        continue
      fi

      ln -sf "$rel_target" "$link_path"
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
  cp -r "$src" "$dest"
  echo "  Installed $skill_name -> $dest"
}

pick_platform() {
  local platforms
  platforms=$(detect_platforms)

  if [[ -z "$platforms" ]]; then
    echo "No supported platform detected (checked ~/.cursor, ~/.claude)."
    echo "Use --target <dir> to specify an install directory."
    exit 1
  fi

  local platform_arr=($platforms)

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
      --update-vendor) UPDATE_VENDOR=true; shift ;;
      -h|--help) usage; exit 0 ;;
      *) echo "Unknown option: $1" >&2; usage; exit 1 ;;
    esac
  done

  if [[ "$UPDATE_VENDOR" = true ]]; then
    update_vendor
    echo ""
    echo "Done."
    return
  fi

  local source_dir
  source_dir="$(resolve_source_dir)"

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

  echo ""
  echo "Done."
}

main "$@"
