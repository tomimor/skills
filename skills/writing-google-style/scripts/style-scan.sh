#!/usr/bin/env bash
# Scan docs for mechanical Google-style violations.
# Usage: style-scan.sh [path ...]        (defaults to the current directory)
#        style-scan.sh -r RULE [path]    (run one rule: banned, timeless, latin,
#                                         inclusive, links, future, passive, heading)
# Skips fenced code blocks, inline code spans, and link URLs, so sample output
# and command names don't produce false hits.
# Exits 1 when it finds candidates, 0 when clean.

set -uo pipefail

ONLY_RULE=""
while getopts ":r:h" opt; do
  case "$opt" in
    r) ONLY_RULE="$OPTARG" ;;
    h) sed -n '2,9p' "$0"; exit 0 ;;
    *) echo "unknown option: -$OPTARG" >&2; exit 2 ;;
  esac
done
shift $((OPTIND - 1))

[[ $# -eq 0 ]] && set -- .

FILES=$(
  for target in "$@"; do
    if [[ -f "$target" ]]; then
      printf '%s\n' "$target"
    else
      find "$target" \
        \( -name .git -o -name node_modules -o -name vendor -o -name dist -o -name build \) -prune -o \
        -type f \( -name '*.md' -o -name '*.mdx' -o -name '*.markdown' -o -name '*.rst' \) \
        ! -iname 'CHANGELOG*' ! -iname 'LICENSE*' -print
    fi
  done
)

[[ -z "$FILES" ]] && { echo "no documentation files found"; exit 0; }

echo "$FILES" | tr '\n' '\0' | xargs -0 awk -v only="$ONLY_RULE" '
BEGIN {
  n = 0
  rule[++n] = "banned"
  re[n] = "(simply|just|easy|easily|effortless|obviously|of course|clearly|needless to say|trivial|please|in order to|utilize|leverage|allows you to|enables you to|note that|a number of|and/or)"
  rule[++n] = "timeless"
  re[n] = "(currently|presently|at this time|recently|newly|soon|in the near future|upcoming|coming soon|new feature|will be available|will be supported)"
  rule[++n] = "latin"
  re[n] = "(e\\.g\\.|i\\.e\\.|etc\\.|viz\\.|cf\\.|n\\.b\\.|per se|via)"
  rule[++n] = "inclusive"
  re[n] = "(whitelist|blacklist|master|slave|sanity check|dummy|grandfather|crazy|insane|lame|dumb|blind to|deaf to|cripple|handicap|guys|manpower|man hours|manned|chairman|middleman|he/she|his/her|abort|kill|hit the|native speaker|normal user)"
  rule[++n] = "links"
  re[n] = "\\[(click here|here|this link|read more|learn more|link|this)\\]"
  rule[++n] = "future"
  re[n] = "(will|shall|won.t) +[a-z]+"
  rule[++n] = "passive"
  re[n] = "(is|are|was|were|be|been|being) +[a-z]+(ed|en) +by"
  rules = n
  findings = 0
}

FNR == 1 { in_fence = 0 }

# Track fenced code blocks; never inspect their contents.
/^[ \t]*(```|~~~)/ { in_fence = !in_fence; next }
in_fence { next }

{
  original = $0
  text = tolower($0)
  gsub(/`[^`]*`/, " ", text)          # inline code spans
  gsub(/\][ ]*\([^)]*\)/, "]", text)  # link URLs, keeping link text
  gsub(/https?:\/\/[^ )]*/, " ", text)

  for (i = 1; i <= rules; i++) {
    if (only != "" && only != rule[i]) continue
    probe = "(^|[^a-z0-9])" re[i] "([^a-z0-9]|$)"
    if (match(text, probe)) {
      hit = substr(text, RSTART, RLENGTH)
      gsub(/^[^a-z0-9\[]+|[^a-z0-9\]]+$/, "", hit)
      report(rule[i], hit, original)
    }
  }

  # Headings must be sentence case: flag two or more capitalized words after the first.
  if ((only == "" || only == "heading") && original ~ /^#+ /) {
    head = original
    sub(/^#+ +/, "", head)
    gsub(/`[^`]*`/, " ", head)
    caps = 0
    m = split(head, words, /[ \t]+/)
    for (w = 2; w <= m; w++)
      if (words[w] ~ /^[A-Z][a-z]+$/) caps++
    if (caps >= 2) report("heading", "title case?", original)
  }
}

function report(r, hit, line) {
  findings++
  count[r]++
  if (length(line) > 96) line = substr(line, 1, 96) "..."
  sub(/^[ \t]+/, "", line)
  printf "%s:%d [%s] %s | %s\n", FILENAME, FNR, r, hit, line
}

END {
  if (findings == 0) { print "clean: no candidates found"; exit 0 }
  printf "\n%d candidate(s):", findings
  for (r in count) printf " %s=%d", r, count[r]
  print "\nEvery hit needs a human read - these are candidates, not verdicts."
  exit 1
}
'

status=$?
# xargs reports a failing child as 123; the scanner's own "found something" code is 1.
[[ $status -eq 123 ]] && status=1
exit $status
