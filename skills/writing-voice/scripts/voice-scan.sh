#!/usr/bin/env bash
# Scan a draft for mechanical tells that it was not written in Tomi's voice.
# Usage: voice-scan.sh [path ...]        (files or folders; .md, .mdx, .txt, .html)
#        voice-scan.sh -r RULE [path]    (run one rule)
#        voice-scan.sh - < draft.txt     (scan a draft from stdin)
# Rules: emdash, hype, filler, hedge, contrast, hook, intensifier, exclaim,
#        hashtag, emoji, placeholder
# Skips fenced code blocks, inline code spans, and URLs, so quoted "before"
# samples and commands don't produce false hits. English and Spanish.
# Reports every hit on a line. Exits 1 when it finds candidates, 0 when clean.

set -uo pipefail

ONLY_RULE=""
[[ "${1:-}" == "--help" ]] && { sed -n '2,10p' "$0"; exit 0; }
while getopts ":r:h" opt; do
  case "$opt" in
    r) ONLY_RULE="$OPTARG" ;;
    h) sed -n '2,10p' "$0"; exit 0 ;;
    *) echo "unknown option: -$OPTARG" >&2; exit 2 ;;
  esac
done
shift $((OPTIND - 1))

[[ $# -eq 0 ]] && set -- .

STDIN_FILE=""
cleanup() { [[ -n "$STDIN_FILE" ]] && rm -f "$STDIN_FILE"; }
trap cleanup EXIT

FILES=$(
  for target in "$@"; do
    if [[ "$target" == "-" ]]; then
      continue
    elif [[ -f "$target" ]]; then
      printf '%s\n' "$target"
    elif [[ -d "$target" ]]; then
      find "$target" \
        \( -name .git -o -name node_modules -o -name vendor -o -name dist -o -name build \) -prune -o \
        -type f \( -name '*.md' -o -name '*.mdx' -o -name '*.txt' -o -name '*.html' \) \
        ! -iname 'CHANGELOG*' ! -iname 'LICENSE*' -print
    else
      echo "not found: $target" >&2
    fi
  done
)

for target in "$@"; do
  if [[ "$target" == "-" ]]; then
    STDIN_FILE=$(mktemp "${TMPDIR:-/tmp}/voice-scan.XXXXXX")
    cat > "$STDIN_FILE"
    FILES=$(printf '%s\n%s' "$FILES" "$STDIN_FILE")
    break
  fi
done

FILES=$(printf '%s\n' "$FILES" | sed '/^$/d')
[[ -z "$FILES" ]] && { echo "no text files found"; exit 0; }

printf '%s\n' "$FILES" | tr '\n' '\0' | xargs -0 awk -v only="$ONLY_RULE" -v stdin_file="$STDIN_FILE" '
BEGIN {
  n = 0
  # Vocabulary that sells instead of saying. Name the concrete thing instead.
  rule[++n] = "hype"
  re[n] = "(delve|delves|delving|dive into|deep dive|game.chang[a-z]+|revolutionary|revolutioni[sz][a-z]+|groundbreaking|cutting.edge|state.of.the.art|world.class|next.level|seamless|seamlessly|robust|leverage|leverages|leveraging|unleash[a-z]*|unlock the|harness[a-z]*|elevate[sd]?|supercharge[sd]?|empower[a-z]*|transformative|synerg[a-z]+|holistic|tapestry|testament to|ever.evolving|fast.paced|embark[a-z]*|pivotal|paradigm shift|revolucion[a-z]+|disruptiv[oa]s?|de vanguardia|clase mundial|siguiente nivel|sinergias?|cambio de paradigma|empoder[a-z]+|potenciar|potenci[aá] tu|sin fricciones|potentes?|incre\xc3\xadbles?|plataforma integral|soluci\xc3\xb3n integral|soluci\xc3\xb3n de gesti\xc3\xb3n|ecosistema para|somos (una|la) (plataforma|soluci\xc3\xb3n)|we are a platform|we.re a platform)"
  # Sentences that announce content instead of delivering it.
  rule[++n] = "filler"
  re[n] = "(it.s important to note|it is important to note|it.s worth noting|it is worth noting|it goes without saying|needless to say|in today.s [a-z]+|at the end of the day|without further ado|in conclusion|in summary|to sum up|let.s dive in|i hope this (email|message|note) finds you|when it comes to|in order to|cabe destacar|cabe mencionar|cabe se\xc3\xb1alar|es importante (destacar|mencionar|se\xc3\xb1alar|remarcar)|vale la pena (destacar|mencionar)|en el mundo actual|en la actualidad|en conclusi\xc3\xb3n|en resumen|sin m\xc3\xa1s pre\xc3\xa1mbulos|espero que (te encuentres|se encuentren|este (mensaje|correo|mail) te encuentre)|a la hora de|en un mundo (cada vez|donde)|en el mundo de hoy|nos enorgullece|estamos emocionados|y mucho m\xc3\xa1s|seguimos mejorando|esperamos que disfrut[a-z]+|we.re excited to|we are excited to|we.re thrilled|we are thrilled|proud to announce|and much more|stay tuned)"
  # Advice wrapped so nobody can disagree with it.
  rule[++n] = "hedge"
  re[n] = "(you might want to consider|you may want to consider|have you thought about|have you considered|it could be worth|it might be worth|one thing to think about|i think maybe|perhaps we could|i just wanted to|tal vez podr\xc3\xadas considerar|quiz\xc3\xa1s podr\xc3\xadamos|me preguntaba si)"
  # The "not X, but Y" frame. Fine once when both halves are concrete facts.
  rule[++n] = "contrast"
  re[n] = "(isn.t just|is not just|aren.t just|are not just|no longer just|ya no (es|son) solo|not just (a|an|about|another)|more than just|not only [^.]* but also|it.s not [^.]*\\. +it.s|this isn.t [^.]*\\. +it.s|no es solo|no es s\xc3\xb3lo|no solo [^.]* sino|no s\xc3\xb3lo [^.]* sino|no se trata (solo |s\xc3\xb3lo )?de|m\xc3\xa1s que un[a]? simple|no es [^.]*\\. +es )"
  # A question asked only so the writer can answer it.
  rule[++n] = "hook"
  re[n] = "(the result\\?|the best part\\?|this one thing|agree\\?|thoughts\\?|what do you think\\?|est\xc3\xa1s de acuerdo\\?|qu\xc3\xa9 opin[a\xc3\xa1]n?\\?|the catch\\?|the kicker|sound familiar\\?|and for me\\?|here.s the thing|here.s the kicker|want to know (the|a) secret|you won.t believe|el resultado\\?|lo mejor\\?|la clave\\?|te suena( familiar)?\\?|y lo mejor de todo|y eso no es todo)"
  rule[++n] = "intensifier"
  re[n] = "(really|extremely|incredibly|truly|absolutely|literally|super|s\xc3\xbaper|sumamente|incre\xc3\xadblemente)"
  rule[++n] = "hashtag"
  re[n] = "#[a-z][a-z0-9_]+"
  # A gap left for Tomi to fill. Fine in a draft, never in what gets sent.
  rule[++n] = "placeholder"
  re[n] = "\\[(missing|completar|tk)[^]]*\\]"
  rules = n
  findings = 0
}

FNR == 1 { in_fence = 0 }

# Track fenced code blocks; never inspect their contents.
/^[ \t]*(```|~~~)/ { in_fence = !in_fence; next }
in_fence { next }

{
  original = $0
  text = $0
  gsub(/`[^`]*`/, " ", text)          # inline code spans
  gsub(/\][ ]*\([^)]*\)/, "]", text)  # link URLs, keeping link text
  gsub(/https?:\/\/[^ )]*/, " ", text)
  raw = text
  text = tolower(text)

  for (i = 1; i <= rules; i++) {
    if (only != "" && only != rule[i]) continue
    # A Markdown heading is not a hashtag, and neither is an issue reference.
    if (rule[i] == "hashtag" && original ~ /^#+ /) continue
    probe = "(^|[^a-z0-9#])" re[i] "([^a-z0-9]|$)"
    rest = text
    while (match(rest, probe)) {
      hit = substr(rest, RSTART, RLENGTH)
      gsub(/^[^a-z0-9#\[]+|[^a-z0-9?\]]+$/, "", hit)
      report(rule[i], hit, original)
      # Keep the trailing boundary character so an adjacent hit still matches.
      rest = substr(rest, RSTART + RLENGTH - 1)
      if (RLENGTH <= 1) break
    }
  }

  # Em dash anywhere, or a spaced en dash used as one. Ranges like 10-12 pass.
  if (only == "" || only == "emdash") {
    if (raw ~ /\xe2\x80\x94/ || raw ~ /[ \t]\xe2\x80\x93[ \t]/) report("emdash", "dash", original)
  }

  # Emoji. Fine as a fixed section marker, a tell as a bullet or decoration.
  if (only == "" || only == "emoji") {
    if (raw ~ /\xf0\x9f/ || raw ~ /\xe2\x9c[\x85\x94\xa8]/ || raw ~ /\xe2\x9d\x8c/ || raw ~ /\xe2\xad\x90/)
      report("emoji", "emoji", original)
  }

  # Stacked exclamation marks, or three or more in one line.
  if (only == "" || only == "exclaim") {
    probe_line = raw
    marks = gsub(/!/, "", probe_line)
    if (raw ~ /!!/) report("exclaim", "!!", original)
    else if (marks >= 3) report("exclaim", marks " in one line", original)
  }
}

function report(r, hit, line) {
  findings++
  count[r]++
  if (length(line) > 96) line = substr(line, 1, 96) "..."
  sub(/^[ \t]+/, "", line)
  name = (FILENAME == stdin_file) ? "stdin" : FILENAME
  printf "%s:%d [%s] %s | %s\n", name, FNR, r, hit, line
}

END {
  if (findings == 0) { print "clean: no candidates found"; exit 0 }
  printf "\n%d candidate(s):", findings
  for (r in count) printf " %s=%d", r, count[r]
  print "\nEvery hit needs a human read. These are candidates, not verdicts."
  exit 1
}
'

status=$?
# xargs reports a failing child as 123; the scanner uses 1 for "found something".
[[ $status -eq 123 ]] && status=1
exit $status
