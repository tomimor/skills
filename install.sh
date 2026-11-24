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
SELECTED_SKILLS=()
EXISTING_POLICY=ask   # what to do with a skill already in the target: ask | overwrite | skip
INSTALL_RESULT=""

# ── Terminal UI ──────────────────────────────────────────────────────────────
# Colors, spinners and progress bars need stdout to be a terminal. Arrow-key
# menus also need a keyboard, read from /dev/tty (fd 3) so they still work under
# `curl ... | bash`, where stdin is the script itself. Piped and CI output stays
# plain text with no escape codes.
IS_TTY=false
INTERACTIVE=false
TRUECOLOR=false
UTF8_LOCALE=false
CURSOR_HIDDEN=false
BANNER_SHOWN=false
SPIN_TMP=""
STTY_SAVED=""
RUN_OUT=""
KEY=""
MENU_INDEX=0
PICKED=""
TERM_ROWS=24
TERM_COLS=80
C_BOLD="" C_DIM="" C_GREEN="" C_YELLOW="" C_RED="" C_ACCENT="" C_RESET=""
if [[ -t 1 && "${TERM:-dumb}" != dumb ]]; then
  IS_TTY=true
  if [[ -z "${NO_COLOR:-}" ]]; then
    C_BOLD=$'\033[1m' C_DIM=$'\033[2m' C_GREEN=$'\033[32m' C_YELLOW=$'\033[33m'
    C_RED=$'\033[31m' C_ACCENT=$'\033[38;5;75m' C_RESET=$'\033[0m'
    case "${COLORTERM:-}" in truecolor|24bit) TRUECOLOR=true ;; esac
  fi
  if (: </dev/tty) 2>/dev/null; then
    exec 3</dev/tty
    INTERACTIVE=true
  fi
fi
case "${LC_ALL:-${LC_CTYPE:-${LANG:-}}}" in
  *[Uu][Tt][Ff]-8*|*[Uu][Tt][Ff]8*) UTF8_LOCALE=true ;;
esac

# Keys pressed while a spinner runs would be echoed across it, so echo is
# switched off for its duration. They stay queued for the next menu.
mute_keys() {
  [[ "$INTERACTIVE" = true ]] || return 0
  STTY_SAVED=$(stty -g <&3 2>/dev/null || true)
  stty -echo <&3 2>/dev/null || true
}

unmute_keys() {
  if [[ -n "$STTY_SAVED" ]]; then stty "$STTY_SAVED" <&3 2>/dev/null || true; fi
  STTY_SAVED=""
}

cleanup() {
  unmute_keys
  if [[ "$CURSOR_HIDDEN" = true ]]; then printf '\033[?25h'; fi
  if [[ -n "$SPIN_TMP" ]]; then rm -f "$SPIN_TMP"; fi
  if [[ -n "$CLEANUP_TMP" ]]; then rm -rf "$CLEANUP_TMP"; fi
}
trap cleanup EXIT
trap 'echo ""; exit 130' INT

hide_cursor() { printf '\033[?25l'; CURSOR_HIDDEN=true; }
show_cursor() { printf '\033[?25h'; CURSOR_HIDDEN=false; }

ok()   { echo "  ${C_GREEN}✓${C_RESET} $1"; }
warn() { echo "  ${C_YELLOW}!${C_RESET} $1" >&2; }

# "~/x" for a path under $HOME. Built by hand: a "~" in a ${var/pat/repl}
# replacement is tilde-expanded straight back by some bash versions.
tilde() {
  if [[ "$1" == "$HOME"/* ]]; then printf '~%s' "${1#"$HOME"}"; else printf '%s' "$1"; fi
}

# Pads $1 with spaces to $2 columns. printf's own %-Ns counts bytes, and so
# does ${#1} outside a UTF-8 locale, so the arrow is measured as one ASCII char.
pad() {
  local plain="${1//→/-}"
  local n=$(( $2 - ${#plain} ))
  if (( n > 0 )); then printf '%s%*s' "$1" "$n" ""; else printf '%s' "$1"; fi
}

# Cuts $1 down to $2 characters, marking the cut.
fit() {
  if (( ${#1} > $2 )); then printf '%s...' "${1:0:$(( $2 > 3 ? $2 - 3 : 0 ))}"; else printf '%s' "$1"; fi
}

# Prints $1 with a blue-to-violet gradient, one color step per character.
# Slicing a string per character only works on multibyte text in a UTF-8
# locale, so anything else non-ASCII gets the flat accent color instead.
gradient() {
  local text="$1" n=${#1} i out="" span
  if [[ -z "$C_RESET" ]]; then printf '%s' "$text"; return; fi
  if [[ "$UTF8_LOCALE" = false && "$text" == *[!\ -~]* ]]; then
    printf '%s%s%s' "$C_ACCENT" "$text" "$C_RESET"
    return
  fi
  local -a steps=(75 69 105 141 177)
  span=$(( n > 1 ? n - 1 : 1 ))
  for (( i = 0; i < n; i++ )); do
    if [[ "$TRUECOLOR" = true ]]; then
      out+=$'\033[38;2;'"$(( 68 + 127 * i / span ));$(( 147 - 43 * i / span ));$(( 248 - 6 * i / span ))m"
    else
      out+=$'\033[38;5;'"${steps[i * 5 / n]}m"
    fi
    out+="${text:i:1}"
  done
  printf '%s%s' "$out" "$C_RESET"
}

# Reads the terminal size into TERM_ROWS and TERM_COLS; 24x80 when unknown.
term_size() {
  local size
  [[ "$INTERACTIVE" = true ]] || return 0
  if size=$(stty size <&3 2>/dev/null) && [[ "$size" == *" "* ]]; then
    TERM_ROWS=${size% *}
    TERM_COLS=${size#* }
  fi
}

banner() {
  if [[ "$IS_TTY" = false || "$BANNER_SHOWN" = true ]]; then return 0; fi
  BANNER_SHOWN=true
  local line2="Agent skills for Cursor and Claude Code"
  local line3="${#SKILLS[@]} own skills · ${#VENDOR_SKILLS[@]} vendor packs"
  term_size
  if (( TERM_COLS >= 84 )); then line3+=" · ${REPO_URL#https://}"; fi
  if (( TERM_COLS < 64 )); then line2="" line3=""; fi
  echo ""
  echo "  $(gradient '┌─┐┬┌─┬┬  ┬  ┌─┐')"
  echo "  $(gradient '└─┐├┴┐││  │  └─┐')   ${C_BOLD}$line2${C_RESET}"
  echo "  $(gradient '└─┘┴ ┴┴┴─┘┴─┘└─┘')   ${C_DIM}$line3${C_RESET}"
  echo ""
}

# One-line header for a subcommand. Terminal only; plain runs print their own.
title() {
  if [[ "$IS_TTY" = false || "$BANNER_SHOWN" = true ]]; then return 0; fi
  BANNER_SHOWN=true
  echo ""
  echo "  $(gradient '✦ skills') ${C_DIM}·${C_RESET} ${C_BOLD}$1${C_RESET}"
  echo ""
}

finish() {
  local took=""
  if (( SECONDS >= 2 )); then took=" ${C_DIM}in ${SECONDS}s${C_RESET}"; fi
  echo ""
  if [[ "$IS_TTY" = true ]]; then
    echo "  ${C_GREEN}${C_BOLD}Done${C_RESET}$took"
  else
    echo "Done."
  fi
}

# Runs "${@:2}" behind a spinner labelled $1. The command's output lands in
# RUN_OUT and its exit status is returned. Without a terminal it just runs.
spin() {
  local label="$1"; shift
  local status=0
  if [[ "$IS_TTY" = false ]]; then
    RUN_OUT=$("$@" 2>&1) || status=$?
    return $status
  fi

  local -a frames=(⠋ ⠙ ⠹ ⠸ ⠼ ⠴ ⠦ ⠧ ⠇ ⠏)
  local i=0 started=$SECONDS pid elapsed
  SPIN_TMP=$(mktemp)
  "$@" > "$SPIN_TMP" 2>&1 &
  pid=$!
  mute_keys
  hide_cursor
  while kill -0 "$pid" 2>/dev/null; do
    elapsed=""
    if (( SECONDS - started >= 3 )); then elapsed=" $(( SECONDS - started ))s"; fi
    printf '\r\033[K  %s%s%s %s%s%s' "$C_ACCENT" "${frames[i % 10]}" "$C_RESET" "$label" "$C_DIM" "$elapsed$C_RESET"
    i=$((i + 1))
    sleep 0.08
  done
  wait "$pid" || status=$?
  printf '\r\033[K'
  show_cursor
  unmute_keys
  RUN_OUT=$(cat "$SPIN_TMP")
  rm -f "$SPIN_TMP"
  SPIN_TMP=""
  return $status
}

# Redraws a one-line progress bar: $1 done of $2, working on $3.
progress() {
  local width=24 filled=$(( $1 * 24 / $2 )) full="" empty="" i
  for (( i = 0; i < width; i++ )); do
    if (( i < filled )); then full+="█"; else empty+="░"; fi
  done
  printf '\r\033[K  %s%s%s%s%s  %s/%s  %s' "$C_ACCENT" "$full" "$C_DIM" "$empty" "$C_RESET" "$1" "$2" "$3"
}

# Reads one keypress from the terminal into KEY: up, down, pgup, pgdn, home,
# end, enter, space, esc, or the character itself.
read_key() {
  local k="" rest=""
  if ! IFS= read -rsn1 k <&3; then KEY=esc; return 0; fi
  case "$k" in
    $'\033')
      # An arrow key is ESC plus two more bytes. A lone ESC has nothing behind
      # it, hence the timeout (whole seconds: bash 3.2 takes no fractions).
      IFS= read -rsn2 -t 1 rest <&3 || rest=""
      case "$rest" in
        '[A'|'OA') KEY=up ;;
        '[B'|'OB') KEY=down ;;
        '[H'|'OH') KEY=home ;;
        '[F'|'OF') KEY=end ;;
        '[5') IFS= read -rsn1 -t 1 rest <&3 || true; KEY=pgup ;;
        '[6') IFS= read -rsn1 -t 1 rest <&3 || true; KEY=pgdn ;;
        *) KEY=esc ;;
      esac ;;
    "") KEY=enter ;;
    " ") KEY=space ;;
    *) KEY="$k" ;;
  esac
}

# Erases the $1 lines just drawn and leaves, for a menu the user backed out of.
cancel_menu() {
  printf '\033[%dA\033[J' "$1"
  show_cursor
  echo "  ${C_DIM}Cancelled. Nothing was changed.${C_RESET}"
  exit 0
}

# Arrow-key single choice. $1 is the question, the rest are "label|hint" items.
# Sets MENU_INDEX to the chosen item; exits if the user backs out.
menu_select() {
  local question="$1"; shift
  local n=$# cur=0 i item width=0 room
  local -a labels=() hints=()
  term_size
  for item in "$@"; do
    item="${item%%|*}"
    if (( ${#item} > width )); then width=${#item}; fi
  done
  room=$(( TERM_COLS - width - 8 ))
  for item in "$@"; do
    labels+=("$(pad "${item%%|*}" "$width")")
    if (( room < 12 )); then hints+=(""); else hints+=("$(fit "${item#*|}" "$room")"); fi
  done

  hide_cursor
  echo "  ${C_ACCENT}?${C_RESET} ${C_BOLD}$question${C_RESET}  ${C_DIM}↑↓ move · enter select · q quit${C_RESET}"
  while true; do
    for (( i = 0; i < n; i++ )); do
      if (( i == cur )); then
        printf '\033[K  %s❯ %s%s%s  %s%s%s\n' "$C_ACCENT" "$C_BOLD" "${labels[i]}" "$C_RESET" "$C_DIM" "${hints[i]}" "$C_RESET"
      else
        printf '\033[K    %s  %s%s%s\n' "${labels[i]}" "$C_DIM" "${hints[i]}" "$C_RESET"
      fi
    done
    read_key
    case "$KEY" in
      up|k) cur=$(( (cur + n - 1) % n )) ;;
      down|j) cur=$(( (cur + 1) % n )) ;;
      home) cur=0 ;;
      end) cur=$(( n - 1 )) ;;
      enter|space) break ;;
      q|esc) cancel_menu $(( n + 1 )) ;;
      [1-9]) if (( KEY <= n )); then cur=$(( KEY - 1 )); break; fi ;;
    esac
    printf '\033[%dA' "$n"
  done

  printf '\033[%dA\033[J' $(( n + 1 ))
  show_cursor
  item="${labels[cur]}"
  ok "$question ${C_DIM}·${C_RESET} ${C_ACCENT}${item%"${item##*[! ]}"}${C_RESET}"
  MENU_INDEX=$cur
  SECONDS=0
}

# Arrow-key checklist. $1 is the question, the rest are "label|hint" items.
# Sets PICKED to the chosen indices, space-separated; exits if the user backs out.
multi_select() {
  local question="$1"; shift
  local n=$# cur=0 top=0 count=0 i item width=0 room rows note="" more below keys
  local -a labels=() hints=() on=()
  term_size
  for item in "$@"; do
    item="${item%%|*}"
    if (( ${#item} > width )); then width=${#item}; fi
  done
  room=$(( TERM_COLS - width - 10 ))
  for item in "$@"; do
    labels+=("$(pad "${item%%|*}" "$width")")
    if (( room < 12 )); then hints+=(""); else hints+=("$(fit "${item#*|}" "$room")"); fi
    on+=(0)
  done
  rows=$(( TERM_ROWS - 6 ))
  if (( rows > 16 )); then rows=16; fi
  if (( rows < 4 )); then rows=4; fi
  if (( rows > n )); then rows=$n; fi
  keys="space toggle · a all · enter confirm · q quit"
  if (( TERM_COLS < 96 )); then keys="space · a all · enter · q quit"; fi

  hide_cursor
  echo "  ${C_ACCENT}?${C_RESET} ${C_BOLD}$question${C_RESET}"
  while true; do
    if (( cur < top )); then top=$cur; fi
    if (( cur >= top + rows )); then top=$(( cur - rows + 1 )); fi
    for (( i = top; i < top + rows; i++ )); do
      local box="${C_DIM}◯${C_RESET}" pointer=" " weight=""
      if (( on[i] == 1 )); then box="${C_GREEN}◉${C_RESET}"; fi
      if (( i == cur )); then pointer="${C_ACCENT}❯${C_RESET}"; weight="$C_BOLD"; fi
      printf '\033[K  %s %s %s%s%s  %s%s%s\n' "$pointer" "$box" "$weight" "${labels[i]}" "$C_RESET" "$C_DIM" "${hints[i]}" "$C_RESET"
    done
    more=""
    below=$(( n - top - rows ))
    if (( top > 0 )); then more+=" · ↑ $top more"; fi
    if (( below > 0 )); then more+=" · ↓ $below more"; fi
    if [[ -n "$note" ]]; then
      printf '\033[K  %s%s%s\n' "$C_YELLOW" "$note" "$C_RESET"
    else
      printf '\033[K  %s%s selected · %s%s%s\n' "$C_DIM" "$count" "$keys" "$more" "$C_RESET"
    fi

    read_key
    note=""
    case "$KEY" in
      up|k) cur=$(( (cur + n - 1) % n )) ;;
      down|j) cur=$(( (cur + 1) % n )) ;;
      pgup) cur=$(( cur - rows > 0 ? cur - rows : 0 )) ;;
      pgdn) cur=$(( cur + rows < n ? cur + rows : n - 1 )) ;;
      home|g) cur=0 ;;
      end|G) cur=$(( n - 1 )) ;;
      space)
        if (( on[cur] == 1 )); then on[cur]=0; count=$(( count - 1 )); else on[cur]=1; count=$(( count + 1 )); fi ;;
      a)
        local value=1
        if (( count == n )); then value=0; fi
        for (( i = 0; i < n; i++ )); do on[i]=$value; done
        count=$(( value * n )) ;;
      enter)
        if (( count > 0 )); then break; fi
        note="Nothing selected yet: press space on a row, or a for all." ;;
      q|esc) cancel_menu $(( rows + 2 )) ;;
    esac
    printf '\033[%dA' $(( rows + 1 ))
  done

  printf '\033[%dA\033[J' $(( rows + 2 ))
  show_cursor
  PICKED=""
  for (( i = 0; i < n; i++ )); do
    if (( on[i] == 1 )); then PICKED+="$i "; fi
  done
  ok "$question ${C_DIM}·${C_RESET} ${C_ACCENT}$count selected${C_RESET}"
  SECONDS=0
}

usage() {
  banner
  local b="$C_BOLD" a="$C_ACCENT" d="$C_DIM" r="$C_RESET" entry
  echo "${b}Usage:${r} install.sh [OPTIONS]"
  echo ""
  echo "Install agent skills to your Cursor or Claude Code skills directory."
  echo "Run it with no options for an interactive menu."
  echo ""
  echo "${b}Options:${r}"
  while IFS='|' read -r flag text; do
    printf '  %s%-26s%s %s\n' "$a" "$flag" "$r" "$text"
  done <<'EOF'
--all|Install all skills (non-interactive)
--skill <name>|Install a single skill by name
--target <dir>|Override the install directory
--force|Overwrite existing skills without confirming
--symlink|Symlink skills into the target instead of copying
|(live edits)
--self|Wire this repo into your own ~/.cursor and ~/.claude
|(edit-once symlinks)
--check|Validate frontmatter, SKILLS-array sync, and the
|README/index.html catalogs, then exit
--update-vendor [name...]|Update vendor submodules to their latest upstream
|(all, or only the named ones), re-link their skills,
|stage the pointers, and report what changed
-h, --help|Show this help message
EOF
  echo ""
  # On a terminal, cut descriptions so each skill stays on one line.
  local text room=0
  if [[ "$INTERACTIVE" = true ]]; then
    term_size
    room=$(( TERM_COLS - 34 ))
  fi
  echo "${b}Available skills:${r}"
  for entry in "${SKILLS[@]}"; do
    text="${entry#*:}"
    if (( room >= 20 )); then text=$(fit "$text" "$room"); fi
    printf '  %s%-30s%s %s%s%s\n' "$a" "${entry%%:*}" "$r" "$d" "$text" "$r"
  done
  echo ""
  echo "${b}Vendor skills (via git submodules):${r}"
  for entry in "${VENDOR_SKILLS[@]}"; do
    local rest="${entry#*:}"
    printf '  %s%-30s%s %s%s%s\n' "$a" "${entry%%:*}" "$r" "$d" "https://github.com/${rest%%:*}" "$r"
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
  local answer
  printf "  Skill already exists at %s. Overwrite? [y/N] " "$1"
  read -r answer
  [[ "$answer" =~ ^[Yy]$ ]]
}

# Sets SOURCE_DIR to the skills directory. When run outside the repo, clones it
# to a temp dir that the EXIT trap removes.
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
  if [[ "$IS_TTY" = false ]]; then echo "Downloading skills from $REPO_URL..." >&2; fi
  if ! spin "Downloading skills from ${REPO_URL#https://}" git clone --depth 1 --quiet "$REPO_URL" "$CLEANUP_TMP/repo"; then
    echo "Error: could not download $REPO_URL" >&2
    printf '%s\n' "$RUN_OUT" | tail -3 | sed 's/^/  /' >&2
    exit 1
  fi
  if [[ "$IS_TTY" = true ]]; then ok "Downloaded the latest skills"; fi
  SOURCE_DIR="$CLEANUP_TMP/repo/skills"
}

# Checks every vendor submodule out at the commit the repo pins. That discards
# an update whose pointer was never staged, so say so instead of doing it quietly.
init_vendor_submodules() {
  [[ -f "$SCRIPT_DIR/.gitmodules" ]] || return 0
  if [[ "$IS_TTY" = false ]]; then echo "Initializing vendor submodules..."; fi

  local line sha path pinned
  while IFS= read -r line; do
    [[ "$line" == +* ]] || continue
    read -r sha path _ <<< "${line#+}"
    pinned=$(git -C "$SCRIPT_DIR" ls-files -s -- "$path" | awk '{print $2}')
    echo "  ${C_YELLOW}!${C_RESET} $path: checked out at ${sha:0:7}, syncing to the pinned ${pinned:0:7}"
  done < <(git -C "$SCRIPT_DIR" submodule status 2>/dev/null || true)

  if spin "Syncing vendor submodules" git -C "$SCRIPT_DIR" submodule update --init --recursive --quiet; then
    if [[ "$IS_TTY" = true ]]; then ok "Vendor submodules in sync"; fi
  else
    warn "Could not initialize vendor submodules:"
    printf '%s\n' "$RUN_OUT" | tail -3 | sed 's/^/    /' >&2
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

# The "Version" cell of a vendor's row in the README "Vendor skills" table.
readme_vendor_version() {
  awk -F'|' -v link="](https://github.com/$1)" '
    /^## Vendor skills/ { on = 1 }
    on && index($3, link) { gsub(/^ +| +$/, "", $4); print $4; exit }
  ' "$SCRIPT_DIR/README.md"
}

# Links one vendor's skills into $2. Sets LINK_NEW (links that were missing or
# pointed elsewhere) and LINK_MISSING (pinned skills the vendor no longer
# ships), one name per line. Prints nothing: callers report.
link_one_vendor() {
  local entry="$1" skills_dir="$2"
  LINK_NEW=""
  LINK_MISSING=""

  # Format: name:owner/repo:skills_subdir[:skill1,skill2,...]
  # The optional 4th field pins which skills to link; omit it to link them all.
  # A skills_subdir of "." means the repo root is itself one skill, linked as $vendor_name.
  local vendor_name repo skills_subdir skills_filter
  IFS=':' read -r vendor_name repo skills_subdir skills_filter <<< "$entry"
  local vendor_skills_path="$SCRIPT_DIR/vendor/$vendor_name/$skills_subdir"

  if [[ ! -d "$vendor_skills_path" ]]; then
    warn "vendor skills not found at $vendor_skills_path (run git submodule update)"
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
      continue
    fi

    # An own skill of the same name takes priority over the vendor's.
    if [[ -e "$link_path" ]] && [[ ! -L "$link_path" ]]; then
      continue
    fi

    if [[ "$(readlink "$link_path" 2>/dev/null || true)" != "$rel_target" ]]; then
      LINK_NEW+="$skill_name"$'\n'
    fi

    # -n (no-dereference): without it, re-running over an existing symlink that
    # points at a directory makes ln create the link *inside* that directory,
    # producing nested self-symlinks inside the submodules.
    ln -sfn "$rel_target" "$link_path"
  done
}

# Links every vendor's skills into $1 and prints one summary line.
link_vendor_skills() {
  local entry skill link count=0
  for entry in "${VENDOR_SKILLS[@]}"; do
    link_one_vendor "$entry" "$1"
    while IFS= read -r skill; do
      [[ -n "$skill" ]] || continue
      warn "$skill is pinned in VENDOR_SKILLS but ${entry%%:*} no longer ships it"
    done <<< "$LINK_MISSING"
  done
  for link in "$1"/*; do
    if [[ -L "$link" ]]; then count=$((count + 1)); fi
  done
  ok "$count vendor skills linked into skills/ ${C_DIM}(${#VENDOR_SKILLS[@]} packs)${C_RESET}"
}

# One line of detail under a vendor's row in the update report.
vendor_note() {
  echo "      $1 $2"
}

# The lines of $1 as a comma-separated list under a vendor note, wrapped to
# the terminal so a long list of skills does not run off the edge.
vendor_names() {
  join_lines "$1" | fold -s -w $(( TERM_COLS > 52 ? TERM_COLS - 12 : 68 )) | sed 's/^/          /;s/ *$//'
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
  term_size
  title "Updating ${#entries[@]} $noun from upstream"
  if [[ "$IS_TTY" = false ]]; then
    echo "Updating ${#entries[@]} $noun from upstream"
    echo ""
  fi

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

    local out status=0
    spin "$padded_name  fetching upstream" \
      git -C "$SCRIPT_DIR" submodule update --init --remote --merge -- "$path" || status=$?
    out="$RUN_OUT"

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

    link_one_vendor "$entry" "$SCRIPT_DIR/skills"

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
      vendor_note "${C_GREEN}+${C_RESET}" "linked into skills/:"
      vendor_names "$linked"
      vendor_note " " "${C_YELLOW}each needs a README.md row and an index.html card${C_RESET}"
    fi
    if [[ -n "$unlinked" ]]; then
      vendor_note "${C_DIM}+${C_RESET}" "new upstream, not linked:"
      vendor_names "$unlinked"
      vendor_note " " "${C_DIM}add a name to the $vendor_name entry in VENDOR_SKILLS to link it${C_RESET}"
    fi
    if [[ -n "$shadowed" ]]; then
      vendor_note "${C_DIM}+${C_RESET}" "new upstream, hidden by your own skill of the same name:"
      vendor_names "$shadowed"
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
  echo "${C_BOLD}Staged${C_RESET}"
  for name in "${pending[@]}"; do
    echo "  vendor/$name"
  done
  echo "  ${C_DIM}undo one: git restore --staged vendor/<name> && git submodule update vendor/<name>${C_RESET}"

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
      echo "  ${C_RED}✗${C_RESET} $skill_name: missing SKILL.md"
      errors=$((errors + 1))
      continue
    fi

    decl_name="$(sed -n 's/^name:[[:space:]]*//p' "$md" | head -1 | tr -d ' "'\''\r')"
    if [[ -z "$decl_name" ]]; then
      echo "  ${C_RED}✗${C_RESET} $skill_name: SKILL.md has no 'name:' frontmatter"
      errors=$((errors + 1))
    elif [[ "$decl_name" != "$skill_name" ]]; then
      echo "  ${C_RED}✗${C_RESET} $skill_name: frontmatter name '$decl_name' != directory name"
      errors=$((errors + 1))
    fi

    if ! grep -qE '^description:' "$md"; then
      echo "  ${C_RED}✗${C_RESET} $skill_name: SKILL.md has no 'description:' frontmatter"
      errors=$((errors + 1))
    fi
  done

  local s
  for s in "${dir_skills[@]}"; do
    in_array "$s" "${arr_skills[@]}" || {
      echo "  ${C_RED}✗${C_RESET} $s: skill directory not listed in install.sh SKILLS array"
      errors=$((errors + 1))
    }
  done
  for s in "${arr_skills[@]}"; do
    [[ -d "$src/$s" ]] || {
      echo "  ${C_RED}✗${C_RESET} $s: in SKILLS array but no skills/$s directory"
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
      echo "  ${C_RED}✗${C_RESET} $skill_name: not listed in the README.md skill catalog"
      errors=$((errors + 1))
    fi
    if ! grep -qF "href=\"skills/$skill_name/SKILL.md\"" "$index"; then
      echo "  ${C_RED}✗${C_RESET} $skill_name: not listed in index.html"
      errors=$((errors + 1))
    fi
  done
  while read -r listed; do
    [[ -d "$src/$listed" || -L "$src/$listed" ]] || {
      echo "  ${C_RED}✗${C_RESET} $listed: in README.md but no skills/$listed directory"
      errors=$((errors + 1))
    }
  done < <(grep -o '](skills/[^/]*/SKILL.md)' "$readme" | sed 's#](skills/##;s#/SKILL.md)##')
  while read -r listed; do
    [[ -d "$src/$listed" || -L "$src/$listed" ]] || {
      echo "  ${C_RED}✗${C_RESET} $listed: in index.html but no skills/$listed directory"
      errors=$((errors + 1))
    }
  done < <(grep -o 'href="skills/[^/]*/SKILL.md"' "$index" | sed 's#href="skills/##;s#/SKILL.md"##')

  local badge tagline
  badge="$(grep -o 'badge/skills-[0-9]*-' "$readme" | head -1 | tr -dc '0-9')"
  if [[ "$badge" != "$total" ]]; then
    echo "  ${C_RED}✗${C_RESET} README.md skills badge says ${badge:-?} but skills/ has $total entries"
    errors=$((errors + 1))
  fi
  tagline="$(grep -o '<p class="tagline">[0-9]*' "$index" | head -1 | tr -dc '0-9')"
  if [[ "$tagline" != "$total" ]]; then
    echo "  ${C_RED}✗${C_RESET} index.html tagline says ${tagline:-?} skills but skills/ has $total entries"
    errors=$((errors + 1))
  fi

  if [[ $errors -eq 0 ]]; then
    ok "${#dir_skills[@]} own skills valid and in sync with the SKILLS array; README.md and index.html list all $total skills."
    return 0
  fi
  echo ""
  echo "  ${C_RED}${C_BOLD}$errors problem(s) found.${C_RESET}"
  return 1
}

# Wire this repo into the author's own machine with edit-once symlinks.
# Cursor loads skills from a symlinked top-level dir, so a single dir symlink
# works there. Claude Code does NOT, so it needs per-skill symlinks instead.
install_self() {
  title "Linking this repo into this machine"
  resolve_source_dir
  local source_dir="$SOURCE_DIR"
  init_vendor_submodules
  link_vendor_skills "$source_dir"

  if [[ -d "$HOME/.cursor" ]]; then
    if [[ -e "$HOME/.cursor/skills" && ! -L "$HOME/.cursor/skills" ]]; then
      warn "Cursor: ~/.cursor/skills is a real directory, not a symlink; leaving it untouched."
    else
      ln -sfn "$source_dir" "$HOME/.cursor/skills"
      ok "Cursor       ~/.cursor/skills → $(tilde "$source_dir")"
    fi
  fi

  if [[ -d "$HOME/.claude" ]]; then
    mkdir -p "$HOME/.claude/skills"
    local entry name count=0
    for entry in "$source_dir"/*/; do
      name="$(basename "$entry")"
      ln -sfn "$source_dir/$name" "$HOME/.claude/skills/$name"
      count=$((count + 1))
    done
    ok "Claude Code  $count skills linked in ~/.claude/skills"
  fi

  if [[ ! -d "$HOME/.cursor" && ! -d "$HOME/.claude" ]]; then
    warn "Neither ~/.cursor nor ~/.claude exists, so there was nothing to link into."
  fi

  finish
}

# Installs one skill into $3. Sets INSTALL_RESULT to installed or skipped.
# Pass "quiet" as $4 when the caller reports progress itself.
install_skill() {
  local source_dir="$1" skill_name="$2" target="$3" quiet="${4:-}"
  local src="$source_dir/$skill_name"
  local dest="$target/$skill_name"

  if [[ ! -d "$src" ]]; then
    if [[ "$quiet" == quiet ]]; then printf '\r\033[K'; fi
    echo "Error: Skill '$skill_name' not found in $source_dir" >&2
    return 1
  fi

  INSTALL_RESULT=skipped
  if [[ -d "$dest" && "$FORCE" = false && "$EXISTING_POLICY" != overwrite ]]; then
    if [[ "$EXISTING_POLICY" == skip ]] || ! confirm_overwrite "$dest"; then
      [[ "$quiet" == quiet ]] || echo "  Skipped $skill_name"
      return 0
    fi
  fi

  mkdir -p "$target"
  rm -rf "$dest"
  if [[ "$SYMLINK" = true ]]; then
    ln -sfn "$src" "$dest"
    [[ "$quiet" == quiet ]] || echo "  Linked $skill_name -> $dest"
  else
    cp -r "$src" "$dest"
    [[ "$quiet" == quiet ]] || echo "  Installed $skill_name -> $dest"
  fi
  INSTALL_RESULT=installed
}

# Installs the skills named after $2 into $2. With a keyboard it asks once what
# to do with the ones already there and shows a progress bar; otherwise it logs
# one line per skill and confirms each overwrite as before.
install_many() {
  local source_dir="$1" target="$2"; shift 2
  local total=$# name existing=0 current=0 installed=0 skipped="" quiet=""

  if [[ "$INTERACTIVE" = true && "$FORCE" = false && "$EXISTING_POLICY" == ask ]]; then
    for name in "$@"; do
      if [[ -d "$target/$name" ]]; then existing=$((existing + 1)); fi
    done
    if (( existing > 0 )); then
      menu_select "$existing of $total already exist in $(tilde "$target")" \
        "Overwrite|replace them with the version from this repo" \
        "Skip existing|keep what is there and install the rest" \
        "Cancel|leave everything as it is"
      case "$MENU_INDEX" in
        0) EXISTING_POLICY=overwrite ;;
        1) EXISTING_POLICY=skip ;;
        *) echo "  ${C_DIM}Cancelled. Nothing was changed.${C_RESET}"; exit 0 ;;
      esac
    fi
  fi
  if [[ "$IS_TTY" = true && ( "$INTERACTIVE" = true || "$FORCE" = true ) ]]; then quiet=quiet; fi

  if [[ -z "$quiet" ]]; then
    local plural="s"
    if (( total == 1 )); then plural=""; fi
    echo "Installing $total skill$plural to $target..."
  fi
  for name in "$@"; do
    current=$((current + 1))
    if [[ -n "$quiet" ]]; then progress "$current" "$total" "$name"; fi
    install_skill "$source_dir" "$name" "$target" "$quiet"
    if [[ "$INSTALL_RESULT" == installed ]]; then
      installed=$((installed + 1))
    else
      skipped+="${skipped:+, }$name"
    fi
  done

  if [[ -n "$quiet" ]]; then
    local verb="copied into" noun="skills"
    if [[ "$SYMLINK" = true ]]; then verb="linked into"; fi
    if (( installed == 1 )); then noun="skill"; fi
    printf '\r\033[K'
    ok "$installed $noun $verb $(tilde "$target")"
    if [[ -n "$skipped" ]]; then echo "    ${C_DIM}kept as they were: $skipped${C_RESET}"; fi
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
    if [[ "$IS_TTY" = true ]]; then
      ok "Found $name ${C_DIM}·${C_RESET} installing into $(tilde "$TARGET_DIR")"
    else
      echo "Detected platform: $name"
      echo "Install directory: $TARGET_DIR"
    fi
    return
  fi

  local p
  if [[ "$INTERACTIVE" = true ]]; then
    local -a items=()
    local label
    for p in "${platform_arr[@]}"; do
      label="Cursor"
      if [[ "${p%%:*}" == claude ]]; then label="Claude Code"; fi
      items+=("$label|$(tilde "${p#*:}")")
    done
    menu_select "Where should they go?" "${items[@]}"
    TARGET_DIR="${platform_arr[$MENU_INDEX]#*:}"
    return
  fi

  echo "Multiple platforms detected:"
  local i=1
  for p in "${platform_arr[@]}"; do
    echo "  $i) ${p%%:*} (${p#*:})"
    i=$((i + 1))
  done

  printf "Pick a platform [1-%d]: " "${#platform_arr[@]}"
  local choice
  read -r choice
  choice=$((choice - 1))

  if [[ $choice -lt 0 ]] || [[ $choice -ge ${#platform_arr[@]} ]]; then
    echo "Invalid choice." >&2
    exit 1
  fi

  TARGET_DIR="${platform_arr[$choice]#*:}"
}

pick_skills() {
  local entry idx
  if [[ "$INTERACTIVE" = true ]]; then
    local -a items=()
    for entry in "${SKILLS[@]}"; do
      items+=("${entry%%:*}|${entry#*:}")
    done
    multi_select "Which skills?" "${items[@]}"
    for idx in $PICKED; do
      entry="${SKILLS[$idx]}"
      SELECTED_SKILLS+=("${entry%%:*}")
    done
    if [[ ${#SELECTED_SKILLS[@]} -eq ${#SKILLS[@]} ]]; then INSTALL_ALL=true; fi
    return
  fi

  echo ""
  echo "Available skills:"
  local i=1
  for entry in "${SKILLS[@]}"; do
    echo "  $i) ${entry%%:*} -- ${entry#*:}"
    i=$((i + 1))
  done
  echo "  a) Install all"

  printf "Pick skills (comma-separated numbers, or 'a' for all): "
  local selection
  read -r selection

  if [[ "$selection" = "a" ]]; then
    INSTALL_ALL=true
    return
  fi

  local picks=() p
  IFS=',' read -ra picks <<< "$selection"
  for p in "${picks[@]}"; do
    p=$(echo "$p" | tr -d ' ')
    idx=$((p - 1))
    if [[ $idx -ge 0 ]] && [[ $idx -lt ${#SKILLS[@]} ]]; then
      entry="${SKILLS[$idx]}"
      SELECTED_SKILLS+=("${entry%%:*}")
    fi
  done

  if [[ ${#SELECTED_SKILLS[@]} -eq 0 ]]; then
    echo "No valid skills selected." >&2
    exit 1
  fi
}

# Shown when the script runs bare inside a clone: every action without having
# to remember its flag.
home_menu() {
  banner
  menu_select "What do you want to do?" \
    "Install skills|pick skills and where to copy them" \
    "Link this repo|symlink every skill into ~/.cursor and ~/.claude   --self" \
    "Update vendors|pull the latest upstream vendor skills   --update-vendor" \
    "Check catalogs|validate skills, README.md and index.html   --check" \
    "Help|show every flag   --help" \
    "Quit|"
  case "$MENU_INDEX" in
    1) SELF=true ;;
    2) UPDATE_VENDOR=true ;;
    3) CHECK=true ;;
    4) echo ""; usage; exit 0 ;;
    5) exit 0 ;;
  esac
}

main() {
  local bare=false
  if [[ $# -eq 0 ]]; then bare=true; fi

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

  local in_repo=false
  if [[ -d "$SCRIPT_DIR/skills" && -f "$SCRIPT_DIR/.gitmodules" ]]; then in_repo=true; fi

  if [[ "$bare" = true && "$INTERACTIVE" = true ]]; then
    if [[ "$in_repo" = true ]]; then home_menu; else banner; fi
  fi

  if [[ "$CHECK" = true ]]; then
    title "Checking skills and catalogs"
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

  title "Installing skills"
  resolve_source_dir
  local source_dir="$SOURCE_DIR"

  # Vendor skills only exist next to a full clone with its submodules, not in
  # the shallow download a remote install works from.
  if [[ "$in_repo" = true ]]; then
    init_vendor_submodules
    link_vendor_skills "$source_dir"
  fi

  if [[ -z "$TARGET_DIR" ]]; then
    pick_platform
  fi

  local -a names=()
  local entry
  if [[ -n "$SINGLE_SKILL" ]]; then
    names=("$SINGLE_SKILL")
  else
    if [[ "$INSTALL_ALL" = false ]]; then pick_skills; fi
    if [[ "$INSTALL_ALL" = true ]]; then
      for entry in "${SKILLS[@]}"; do names+=("${entry%%:*}"); done
    else
      names=("${SELECTED_SKILLS[@]}")
    fi
  fi

  # The SKILLS array only lists own skills, so vendor skills (the symlinks in
  # $source_dir) are added here when everything is being linked.
  if [[ "$SYMLINK" = true && "$INSTALL_ALL" = true && "$in_repo" = true ]]; then
    local link
    for link in "$source_dir"/*; do
      if [[ -L "$link" ]]; then names+=("$(basename "$link")"); fi
    done
  fi

  install_many "$source_dir" "$TARGET_DIR" "${names[@]}"
  finish
}

main "$@"
