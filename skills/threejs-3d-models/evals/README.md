# Evals for threejs-3d-models

Four realistic tasks, each a small Vite project with a known problem, plus a
grader that builds each result and measures it in headless Chromium, with
WebGL draw calls, live contexts, and evictions instrumented. The prompts
and assertions are in `evals.json`, in the skill-creator format.

| Eval | Task | The grader measures |
|---|---|---|
| 1 `product-page` | Add a draggable 3D helmet to a product gallery; mostly phone traffic | Weight, code split, CLS, drag, keyboard, name, wheel, swipe, pinch, idle, offscreen, reduced motion, DPR, no-WebGL |
| 2 `react-gallery` | 24 rotating 3D cards in a React app; users bounce between routes | Live contexts and evictions while scrolling and over 5 round trips, blank cards, idle on Home, code split, reduced motion |
| 3 `legacy-hero` | Fix a fox hero that heats phones, traps scrolling, and logs deprecations | Deprecations, fox visible and animated, wheel, swipe, pinch, offscreen, reduced motion, DPR |
| 4 `asset-pipeline` | Optimize a configurator chair, a skinned fox, and a static helmet | Sizes, named parts, clips, texture sizes, compression, configurator still works, reported savings |

## Running an iteration

1. Build the fixtures. This needs Node 20+ and network access; it downloads
   Khronos sample models and three.js r186 example assets:

   ```bash
   evals/setup-fixtures.sh <workspace>/fixtures
   ```

2. For each eval and configuration (`with_skill`, `without_skill`), copy
   the fixture to `<workspace>/iteration-N/eval-<id>-<name>/<config>/run-1/project/`.
   Run an agent on the eval's prompt with that project as its working
   directory. Save its final report as `run-1/outputs/SUMMARY.md` (eval 4
   grades it), and its usage as `run-1/timing.json` (`total_tokens`,
   `duration_ms`, `total_duration_seconds`, `tool_uses`).

3. Grade. Runs are graded one at a time; use distinct `--port-base` values
   when grading in parallel:

   ```bash
   cd evals && npm install
   node grade.mjs <workspace>/iteration-N [path-filter] [--port-base 6100]
   ```

   The grader writes `grading.json` to each run, and `changes.diff`,
   `checks.json`, and screenshots to its `outputs/`. If Playwright's
   browser isn't installed, it falls back to `CHROMIUM_PATH` or a system
   Chromium.

4. Aggregate and review with skill-creator's `aggregate_benchmark` and
   `eval-viewer/generate_review.py`.

## Known limits

- **Saturated.** In iterations 1 and 2, runs with and without the skill
  each passed 44 or 45 of the 45 assertions. What differed was cost and the
  component bugs the runs surfaced. With v1 of the skill, runs took 9%
  longer and used 14% more tokens than without it, mostly writing their own
  verification. With v2, which bundles the page checker, they took 8% less
  time and 4% fewer tokens. Compare time and tokens as well as pass rates,
  and add assertions where runs actually differ.
- **Read the run reports.** Eval agents found real bugs in the skill's
  component, such as the OrbitControls listener leak and the missing model
  cache, and a misleading rule about normal maps. Each report's "Things to
  know" section is worth a read after every iteration.
- **Software GL.** Headless Chromium renders WebGL with SwiftShader, so the
  grader counts frames drawn and canvas pixels instead of frame rates.
  Parallel agents on a small machine stall pages for seconds; the grader
  waits for `requestAnimationFrame` progress before judging idle rendering.
