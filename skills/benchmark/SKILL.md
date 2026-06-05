---
name: benchmark
description:
  Performance regression detection for web pages -- captures baselines for page load, Core Web Vitals, and resource
  sizes, then compares subsequent runs and flags regressions by configurable thresholds. Use when the user mentions
  benchmark, perf check, performance regression, Core Web Vitals, page speed, or wants to track frontend performance
  before and after a change.
---

# Benchmark

_Adapted from [garrytan/gstack](https://github.com/garrytan/gstack)'s `/benchmark` skill. Restructured for this repo's
conventions and swapped from gstack's proprietary browse daemon to Chrome MCP / Lighthouse / Playwright (whichever is
available). Original credit to Garry Tan and contributors._

Measure page performance, save it as a baseline, and detect regressions on later runs. Do not optimize blindly --
measure first, then change one thing, then measure again.

## Critical Rules

1. **Capture a baseline before changing anything.** A benchmark without a baseline is just a number.
2. **Single-variable rule.** Compare runs that differ in one change only. Otherwise the diff is noise.
3. **Multiple runs per measurement.** Median of 3-5 runs, not a single shot. Cold cache and warm cache are separate
   measurements.
4. **Don't report Core Web Vitals from a local dev server.** Dev bundles, dev middleware, and HMR distort everything.
   Build production assets or hit a deployed URL.
5. **Reports go to `.benchmark-reports/` at the repo root** and are gitignored by default.

## What Gets Measured

- **Timing:** TTFB, FCP, LCP, DOM Interactive, DOM Complete, Full Load, INP if interactive.
- **Bundles:** total transferred bytes, JS bytes, CSS bytes, image bytes, font bytes.
- **Network:** request count, slowest 5 resources by duration.
- **Layout:** CLS (cumulative layout shift).

## Regression Thresholds

Flag a **regression** (must-fix) if any of:

- A timing metric increases by **>50%** OR **>500ms absolute**
- Bundle size increases by **>25%**
- Request count increases by **>30%**
- CLS increases by **>0.05** absolute

Flag a **warning** (should-investigate) if any of:

- Timing metric increases by **>20%**
- Bundle size increases by **>10%**
- Request count increases by **>15%**

## Invocation Patterns

```
/benchmark <url>                    # full audit + compare to last baseline
/benchmark <url> --baseline         # capture baseline (overwrites previous)
/benchmark <url> --quick            # single-pass timing only, no bundle analysis
/benchmark <url> --pages /,/about   # multiple pages in one run
/benchmark --diff                   # only re-measure pages whose code changed
/benchmark --trend                  # show historical trend across runs
```

## Workflow

### Step 1: Pick the measurement tool

In order of preference (use the first one available):

1. **Chrome MCP** -- if the `mcp__claude-in-chrome__*` tools are present, drive a real Chrome via `navigate` +
   `javascript_tool` reading `performance.getEntriesByType('navigation')` and `performance.getEntriesByType('resource')`.
2. **Lighthouse CLI** -- `lighthouse <url> --output=json --quiet --chrome-flags="--headless"`. Best for Core Web Vitals.
3. **Playwright** -- `npx playwright test` with a perf script. Use when neither of the above is available.

If none are available, stop and tell the user which to install.

### Step 2: Collect

For each page in scope, run **5 cold-cache loads** (clear cache between each) and **3 warm-cache loads**. Take the
median per metric. Discard the slowest single run as an outlier if it is >2x the median.

For bundles, capture: full network log, total transferred bytes by content-type, and the 5 slowest resources by
duration.

### Step 3: Persist

Save to `.benchmark-reports/<timestamp>-<branch>/`:

- `metrics.json` -- raw per-run data, medians, environment (Node version, OS, viewport).
- `report.md` -- human-readable summary with a table per page.
- `summary.txt` -- one-line per page for grepping in CI logs.

If `--baseline` was passed, also write `.benchmark-reports/baseline.json` (overwriting the previous baseline). Commit
`baseline.json` so it travels with the repo; gitignore the timestamped run directories.

### Step 4: Compare and flag

Diff the current medians against `baseline.json`. For each metric on each page, classify as: improvement, no change,
warning, regression. Apply the thresholds above.

### Step 5: Report

Output a markdown report with this structure:

```
### Summary
One line: PASS / WARN / FAIL, with the headline number (e.g. "LCP regressed 38% on /pricing").

### Regressions (must-fix)
Per metric: page, baseline value, current value, delta, likely cause if obvious.

### Warnings
Same shape, below threshold.

### Improvements
Briefly. Worth knowing what got faster too.

### Environment
URL, tool used, run count, branch, timestamp.
```

### Step 6: Trend (optional)

If `--trend` was passed, also emit a 3-line trend per metric across the last N runs in `.benchmark-reports/`:
direction (up/down/flat), slope, and the date the trend started.

## Anti-Patterns

- Do NOT benchmark `localhost` dev servers and present the result as Core Web Vitals.
- Do NOT report a single-run number. Variance is real.
- Do NOT include unrelated metrics in the same change ("we sped up images _and_ rewrote auth"). Split it.
- Do NOT overwrite an old baseline silently. If `--baseline` is implicit, confirm with the user first.
- Do NOT chase a sub-threshold warning if the user is in shipping mode. Note it and move on.
