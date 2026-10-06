#!/usr/bin/env bash
# Resolve a pull request to its base and head commits, with or without gh.
#   pr-refs.sh <pr-number | pr-url | branch> [--remote origin] [--base <branch>]
# Prints the PR's title, description and fork status when gh can reach GitHub,
# BASE= and PRHEAD= lines (eval-able), the PR's commits (oldest first) and the
# files it changes, frontend files first. Run it inside a clone of the
# repository. It creates no refs: fetched commits are read through FETCH_HEAD.
set -euo pipefail

target="" remote="origin" base_branch=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --remote) remote="$2"; shift 2 ;;
    --base) base_branch="$2"; shift 2 ;;
    -h|--help) sed -n '2,7p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) target="$1"; shift ;;
  esac
done
[[ -n "$target" ]] || { echo "usage: pr-refs.sh <pr-number | pr-url | branch> [--remote origin] [--base <branch>]" >&2; exit 1; }
base_branch="${base_branch#"$remote/"}"

num=""
if [[ "$target" =~ ^#?([0-9]+)$ ]]; then num="${BASH_REMATCH[1]}"
elif [[ "$target" =~ /pull/([0-9]+) ]]; then num="${BASH_REMATCH[1]}"
fi

# Title, description, base branch and fork status from GitHub, when gh can reach it.
info=""
if [[ -n "$num" ]] && command -v gh >/dev/null 2>&1; then
  url="$(git remote get-url "$remote" 2>/dev/null || true)"
  if [[ "$url" =~ github\.com[:/]([^/]+)/([^/]+)$ ]]; then
    slug="${BASH_REMATCH[1]}/${BASH_REMATCH[2]%.git}"
    if json="$(gh api "repos/$slug/pulls/$num" 2>/dev/null)"; then
      info="$(printf '%s' "$json" | node -e '
        let s = ""; process.stdin.on("data", d => (s += d)).on("end", () => {
          const p = JSON.parse(s);
          const fork = p.head && p.head.repo && p.base && p.base.repo && p.head.repo.full_name !== p.base.repo.full_name;
          const body = (p.body || "").replace(/\r/g, "").trim().split("\n").slice(0, 40).join("\n");
          console.log(`PR #${p.number}: ${p.title}\nAuthor: ${p.user ? p.user.login : "?"}`
            + (fork ? `\nFork: the code comes from ${p.head.repo.full_name}. Ask the user before installing or running it.` : "")
            + `\nBase branch: ${p.base.ref}\n\nDescription:\n${body || "(none)"}`);
        });')"
      [[ -n "$base_branch" ]] || base_branch="$(printf '%s' "$json" | node -e 'let s = ""; process.stdin.on("data", d => (s += d)).on("end", () => console.log(JSON.parse(s).base.ref))')"
    fi
  fi
fi

if [[ -n "$num" ]]; then
  # GitHub (and most hosts) expose every PR head as refs/pull/<n>/head.
  git fetch -q "$remote" "refs/pull/$num/head" || { echo "error: could not fetch refs/pull/$num/head from $remote" >&2; exit 1; }
  head="$(git rev-parse FETCH_HEAD)"
else
  head="$(git rev-parse --verify "$target^{commit}")"
fi

guessed=""
if [[ -z "$base_branch" ]]; then
  # The remote's default branch, read without changing any ref.
  base_branch="$(git ls-remote --symref "$remote" HEAD 2>/dev/null | awk '/^ref:/ { sub("refs/heads/", "", $2); print $2; exit }')"
  [[ -n "$base_branch" ]] || base_branch=main
  guessed=1
fi
git fetch -q "$remote" "refs/heads/$base_branch" || { echo "error: no branch $base_branch on $remote" >&2; exit 1; }
base="$(git merge-base FETCH_HEAD "$head")"

if [[ -n "$info" ]]; then printf '%s\n\n' "$info"; fi
echo "BASE=$base"
echo "PRHEAD=$head"
echo "# BASE is the merge-base with $remote/$base_branch${guessed:+, the default branch (pass --base <branch> if the PR targets another one)}."
echo
echo "Commits, oldest first:"
git log --reverse --format='  %h %s' "$base..$head"
echo
fe='\.(tsx?|jsx?|mjs|cjs|vue|svelte|astro|css|scss|sass|less|styl|html?|mdx|svg|png|jpe?g|gif|webp|avif|woff2?)$'
stat="$(git diff --numstat --no-renames "$base" "$head")"
echo "Frontend files:"
printf '%s\n' "$stat" | awk -F'\t' -v re="$fe" 'NF >= 3 && $3 ~ re { printf "  +%-5s -%-5s %s\n", $1, $2, $3 }'
other="$(printf '%s\n' "$stat" | awk -F'\t' -v re="$fe" 'NF >= 3 && $3 !~ re { printf "  +%-5s -%-5s %s\n", $1, $2, $3 }')"
if [[ -n "$other" ]]; then
  echo "Other files:"
  echo "$other"
fi
