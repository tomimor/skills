---
name: meta-ads-bulk-creator
description: >-
  Build Meta Ads Manager bulk-import files (.xlsx + Unicode .txt) from a
  structured YAML brief, using the bundled v2.3 Ads Manager Template.
  Expands a creative matrix (titles x bodies x creatives) into one row per ad
  and validates every field against Meta's enums and 2026 character limits.
  Use when the user mentions Meta ads bulk, Facebook ads bulk, Ads Manager
  template, .xltx, bulk import, mass ad creation, AdsManagerTemplate, or
  wants to launch many ads at once.
---

# Meta Ads bulk creator

Turns a YAML brief into a Meta Ads Manager bulk-import file. The template (143 columns) is bundled. The script enforces 2026 limits, validates every field, and emits both an `.xlsx` for review and the Unicode `.txt` Meta actually parses.

## When to use

- Creating more than ~5 ads at once.
- Testing a creative matrix (multiple headlines / bodies / images).
- Replicating a campaign across audiences or geos.
- The user uploads `AdsManagerTemplate_v2.3.xltx`, mentions a `.xltx` file, or asks about Meta's bulk import flow.

Not for: editing one or two ads (use Ads Manager UI), API-based ad creation (this is a file producer, not an API client), creative generation (this consumes images, doesn't make them).

## The 5-step workflow

1. **Gather a brief** from the user (YAML preferred). If they have nothing, ask via AskUserQuestion: campaign name, objective, daily budget, link, CTA, headlines, bodies, image filenames. Default everything else.
2. **Validate** with `python scripts/build_import.py brief.yml --check`. Read the report. Fix errors before proceeding.
3. **Build** with `python scripts/build_import.py brief.yml --out ./output --images ./images`. Outputs `output.xlsx` and `output.txt`.
4. **Have the user review** `output.xlsx`. Spot-check ad names, copy, image filenames, audience.
5. **Tell the user** to upload `output.txt` in Ads Manager → **Import & Export → Import Ads**, attach the images folder when prompted, then publish from drafts. See [references/workflow.md](references/workflow.md) for the exact UI steps.

## Brief schema (YAML)

Minimal:

```yaml
account:
  page_id: "1234567890"        # used as Link Object ID

creatives:
  - id: hero_a
    files:
      "4:5":  hero_a_4x5.jpg   # required — used as Image File Name
      "9:16": hero_a_9x16.jpg  # required — checked exists, for Stories/Reels

campaigns:
  - name: "Spring 2026 sale"   # 35 chars max
    objective: "Outcome Sales" # see references/enums.md
    daily_budget: 50.00        # CBO budget (no currency symbol)
    ad_sets:
      - name: "Broad AR 25-54"
        optimization_goal: OFFSITE_CONVERSIONS  # required for Sales (no default)
        creative_matrix:
          link: "https://example.com/spring"
          cta: SHOP_NOW
          titles:  ["Spring sale", "Save big", "Don't miss out"]
          bodies:  ["Limited-time...", "Up to 40% off...", "Today only..."]
          creative_ids: [hero_a]   # references creatives[].id
```

Full schema with overrides: see [examples/matrix_brief.yml](examples/matrix_brief.yml) and [examples/sample_brief.yml](examples/sample_brief.yml).

`creative_matrix` cross-products into one ad per (title × body × creative_id). Default 3 × 3 × 3 = 27 ads in one ad set. Use `ads:` (a discrete list) instead when each ad is hand-crafted; the script caps at 5 ads per ad set in that mode.

## Hardcoded defaults

When the brief omits a field, the script applies these. Full table in [references/best-practices.md](references/best-practices.md).

| Field | Default |
|-------|---------|
| Country | AR |
| Age range | 25–54 |
| Audience | Broad / Advantage+ Audience |
| Placements | Advantage+ Auto (columns left blank) |
| Budget mode | CBO (use `daily_budget` at campaign level) |
| Bid strategy | Highest volume or value |
| Status (campaign / ad set / ad) | PAUSED |
| Special Ad Categories | `none` |
| Buying Type | AUCTION |
| UTM tags | `utm_source=facebook&utm_medium=paid_social&utm_campaign={campaign_name}&utm_content={ad_name}` |
| Optimization Goal — Outcome Leads | `CONVERSATIONS` |
| Optimization Goal — Outcome Sales | **No default** — brief must specify |
| Required image aspect ratios | 4:5 + 9:16 |
| Image File Name source | The 4:5 file from each creative |

## Hard rules the script enforces

Brief-level errors (block the build):

- Names > 35 chars (campaign, ad set, ad).
- Title > 40 chars; Body > 2,200 chars; Description > 200 chars.
- Currency value with a symbol or > 2 decimal places.
- Date not in `MM/DD/YY HH:MM`.
- Enum value not in the VALIDATION sheet's allowed list (case-sensitive).
- More than 5 ads per ad set when no `creative_matrix` is used.
- A creative missing the 4:5 or 9:16 file.
- An `Image File Name` not present in `--images` directory (case-sensitive).
- Outcome Sales without an explicit `optimization_goal`.

Brief-level warnings (don't block):

- Title > 27 chars (mobile Feed truncation).
- Body > 125 chars ("See more" link appears).
- Description > 30 chars (often hidden on mobile).
- Status mismatch (e.g. ACTIVE ad inside PAUSED ad set — won't run).
- Special Ad Category set + narrow targeting in brief — script drops the targeting and warns.

See [references/limits.md](references/limits.md) for the full list and [references/columns.md](references/columns.md) for every column's format and enum.

## Script usage

```bash
python scripts/build_import.py brief.yml \
    --out ./output \
    --images ./images   # optional but recommended
```

Flags:
- `--check` — validate only, do not write files. Use this first.
- `--out <dir>` — output directory (default `./output`).
- `--images <dir>` — directory with the image files referenced in the brief. The script verifies every `Image File Name` and every creative's 4:5 + 9:16 files exist with exact case.
- `--spec <path>` — alternate `spec.json` path (default `scripts/spec.json`).

Outputs:
- `output/output.xlsx` — for human review (143 columns, all cells populated).
- `output/output.txt` — UTF-16 LE BOM, tab-separated, `\r\n` line endings. **This is the file you upload.**

## Updating to a newer template

If Meta releases a new `AdsManagerTemplate_vX.X.xltx`:

1. Replace the file in `assets/`.
2. Re-run `python scripts/extract_columns.py` to regenerate `scripts/spec.json` and `references/columns.md`.
3. Re-run `--check` against your existing briefs to surface any newly-required columns or removed enums.

## Troubleshooting

- **Meta rejects `output.txt` with a parsing error** → confirm encoding is UTF-16 LE with BOM (run `file output/output.txt`; should print "Unicode text, UTF-16, little-endian"). The script always produces this; if it doesn't, the file was modified.
- **"Image File Name not found"** → exact case match required. Rename files to lowercase + underscores; avoid spaces.
- **`output.txt` exceeds 2 MB** → split the brief into multiple campaigns and run the script per campaign.
- **Special Ad Category warnings** flooding the output → set `special_ad_categories: financial_products_services` (or whichever applies) at the campaign level and remove custom audiences / lookalikes from the brief.
- **All 27 matrix ads have the same image** → the brief listed only one `creative_id`. To get image rotation, list all 3 creative IDs in `creative_ids:`.

## Reference files

- [references/columns.md](references/columns.md) — all 143 columns: level, format, required state, valid values (auto-generated).
- [references/workflow.md](references/workflow.md) — Ads Manager UI steps, file size limits, common rejection reasons.
- [references/limits.md](references/limits.md) — 2026 char/format limits, file encoding details.
- [references/enums.md](references/enums.md) — quick lookup for objectives, optimization goals, CTAs, placements.
- [references/creative-matrix.md](references/creative-matrix.md) — matrix expansion rules, naming pattern.
- [references/best-practices.md](references/best-practices.md) — full table of hardcoded defaults with rationale.

## Out of scope

- Direct Marketing API calls. This skill produces a file the user uploads in the UI.
- Generating images, videos, or copy.
- Performance analysis after launch.
