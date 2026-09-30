---
name: pr-blueprint-animation
description: >-
  Turns the frontend change in a pull request into a blueprint animation that
  explains each UI decision step by step: the base UI turns into a cyan
  blueprint, the parts the PR changes rebuild, and the new UI is revealed.
  Every UI frame is a real render of the PR's code (base, one state per step,
  head) captured with Playwright; outputs an MP4 and GIF for the PR description
  plus a self-contained HTML player. Use when the user wants to show, explain or
  demo a PR's UI change, or asks for a before/after video or GIF of a PR.
  Adapted from moguzbulbul/blueprint-animation (CC BY-NC 4.0).
license: CC BY-NC 4.0, non-commercial use only. Adapted from moguzbulbul/blueprint-animation. See LICENSE.
---

# PR blueprint animation

One continuous animation of ONE screen of the app, in 3–6 numbered steps. Each step explains one UI decision the PR makes: the screen fades back to the part that changes, turns into a cyan blueprint, the changed parts rebuild, and the real UI after that step is revealed. The page never cuts.

Adapted from [Blueprint Before/After](https://github.com/moguzbulbul/blueprint-animation) by Oğuz ([@moguzbulbul](https://x.com/moguzbulbul)). That skill rebuilds Figma designs inside Claude Design; this one works from the PR's code, in any agent that can run Node and a browser. License: CC BY-NC 4.0, non-commercial use only ([LICENSE](LICENSE)).

Two modes:
- **Redesign** (the PR changes an existing screen): base → one state per step → head. §1–§7.
- **Explain** (the PR adds a new screen): one state, the head; each step annotates one module with what it is and why. Same workflow with one capture; see [references/blueprint-rules.md](references/blueprint-rules.md#explain-mode).

Needs Node 18+, Playwright with Chromium (the project's own, or `npm i -g playwright && npx playwright install chromium`) and ffmpeg for MP4 + GIF. Without ffmpeg, render.mjs falls back to WebM through Playwright's bundled ffmpeg, or to the filmstrip only. Below, `$SKILL` is this skill's directory and `$WORK` a scratch directory outside the repo.

## 0. Fidelity: every UI frame is a real render

- The UI the viewer sees at rest is a screenshot of the app running the PR's code at that point: base, after step 1, …, head. Never redraw, restyle, patch or "improve" it, and never edit a screenshot.
- Intermediate states are real renders too. Build each one from code (§3), never by compositing screenshots.
- The blueprint is drawn from the DOM geometry captured with each screenshot, so every wire sits on its element and carries its real text.
- Every state shows the same data: same route, account, seed data, viewport and clock. If something differs between captures that the PR didn't change (a timestamp, a random avatar, a rotating banner), fix the capture (`--time`, `--hide`, a setup script) rather than accept it.
- render.mjs proves it: each rest frame must match its state's screenshot pixel for pixel.

## 1. Gather

- **The PR**: number, URL or branch. In the repo clone, `bash "$SKILL/scripts/pr-refs.sh" <pr>` prints BASE, HEAD, the commits and the changed files. It uses `gh` when present and plain git (`refs/pull/<n>/head`) otherwise.
- **The screen**: the route, and how to reach the state to show (login, seed data, an open menu). One screen per animation. If the PR changes several, pick the one with the clearest story, or make one animation per screen.
- **How to run the app**: install and dev commands (or build + preview), and a free port.
- **Viewport**: 1440×900 by default; the real UI is shown 1:1. Use the screen's main breakpoint instead when it is mobile-first (390×844).
- **The steps**, 3–6. Propose them from the PR title, description, commits and diff, then get them confirmed:
  - Redesign: **name** (2–4 words) · **problem** (one sentence, ≤ 12 words) · **fix** (one sentence).
  - Explain: **name** (the module) · **what** (≤ 12 words) · **why** (one sentence).
  Describe only what the diff does. When the PR description gives the reason for a change, use its wording.
- Anything missing (credentials, seed data, a feature flag): ask before building.

## 2. Plan the steps from the diff

- Map every step to code: whole commits when the PR's commits line up with steps, otherwise hunks or edits.
- Order the steps so that each intermediate state builds and renders on its own. A change that pushes other content (an inserted banner) belongs to the step that makes it.
- Two changes that can't be separated are one step.
- Diff that changes nothing on screen (tests, types, refactors) gets no step.

## 3. Build the states

One scratch worktree and one dev server serve every state:

```bash
git worktree add --detach "$WORK/app" "$BASE"
cd "$WORK/app" && <install> && <dev command on port 4400> &
```

For each step k, move the worktree to the code after step k and commit it, so every state can be rebuilt:

- **Step = commits**: `git -C "$WORK/app" checkout --detach <last commit of step k>`.
- **Step = part of a commit**: `git -C "$WORK/app" diff HEAD "$PRHEAD" -- <files>` shows what is left to apply. Edit the files toward the PR head by that step's changes only, then `git -C "$WORK/app" commit -qam "state k: <name>"`.
- The last state must be the PR head: `git -C "$WORK/app" diff --quiet "$PRHEAD" -- <changed paths>` must succeed.
- When package.json or the lockfile changes, reinstall at that state. Restart the dev server if it doesn't pick up a change.

## 4. Capture every state

```bash
node "$SKILL/scripts/capture.mjs" --url http://localhost:4400/<route> --out "$WORK/states/s0"
```

This writes `s0.png` (the screenshot) and `s0.json` (the geometry). Defaults: 1440×900, `Date.now()` frozen at 2026-01-01T12:00:00Z, reduced motion, transitions and the caret off. Options: `--setup setup.mjs` (a module whose default export `async page => {…}` logs in or opens a menu), `--wait <selector>`, `--scroll <selector|y>`, `--hide <selectors>` (dev badges such as `nextjs-portal`, cookie banners), `--viewport WxH`, `--time real`, `--wait-until load` (for apps that long-poll and never go network-idle). It refuses to capture a Vite or Next.js error overlay.

Capture `s0` at BASE, then `s1` … `sN` after each step (§3). Then check each step:

```bash
node "$SKILL/scripts/compare.mjs" "$WORK/states/s0.png" "$WORK/states/s1.png" --out "$WORK/diffs/01.png"
```

It prints the regions that changed. They must sit where step 1 acts, plus any content it pushes. A change anywhere else means the step leaks into another or the capture is unstable: fix that before going on. Keep the regions, they give each step's focus rect.

## 5. Write the scene

Copy `$SKILL/template/scene.js` to `$WORK/scene.js` and rewrite its `SCENE` for this PR. The template is a worked example with 4 steps. Per step:

- `name`, `prob`, `fix` (Explain: `what`, `why`) from §1.
- `focus`: the rect the step is about, from the compare regions padded by ~16 px. Keep its edges and corner ticks in empty bands, never through text. A rect that reaches the bottom edge can run past it, so its lower ticks fall outside the frame.
- `into: 'nearest'` when removed controls merge into a new one (buttons into a ⋯ menu).
- `handles`: the 1–3 elements that matter, as keys or texts. Default: merge targets and restyled elements.
- `marks(ph, A, B, K)`: labels, guides and one dimension line that name the rule ("1 PRIMARY + OVERFLOW"), timed from `ph`.

The kit does the rest from the captured geometry: a static blueprint of everything unchanged, plus the construct motion for what changed. Pushes run first, then removals, changes and arrivals, staggered by row, with text hidden while wires move. API and examples: [references/scene-api.md](references/scene-api.md).

## 6. Build, render, check

```bash
node "$SKILL/scripts/build.mjs" "$WORK"                             # -> $WORK/player.html, one self-contained file
node "$SKILL/scripts/render.mjs" "$WORK/player.html" --no-video      # rest-frame QA + filmstrip, fast
node "$SKILL/scripts/render.mjs" "$WORK/player.html" --at 12.4,18.9  # single moments, while tuning marks
node "$SKILL/scripts/render.mjs" "$WORK/player.html"                 # + out/blueprint.mp4 and out/blueprint.gif
```

render.mjs fails if the player throws or any rest frame differs from its state screenshot. Then open `out/filmstrip.png` and the full-size key frames in `out/frames/` (each step's focus, blueprint-in, mid-construct, reveal and hold) and check:

1. No text on text: labels sit in empty bands, no label covers a row, and no moving wire carries its text.
2. Focus rects and their corner ticks don't cut through text.
3. Every number in a label or sentence matches what the screen shows.
4. Each step moves only what its sentence talks about.

Fix the scene (or the step split) and render again until all of it holds. The rules behind these checks: [references/blueprint-rules.md](references/blueprint-rules.md).

A step lasts `dur × K` (7 s by default), so the piece runs 1.5 + 7 × steps + 5 s. In testing, rendering took about 3.5 s per second of video.

## 7. Deliver

- Hand over `out/blueprint.mp4`, `out/blueprint.gif`, `player.html` (plays anywhere, offline) and `out/filmstrip.png`, with the steps as a PR-description snippet: `1. **One primary action**: Invite member is the one primary button.`
- GitHub takes media only through the web editor: drag the MP4 or GIF into the PR description. Limits: 10 MB per GIF, 10 MB per video (100 MB on paid plans). Shrink the GIF with `--gif-width 640 --gif-fps 10`. Don't commit media to the repo unless asked.
- Clean up: stop the dev server, `git worktree remove --force "$WORK/app"`, and delete `$WORK` once the user has the files.
