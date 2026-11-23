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
  "meta-ads-bulk-creator:Build Meta Ads Manager bulk-import files (.xlsx + Unicode .txt) from a YAML brief"
  "gh-pr-list:Numbered Slack message of your non-draft open PRs in the current repo"
  "gh-issue-triage:Pick the top 3 AI-ready issues in the current repo with a kickoff prompt for each"
  "review-pr:Review a teammate's PR and emit copy-paste-ready, senior-level comments"
  "investigate:Systematic root-cause debugging with the Iron Law (no fix without root cause) -- adapted from gstack"
  "benchmark:Performance regression detection for web pages (Core Web Vitals, bundles, baselines) -- adapted from gstack"
  "blazing-fast-web:Make a web app measurably faster (re-renders, bundle, caching, N+1, assets), measuring before/after each fix"
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
  "seo-geo-audit:Technical SEO/GEO audit + fixes (crawlability, sitemaps, robots + AI crawlers, canonicals, structured data, rendering) with a scripted live-site auditor"
  "writing-google-style:Write and review developer docs in Google style, with a fence-aware violation scanner"
  "footer-design:Pick a footer from footer.design (bundled layout index of ~780 footers, contact sheet), then rebuild it in your stack"
)

VENDOR_SKILLS=(
  "impeccable:pbakaus/impeccable:.claude/skills"
  "remotion:remotion-dev/skills:skills:remotion-best-practices"
  "improve:shadcn/improve:skills"
  "emil:emilkowalski/skill:skills:review-animations,emil-design-eng,animation-vocabulary,apple-design"
  "cloudflare:cloudflare/skills:skills"
  "jakubkrehel:jakubkrehel/skills:skills:state-machine,break,variant"
  "anatomy:wheresryan22/anatomy:."
  "snapcn:snapcndev/snapcn:skills:snapcn,remotion-product-demo,remotion-launch-video"
)

TARGET_DIR=""
INSTALL_ALL=false
SINGLE_SKILL=""
FORCE=false
UPDATE_VENDOR=false
VENDOR_ONLY=()
SYMLINK=false
CHECK=false
SELF=false
SOURCE_DIR=""
CLEANUP_TMP=""
LINK_NEW=""
LINK_MISSING=""

# Colors only when writing to a terminal, and never when NO_COLOR is set.
IS_TTY=false
C_BOLD="" C_DIM="" C_GREEN="" C_YELLOW="" C_RED="" C_RESET=""
if [[ -t 1 ]]; then
  IS_TTY=true
  if [[ -z "${NO_COLOR:-}" ]]; then
    C_BOLD=$'\033[1m' C_DIM=$'\033[2m' C_GREEN=$'\033[32m'
    C_YELLOW=$'\033[33m' C_RED=$'\033[31m' C_RESET=$'\033[0m'
  fi
fi

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
  --check            Validate frontmatter, SKILLS-array sync, and README/index.html catalogs, then exit
  --update-vendor [name...]
                     Update vendor submodules to their latest upstream commit, re-link
                     their skills, stage the new pointers, and report what changed.
                     Pass vendor names to update only those (default: all).
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

# Checks every vendor submodule out at the commit the repo pins. That discards
# an update whose pointer was never staged, so say so instead of doing it quietly.
init_vendor_submodules() {
  [[ -f "$SCRIPT_DIR/.gitmodules" ]] || return 0
  echo "Initializing vendor submodules..."

  local line sha path pinned
  while IFS= read -r line; do
    [[ "$line" == +* ]] || continue
    read -r sha path _ <<< "${line#+}"
    pinned=$(git -C "$SCRIPT_DIR" ls-files -s -- "$path" | awk '{print $2}')
    echo "  ${C_YELLOW}!${C_RESET} $path: checked out at ${sha:0:7}, syncing to the pinned ${pinned:0:7}"
  done < <(git -C "$SCRIPT_DIR" submodule status 2>/dev/null || true)

  local out
  if ! out=$(git -C "$SCRIPT_DIR" submodule update --init --recursive --quiet 2>&1); then
    echo "  ${C_YELLOW}Warning:${C_RESET} could not initialize vendor submodules:" >&2
    printf '%s\n' "$out" | tail -3 | sed 's/^/    /' >&2
  fi
}

# Version a vendor declares: plugin.json first, then the `version:` frontmatter
# of one of its skills. Prints nothing when it declares none.
vendor_version() {
  local root="$SCRIPT_DIR/vendor/$1" skills_subdir="$2" version="" f
  for f in "$root/.claude-plugin/plugin.json" "$root/plugin.json"; do
    [[ -f "$f" ]] || continue
    version=$(grep -o '"version": *"[^"]*"' "$f" | head -1 | sed 's/.*"\([^"]*\)"$/\1/' || true)
    [[ -z "$version" ]] || break
  done
  if [[ -z "$version" ]]; then
    for f in "$root/$skills_subdir"/SKILL.md "$root/$skills_subdir"/*/SKILL.md; do
      [[ -f "$f" ]] || continue
      version=$(awk '/^---/ { n++; next }
        n == 1 && /^[[:space:]]*version:/ { sub(/^[[:space:]]*version:[[:space:]]*/, ""); print; exit }
        n >= 2 { exit }' "$f" | tr -d '"'\'' \r')
      [[ -z "$version" ]] || break
    done
  fi
  echo "$version"
}

# "v1.2.3", or "main" for a vendor that declares no version.
version_label() {
  if [[ -n "$1" ]]; then echo "v$1"; else echo "main"; fi
}

# Names of the skills a vendor ships, one per line.
vendor_skill_names() {
  local base="$SCRIPT_DIR/vendor/$1/$2" d
  [[ "$2" != "." ]] || return 0
  for d in "$base"/*/; do
    [[ ! -f "$d/SKILL.md" ]] || basename "$d"
  done
}

# Symlinks in $2 that point into vendor $1 but whose target no longer exists.
dangling_vendor_links() {
  local link target
  for link in "$2"/*; do
    [[ -L "$link" && ! -e "$link" ]] || continue
    target=$(readlink "$link")
    [[ "$target" == "../vendor/$1" || "$target" == "../vendor/$1/"* ]] || continue
    basename "$link"
  done
}

# Joins the lines of $1 into "a, b, c".
join_lines() {
  local line joined=""
  while IFS= read -r line; do
    [[ -z "$line" ]] || joined+="${joined:+, }$line"
  done <<< "$1"
  echo "$joined"
}

# Lines of $1 that are not lines of $2.
lines_not_in() {
  local line
  while IFS= read -r line; do
    [[ -n "$line" ]] || continue
    grep -qxF -- "$line" <<< "$2" || echo "$line"
  done <<< "$1"
}

# Pads $1 with spaces to $2 columns. printf's own %-Ns counts bytes, and so
# does ${#1} outside a UTF-8 locale, so the arrow is measured as one ASCII char.
pad() {
  local plain="${1//→/-}"
  local n=$(( $2 - ${#plain} ))
  if (( n > 0 )); then printf '%s%*s' "$1" "$n" ""; else printf '%s' "$1"; fi
}

# The "Version" cell of a vendor's row in the README "Vendor skills" table.
readme_vendor_version() {
  awk -F'|' -v link="](https://github.com/$1)" '
    /^## Vendor skills/ { on = 1 }
    on && index($3, link) { gsub(/^ +| +$/, "", $4); print $4; exit }
  ' "$SCRIPT_DIR/README.md"
}

# Links one vendor's skills into $2. Sets LINK_NEW (links that were missing or
# pointed elsewhere) and LINK_MISSING (pinned skills the vendor no longer
# ships), one name per line. Pass "quiet" as $3 to skip the per-skill log.
link_one_vendor() {
  local entry="$1" skills_dir="$2" quiet="${3:-}"
  LINK_NEW=""
  LINK_MISSING=""

  # Format: name:owner/repo:skills_subdir[:skill1,skill2,...]
  # The optional 4th field pins which skills to link; omit it to link them all.
  # A skills_subdir of "." means the repo root is itself one skill, linked as $vendor_name.
  local vendor_name repo skills_subdir skills_filter
  IFS=':' read -r vendor_name repo skills_subdir skills_filter <<< "$entry"
  local vendor_skills_path="$SCRIPT_DIR/vendor/$vendor_name/$skills_subdir"

  if [[ ! -d "$vendor_skills_path" ]]; then
    echo "  Warning: vendor skills not found at $vendor_skills_path (run git submodule update)" >&2
    return 0
  fi

  local skill_dirs=()
  if [[ "$skills_subdir" == "." ]]; then
    skill_dirs=("$vendor_skills_path/")
  elif [[ -n "${skills_filter:-}" ]]; then
    local wanted name
    IFS=',' read -ra wanted <<< "$skills_filter"
    for name in "${wanted[@]}"; do
      skill_dirs+=("$vendor_skills_path/$name/")
    done
  else
    skill_dirs=("$vendor_skills_path"/*/)
  fi

  if [[ "$quiet" != quiet ]]; then
    echo "  Linking $vendor_name skills ($(version_label "$(vendor_version "$vendor_name" "$skills_subdir")"))..."
  fi
  local skill_dir
  for skill_dir in "${skill_dirs[@]}"; do
    local skill_name rel_target
    if [[ "$skills_subdir" == "." ]]; then
      skill_name="$vendor_name"
      rel_target="../vendor/$vendor_name"
    else
      skill_name=$(basename "$skill_dir")
      rel_target="../vendor/$vendor_name/$skills_subdir/$skill_name"
    fi
    local link_path="$skills_dir/$skill_name"

    if [[ ! -d "$skill_dir" ]]; then
      # An unmatched glob is not a skill; a pinned name with no directory is.
      [[ -n "${skills_filter:-}" ]] || continue
      LINK_MISSING+="$skill_name"$'\n'
      if [[ "$quiet" != quiet ]]; then
        echo "    Warning: $skill_name is pinned in VENDOR_SKILLS but $vendor_name no longer ships it" >&2
      fi
      continue
    fi

    if [[ -e "$link_path" ]] && [[ ! -L "$link_path" ]]; then
      [[ "$quiet" == quiet ]] || echo "    Skipped $skill_name (local skill takes priority)"
      continue
    fi

    if [[ "$(readlink "$link_path" 2>/dev/null || true)" != "$rel_target" ]]; then
      LINK_NEW+="$skill_name"$'\n'
    fi

    # -n (no-dereference): without it, re-running over an existing symlink that
    # points at a directory makes ln create the link *inside* that directory,
    # producing nested self-symlinks inside the submodules.
    ln -sfn "$rel_target" "$link_path"
    [[ "$quiet" == quiet ]] || echo "    Linked $skill_name"
  done
}

link_vendor_skills() {
  local entry
  for entry in "${VENDOR_SKILLS[@]}"; do
    link_one_vendor "$entry" "$1"
  done
}

# One line of detail under a vendor's row in the update report.
vendor_note() {
  echo "      $1 $2"
}

update_vendor() {
  if [[ ! -f "$SCRIPT_DIR/.gitmodules" ]] || ! git -C "$SCRIPT_DIR" rev-parse --git-dir &>/dev/null; then
    echo "Error: --update-vendor only works inside a git clone of $REPO_URL." >&2
    return 1
  fi

  local -a entries=()
  local entry name found
  if [[ ${#VENDOR_ONLY[@]} -eq 0 ]]; then
    entries=("${VENDOR_SKILLS[@]}")
  else
    for name in "${VENDOR_ONLY[@]}"; do
      found=""
      for entry in "${VENDOR_SKILLS[@]}"; do
        [[ "${entry%%:*}" != "$name" ]] || found="$entry"
      done
      if [[ -z "$found" ]]; then
        echo "Error: unknown vendor '$name'. Known vendors:" >&2
        for entry in "${VENDOR_SKILLS[@]}"; do echo "  ${entry%%:*}" >&2; done
        return 1
      fi
      entries+=("$found")
    done
  fi

  local name_width=0
  for entry in "${entries[@]}"; do
    name="${entry%%:*}"
    if (( ${#name} > name_width )); then name_width=${#name}; fi
  done

  local noun="vendors"
  [[ ${#entries[@]} -ne 1 ]] || noun="vendor"
  echo "${C_BOLD}Updating ${#entries[@]} $noun from upstream${C_RESET}"
  echo ""

  local updated=0 failed=0 attention=0
  for entry in "${entries[@]}"; do
    local vendor_name repo skills_subdir skills_filter
    IFS=':' read -r vendor_name repo skills_subdir skills_filter <<< "$entry"
    local path="vendor/$vendor_name" dir="$SCRIPT_DIR/vendor/$vendor_name"
    local padded_name
    padded_name=$(pad "$vendor_name" "$name_width")

    # An uninitialized submodule is an empty directory, where git would answer
    # for the parent repo instead.
    local old_sha="" old_version="" old_skills=""
    if [[ -e "$dir/.git" ]]; then
      old_sha=$(git -C "$dir" rev-parse HEAD)
      old_version=$(vendor_version "$vendor_name" "$skills_subdir")
      old_skills=$(vendor_skill_names "$vendor_name" "$skills_subdir")
    fi

    if [[ "$IS_TTY" = true ]]; then
      printf '  %s %s  %s' "${C_DIM}…" "$padded_name" "fetching${C_RESET}"
    fi
    local out status=0
    out=$(git -C "$SCRIPT_DIR" submodule update --init --remote --merge -- "$path" 2>&1) || status=$?
    if [[ "$IS_TTY" = true ]]; then
      printf '\r\033[K'
    fi

    if [[ $status -ne 0 ]]; then
      echo "  ${C_RED}✗${C_RESET} $padded_name  ${C_RED}update failed${C_RESET}"
      printf '%s\n' "$out" | grep -v '^[[:space:]]*$' | tail -4 | sed 's/^/      /'
      failed=$((failed + 1))
      continue
    fi

    local new_sha new_version new_skills new_date
    new_sha=$(git -C "$dir" rev-parse HEAD)
    new_version=$(vendor_version "$vendor_name" "$skills_subdir")
    new_skills=$(vendor_skill_names "$vendor_name" "$skills_subdir")
    new_date=$(git -C "$dir" log -1 --date=short --format=%cd)

    local versions
    versions=$(version_label "$new_version")
    if [[ -n "$old_sha" && "$old_version" != "$new_version" ]]; then
      versions="$(version_label "$old_version") → $versions"
    fi
    versions=$(pad "$versions" 20)

    if [[ "$old_sha" == "$new_sha" ]]; then
      echo "  ${C_DIM}✓ $padded_name  $versions  up to date${C_RESET}"
    elif [[ -z "$old_sha" ]]; then
      echo "  ${C_GREEN}↑${C_RESET} $padded_name  $versions  ${C_GREEN}cloned${C_RESET} at ${new_sha:0:7} ($new_date)"
      updated=$((updated + 1))
    else
      local count commits="commits"
      count=$(git -C "$dir" rev-list --count "$old_sha..$new_sha")
      [[ "$count" != 1 ]] || commits="commit"
      echo "  ${C_GREEN}↑${C_RESET} ${C_BOLD}$padded_name${C_RESET}  $versions  ${C_GREEN}$count new $commits${C_RESET}  ${C_DIM}${old_sha:0:7}..${new_sha:0:7}  $new_date${C_RESET}"
      updated=$((updated + 1))
    fi

    # Staged right away: every other install.sh run checks submodules out at
    # the staged pointer, which would silently undo this update.
    git -C "$SCRIPT_DIR" add -- "$path"

    link_one_vendor "$entry" "$SCRIPT_DIR/skills" quiet

    local skill added="" removed=""
    if [[ -n "$old_sha" ]]; then
      added=$(lines_not_in "$new_skills" "$old_skills")
      removed=$(lines_not_in "$old_skills" "$new_skills")
    fi
    local linked="" unlinked="" shadowed=""
    while IFS= read -r skill; do
      [[ -n "$skill" ]] || continue
      if [[ -L "$SCRIPT_DIR/skills/$skill" ]]; then
        linked+="$skill"$'\n'
      elif [[ -e "$SCRIPT_DIR/skills/$skill" ]]; then
        shadowed+="$skill"$'\n'
      else
        unlinked+="$skill"$'\n'
      fi
    done <<< "$added"
    # A link that is new without the skill being new upstream: a restored or
    # re-pointed symlink, or a skill just added to the VENDOR_SKILLS pin.
    linked+=$(lines_not_in "$LINK_NEW" "$added")
    if [[ -n "$linked" ]]; then
      attention=$((attention + 1))
      vendor_note "${C_GREEN}+${C_RESET}" "linked into skills/: ${C_BOLD}$(join_lines "$linked")${C_RESET}"
      vendor_note " " "each needs a README.md row and an index.html card (./install.sh --check lists what is missing)"
    fi
    if [[ -n "$unlinked" ]]; then
      vendor_note "${C_DIM}+${C_RESET}" "new upstream, not linked: $(join_lines "$unlinked")"
      vendor_note " " "${C_DIM}add a name to the $vendor_name entry in VENDOR_SKILLS to link it${C_RESET}"
    fi
    if [[ -n "$shadowed" ]]; then
      vendor_note "${C_DIM}+${C_RESET}" "new upstream, hidden by your own skill of the same name: $(join_lines "$shadowed")"
    fi
    while IFS= read -r skill; do
      [[ -n "$skill" ]] || continue
      vendor_note "${C_DIM}-${C_RESET}" "upstream removed or renamed $skill"
    done <<< "$removed"
    while IFS= read -r skill; do
      [[ -n "$skill" ]] || continue
      attention=$((attention + 1))
      vendor_note "${C_RED}!${C_RESET}" "skills/$skill is a dangling symlink: re-point or delete it, then fix VENDOR_SKILLS, README.md and index.html"
    done < <(dangling_vendor_links "$vendor_name" "$SCRIPT_DIR/skills")
  done

  echo ""
  local summary="$updated updated, $(( ${#entries[@]} - updated - failed )) up to date"
  [[ $failed -eq 0 ]] || summary+=", ${C_RED}$failed failed${C_RESET}"
  echo "$summary."

  # Everything below covers every staged vendor pointer, so a second run still
  # says what is left to do after an earlier one already pulled the updates.
  local staged
  staged=$(git -C "$SCRIPT_DIR" diff --cached --name-only -- vendor)
  if [[ -z "$staged" ]]; then
    [[ $failed -eq 0 ]] || return 1
    return 0
  fi

  local -a pending=()
  local readme_rows="" last_label=""
  for entry in "${VENDOR_SKILLS[@]}"; do
    local vendor_name repo skills_subdir skills_filter
    IFS=':' read -r vendor_name repo skills_subdir skills_filter <<< "$entry"
    grep -qxF -- "vendor/$vendor_name" <<< "$staged" || continue
    pending+=("$vendor_name")

    local version current wanted
    version=$(vendor_version "$vendor_name" "$skills_subdir")
    last_label="v$version"
    [[ -n "$version" ]] || last_label=$(git -C "$SCRIPT_DIR/vendor/$vendor_name" rev-parse --short HEAD)
    wanted="$(version_label "$version") ($(git -C "$SCRIPT_DIR/vendor/$vendor_name" log -1 --date=short --format=%cd))"
    current=$(readme_vendor_version "$repo")
    if [[ "$current" != "$wanted" ]]; then
      readme_rows+="       $(pad "$vendor_name" "$name_width")  ${C_DIM}$(pad "${current:-(no row)}" 26)${C_RESET}  →  ${C_BOLD}$wanted${C_RESET}"$'\n'
    fi
  done

  if [[ ${#pending[@]} -eq 0 ]]; then
    [[ $failed -eq 0 ]] || return 1
    return 0
  fi

  echo ""
  echo "${C_BOLD}Staged${C_RESET} ${C_DIM}(undo one with: git restore --staged vendor/<name> && git submodule update vendor/<name>)${C_RESET}"
  for name in "${pending[@]}"; do
    echo "  vendor/$name"
  done

  echo ""
  echo "${C_BOLD}Catalog check${C_RESET}"
  local catalogs_ok=true
  check_skills || catalogs_ok=false

  local message joined
  printf -v joined '%s, ' "${pending[@]}"
  message="update vendor skills: ${joined%, }"
  [[ ${#pending[@]} -ne 1 ]] || message="update ${pending[0]} to $last_label"

  echo ""
  echo "${C_BOLD}Next steps${C_RESET}"
  local step=1
  if [[ -n "$readme_rows" ]]; then
    echo "  $step. Refresh the \"Vendor skills\" table in README.md:"
    printf '%s' "$readme_rows"
    step=$((step + 1))
  fi
  if [[ "$catalogs_ok" = false || $attention -gt 0 ]]; then
    echo "  $step. Fix what is flagged above (catalog rows, dangling links), then re-run ./install.sh --check"
    step=$((step + 1))
  fi
  echo "  $step. Commit:"
  echo "       git add skills README.md index.html install.sh"
  echo "       git commit -m \"$message\""

  [[ $failed -eq 0 ]] || return 1
}

in_array() {
  local needle="$1"; shift
  local item
  for item in "$@"; do
    [[ "$item" == "$needle" ]] && return 0
  done
  return 1
}

# Validate every own skill (directory with a SKILL.md), that the SKILLS array
# stays in sync with the directories on disk, and that README.md and index.html
# catalog every skill (own and vendor). Returns non-zero on any problem so it
# can gate CI.
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

  # Every skill on disk (own directories and vendor symlinks alike) must be
  # listed in the README catalog and in index.html, and the skill counts those
  # two files advertise must match what is on disk. Vendor symlinks count even
  # when their target is missing (CI checks out without submodules).
  local readme="$SCRIPT_DIR/README.md" index="$SCRIPT_DIR/index.html"
  local total=0 listed item
  for item in "$src"/*; do
    [[ -d "$item" || -L "$item" ]] || continue
    skill_name="$(basename "$item")"
    total=$((total + 1))
    if ! grep -qF "](skills/$skill_name/SKILL.md)" "$readme"; then
      echo "  ✗ $skill_name: not listed in the README.md skill catalog"
      errors=$((errors + 1))
    fi
    if ! grep -qF "href=\"skills/$skill_name/SKILL.md\"" "$index"; then
      echo "  ✗ $skill_name: not listed in index.html"
      errors=$((errors + 1))
    fi
  done
  while read -r listed; do
    [[ -d "$src/$listed" || -L "$src/$listed" ]] || {
      echo "  ✗ $listed: in README.md but no skills/$listed directory"
      errors=$((errors + 1))
    }
  done < <(grep -o '](skills/[^/]*/SKILL.md)' "$readme" | sed 's#](skills/##;s#/SKILL.md)##')
  while read -r listed; do
    [[ -d "$src/$listed" || -L "$src/$listed" ]] || {
      echo "  ✗ $listed: in index.html but no skills/$listed directory"
      errors=$((errors + 1))
    }
  done < <(grep -o 'href="skills/[^/]*/SKILL.md"' "$index" | sed 's#href="skills/##;s#/SKILL.md"##')

  local badge tagline
  badge="$(grep -o 'badge/skills-[0-9]*-' "$readme" | head -1 | tr -dc '0-9')"
  if [[ "$badge" != "$total" ]]; then
    echo "  ✗ README.md skills badge says ${badge:-?} but skills/ has $total entries"
    errors=$((errors + 1))
  fi
  tagline="$(grep -o '<p class="tagline">[0-9]*' "$index" | head -1 | tr -dc '0-9')"
  if [[ "$tagline" != "$total" ]]; then
    echo "  ✗ index.html tagline says ${tagline:-?} skills but skills/ has $total entries"
    errors=$((errors + 1))
  fi

  if [[ $errors -eq 0 ]]; then
    echo "OK: ${#dir_skills[@]} own skills valid and in sync with the SKILLS array; README.md and index.html list all $total skills."
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
      --update-vendor)
        UPDATE_VENDOR=true; shift
        while [[ $# -gt 0 && "$1" != -* ]]; do VENDOR_ONLY+=("$1"); shift; done
        ;;
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

  # The SKILLS array only lists own skills, so vendor skills (the symlinks just
  # created in $source_dir) need their own pass to reach the target.
  if [[ "$SYMLINK" = true && "$INSTALL_ALL" = true ]]; then
    echo ""
    echo "Linking vendor skills into $TARGET_DIR..."
    local link
    for link in "$source_dir"/*; do
      [[ -L "$link" ]] || continue
      install_skill "$source_dir" "$(basename "$link")" "$TARGET_DIR"
    done
  fi

  echo ""
  echo "Done."
}

main "$@"
