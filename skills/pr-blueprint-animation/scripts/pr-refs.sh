#!/usr/bin/env bash
# Resolve a pull request to its base and head commits, with or without gh.
#   pr-refs.sh <pr-number | pr-url | branch> [--remote origin] [--base <ref>]
# Prints BASE=/HEAD= lines, the PR's commits (oldest first) and the files it
# changes, frontend files first. Run it inside a clone of the repository.
set -euo pipefail

target="" remote="origin" base_ref=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --remote) remote="$2"; shift 2 ;;
    --base) base_ref="$2"; shift 2 ;;
    -h|--help) sed -n '2,5p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) target="$1"; shift ;;
  esac
done
[[ -n "$target" ]] || { echo "usage: pr-refs.sh <pr-number | pr-url | branch> [--remote origin] [--base <ref>]" >&2; exit 1; }

num="" title=""
if [[ "$target" =~ ^#?([0-9]+)$ ]]; then num="${BASH_REMATCH[1]}"
elif [[ "$target" =~ /pull/([0-9]+) ]]; then num="${BASH_REMATCH[1]}"
fi

if [[ -n "$num" ]]; then
  if command -v gh >/dev/null 2>&1 && gh pr view "$num" --json number >/dev/null 2>&1; then
    title="$(gh pr view "$num" --json title -q .title)"
    [[ -n "$base_ref" ]] || base_ref="$remote/$(gh pr view "$num" --json baseRefName -q .baseRefName)"
  fi
  # GitHub (and most hosts) expose every PR head as refs/pull/<n>/head.
  git fetch -q "$remote" "+refs/pull/$num/head:refs/pr-blueprint/$num"
  head="$(git rev-parse "refs/pr-blueprint/$num")"
else
  head="$(git rev-parse --verify "$target^{commit}")"
fi

if [[ -z "$base_ref" ]]; then
  base_ref="$(git symbolic-ref -q --short "refs/remotes/$remote/HEAD" || true)"
  if [[ -z "$base_ref" ]]; then
    git remote set-head "$remote" --auto >/dev/null 2>&1 || true
    base_ref="$(git symbolic-ref -q --short "refs/remotes/$remote/HEAD" || echo "$remote/main")"
  fi
fi
if [[ "$base_ref" == "$remote/"* ]]; then
  git fetch -q "$remote" "+refs/heads/${base_ref#"$remote/"}:refs/remotes/$base_ref" || true
fi
base="$(git merge-base "$base_ref" "$head")"

if [[ -n "$num" ]]; then echo "PR:    #$num${title:+  $title}"; fi
echo "BASE=$base  (merge-base with $base_ref)"
echo "HEAD=$head"
echo
echo "Commits, oldest first:"
git log --reverse --format='  %h %s' "$base..$head"
echo
fe='\.(tsx?|jsx?|mjs|cjs|vue|svelte|astro|css|scss|sass|less|styl|html?|mdx|svg|png|jpe?g|gif|webp|avif|woff2?)$'
echo "Frontend files:"
git diff --numstat "$base" "$head" | awk -v re="$fe" '$3 ~ re { printf "  +%-5s -%-5s %s\n", $1, $2, $3 }'
other="$(git diff --numstat "$base" "$head" | awk -v re="$fe" '$3 !~ re { printf "  +%-5s -%-5s %s\n", $1, $2, $3 }')"
if [[ -n "$other" ]]; then
  echo "Other files:"
  echo "$other"
fi
