---
name: pr-blueprint-animation
description: >-
  Turns the frontend change in a pull request into a step-by-step blueprint
  animation (MP4, GIF and an offline HTML player) built from real renders of
  the PR's code: the base UI turns into a cyan blueprint, each changed part
  rebuilds, and the new UI is revealed. Use when the user wants a video, GIF,
  walkthrough, before/after or explainer of a PR's or branch's UI change for
  the PR description or a review, even if they don't say "blueprint"; for
  Figma or Claude Design work with no PR, use blueprint-animation instead.
license: CC BY-NC 4.0, non-commercial use only. Adapted from moguzbulbul/blueprint-animation. See LICENSE.
---

# PR blueprint animation

One continuous animation of ONE screen of the app, in 1–6 numbered steps, one per UI decision the PR makes. In each step the screen fades back to the part that changes, turns into a cyan blueprint, the changed parts rebuild, and the real UI after that step is revealed. The page never cuts.

Adapted from [Blueprint Before/After](https://github.com/moguzbulbul/blueprint-animation) by Oğuz ([@moguzbulbul](https://x.com/moguzbulbul)). That skill rebuilds Figma designs inside Claude Design; this one works from the PR's code, in any agent that can run Node and a browser. License: CC BY-NC 4.0, non-commercial use only ([LICENSE](LICENSE)).

Two modes:
- **Redesign** (the PR changes an existing screen): base → one state per step → head. §1–§7.
- **Explain** (the PR adds a new screen): one state, the head; each step annotates one module with what it is and why. Same workflow with one capture; see [references/blueprint-rules.md](references/blueprint-rules.md#explain-mode).

Needs Node 18+, Playwright 1.45+ with Chromium (the project's own, or `npm i -g playwright && npx playwright install chromium`) and ffmpeg for MP4 + GIF (`pip install imageio-ffmpeg` works too). Without ffmpeg, render.mjs falls back to WebM through Playwright's bundled ffmpeg, or to the filmstrip only. Below, `$SKILL` is this skill's directory and `$WORK` a scratch directory outside the repo.

## 0. Fidelity: every UI frame is a real render

Reviewers trust the animation because what they see at rest is the app itself, not an illustration of it.

- The UI the viewer sees at rest is a screenshot of the app running the PR's code at that point: base, after step 1, …, head. Never redraw, restyle, patch or "improve" it, and never edit a screenshot.
- Intermediate states are real renders too. Build each one from code (§3), never by compositing screenshots.
- The blueprint is drawn from the DOM geometry captured with each screenshot, so every wire sits on its element and carries its real text. Overlays (an open menu, a dialog) are captured as a layer that hides what lies under it, as on screen.
- Every state shows the same data: same route, account, seed data, viewport and clock. If something differs between captures that the PR didn't change (a timestamp, a random avatar, a rotating banner), fix the capture (`--time`, `--hide`, a setup script) rather than accept it.
- render.mjs proves it: the first frame, each rest frame and the last frame must match their state's screenshot (a 0.05% allowance covers anti-aliasing).

## 1. Gather

- **The PR**: number, URL or branch. In the repo clone, `bash "$SKILL/scripts/pr-refs.sh" <pr>` prints the PR's title, description and author when `gh` can reach GitHub, then `BASE=` and `PRHEAD=` lines, the commits and the changed files. It uses plain git (`refs/pull/<n>/head`) otherwise and creates no refs. Load the two commits with `eval "$(bash "$SKILL/scripts/pr-refs.sh" <pr> | grep -E '^(BASE|PRHEAD)=')"`.
- **The screen**: the route, and how to reach the state to show (login, seed data, an open menu). One screen per animation. If the PR changes several, pick the one with the clearest story, or make one animation per screen.
- **How to run the app**: install and dev commands (or build + preview), and a free port.
- **Viewport**: 1440×900 by default; the real UI is shown 1:1. Use the screen's main breakpoint instead when it is mobile-first (390×844).
- **The steps**: one per UI decision the PR makes, 1–6 in all. A PR that makes one decision gets one step; padding it out makes reviewers sit through steps that say nothing. Propose them from the PR title, description, commits and diff, and confirm them with the user when you can (otherwise list them in the hand-off):
  - Redesign: **name** (2–4 words) · **problem** (one sentence, ≤ 12 words, about the UI before the PR) · **fix** (one sentence).
  - Explain: **name** (the module) · **what** (≤ 12 words) · **why** (one sentence).
  Describe only what the diff does: a field without a handler doesn't "filter as you type", and an ellipsis doesn't mean a confirmation dialog exists. When the PR description gives the reason for a change, use its wording.
- Anything missing (credentials, seed data, a feature flag): ask before building.

## 2. Plan the steps from the diff

- Map every step to code: whole commits when the PR's commits line up with steps, otherwise hunks or edits.
- Split a commit only where it holds more than one decision. Each split creates in-between states that never shipped as a commit; keep them few and say which they are in the hand-off.
- Order the steps so that each intermediate state builds and renders on its own. A change that pushes other content (an inserted banner) belongs to the step that makes it.
- Two changes that can't be separated are one step. A sort and the header arrow that shows it are one decision, so they are one step: the kit draws the moving rows as that step's change.
- Diff that changes nothing on screen (tests, types, refactors) gets no step.

## 3. Build the states

This runs the PR's code: installing dependencies runs their scripts and the dev server runs the app. If the PR comes from a fork or an outside contributor (pr-refs.sh says so when it can reach GitHub), ask the user before installing or running anything.

One scratch worktree and one dev server serve every state:

```bash
git worktree add --detach "$WORK/app" "$BASE"        # Explain mode: "$PRHEAD"
cd "$WORK/app" && npm ci                              # the project's install command
npm run dev -- --port 4400 --strictPort > "$WORK/dev.log" 2>&1 &   # Vite; Next.js: -p 4400
```

capture.mjs waits for the server to answer, so it can run right away. For each step k, move the worktree to the code after step k and commit it, so every state can be rebuilt:

- **Step = commits**: `git -C "$WORK/app" checkout --detach <last commit of step k>`.
- **Step = part of a commit**: `git -C "$WORK/app" diff HEAD "$PRHEAD" -- <files>` shows what is left to apply. Edit the files toward the PR head by that step's changes only, then `git -C "$WORK/app" add -A && git -C "$WORK/app" -c user.name=pr-blueprint -c user.email=pr-blueprint@localhost commit -qm "state k: <name>"` (an identity on the command line, so the user's git config is never touched).
- The last state must be the PR head: `git -C "$WORK/app" diff --quiet "$PRHEAD" -- <changed paths>` must succeed.
- When package.json or the lockfile changes, reinstall at that state. Restart the dev server if it doesn't pick up a change.

## 4. Capture every state

```bash
node "$SKILL/scripts/capture.mjs" --url http://localhost:4400/<route> --out "$WORK/states/s0"
```

This writes `s0.png` (the screenshot) and `s0.json` (the geometry). Defaults: 1440×900, `Date.now()` frozen at 2026-01-01T12:00:00Z, reduced motion, transitions and the caret off. Options:

- `--setup setup.mjs`: a module whose default export `async (page, { advance }) => {…}` logs in, opens a menu or types a query. The clock is frozen, so code that waits for time to pass (a debounced search) only runs after `await advance(500)`.
- `--wait <selector>`, `--scroll <selector|y>`, `--viewport WxH`, `--time real`, `--wait-until load` (for apps that long-poll and never go network-idle).
- `--hide <selectors>`: dev badges such as `nextjs-portal`, cookie banners. It survives navigations in the setup script.

It refuses to capture a Vite or Next.js error overlay. Password fields are recorded as bullets, never their value.

Capture `s0` at BASE, then `s1` … `sN` after each step (§3). Then check each step:

```bash
node "$SKILL/scripts/compare.mjs" "$WORK/states/s0.png" "$WORK/states/s1.png" --out "$WORK/diffs/01.png"
```

It prints the regions that changed. They must sit where step 1 acts, plus any content it pushes. A change anywhere else means the step leaks into another or the capture is unstable: fix that before going on. Keep the regions, they give each step's focus rect. In Explain mode there is nothing to compare; take each module's rect from `s0.json` (its card or section box).

## 5. Write the scene

Copy `$SKILL/template/scene.js` to `$WORK/scene.js` and rewrite its `SCENE` for this PR. The template is a worked example with 4 steps. Per step:

- `name`, `prob`, `fix` (Explain: `what`, `why`) from §1.
- `focus`: the rect the step is about, from the compare regions padded by ~16 px. Keep its edges and corner ticks in empty bands, never through text. A rect that reaches the bottom edge can run past it, so its lower ticks fall outside the frame.
- `into: 'nearest'` when removed controls merge into a new one (buttons into a ⋯ menu).
- `handles`: the 1–3 elements that matter, as keys or texts. Default: merge targets and restyled elements.
- `marks(ph, A, B, K)`: labels, guides and one dimension line that name the rule ("1 PRIMARY + OVERFLOW"), timed from `ph`. "Before" labels use `ph.before` and "after" marks `ph.done`, so the two never overlap and the after marks are complete before the reveal wipes the blueprint away from the top down.

Scene-wide, set `view` when the change is small (a menu, a dialog, one control): the video then shows only that part of the screen, still 1:1, and stays readable when GitHub shrinks it to the description's width (about 900 px). Use the whole screen when the change spans the page.

The kit does the rest from the captured geometry: a static blueprint of everything unchanged, plus the construct motion for what changed. Pushes run first, then removals, changes and arrivals, staggered by row, with text hidden while wires move. Rows that trade places (a sort) are the step's change; content pushed one way is context, drawn dimmed (`pushes` overrides the guess). API and examples: [references/scene-api.md](references/scene-api.md).

## 6. Build, render, check

```bash
node "$SKILL/scripts/build.mjs" "$WORK"                             # -> $WORK/player.html, one self-contained file
node "$SKILL/scripts/render.mjs" "$WORK/player.html" --no-video      # rest-frame QA + filmstrip, fast
node "$SKILL/scripts/render.mjs" "$WORK/player.html" --at 12.4,18.9  # single moments, while tuning marks
node "$SKILL/scripts/render.mjs" "$WORK/player.html"                 # + out/blueprint.mp4 and out/blueprint.gif
```

render.mjs fails if the player throws or any rest frame differs from its state screenshot. Then open `out/filmstrip.png` and the full-size key frames in `out/frames/` (each step's focus, blueprint in, construct, finished marks, reveal and hold) and check:

1. No text on text: labels sit in empty bands, no label covers a row, and no moving wire carries its text.
2. Focus rects and their corner ticks don't cut through text.
3. Every number in a label or sentence matches what the screen shows.
4. Each step moves only what its sentence talks about, and moving parts stay with their own row.
5. Shrunk to about 900 px wide, the changed part is still readable; if not, set `view`.

Fix the scene (or the step split) and render again until all of it holds. The rules behind these checks: [references/blueprint-rules.md](references/blueprint-rules.md).

A step lasts `dur × K` (7.8 s by default), so the piece runs 1.5 + 7.8 × steps + 3 s. Rendering the video takes a few minutes; tune with `--no-video` and `--at`. To shrink only the GIF, rerun with `--gif-only --gif-width 640 --gif-fps 10`: it rebuilds the GIF from the rendered video.

## 7. Deliver

- Hand over `out/blueprint.mp4`, `out/blueprint.gif`, `player.html` (plays anywhere, offline) and `out/filmstrip.png`, with the steps as a PR-description snippet: `1. **One primary action**: Invite member is the one primary button.`
- Say which states were built by splitting a commit (they never existed as commits) and anything the sentences infer rather than read from the PR.
- GitHub takes media only through the web editor: drag the MP4 or GIF into the PR description. It shows a video's first frame as its preview, which is the base UI. Keep each file under GitHub's upload limit (10 MB for GIFs; check the user's plan for videos). Don't commit media to the repo unless asked.
- Clean up: stop the dev server, `git worktree remove --force "$WORK/app"`, then check that `git status` and `git worktree list` in the user's repo look as they did before. Delete `$WORK` once the user has the files.
