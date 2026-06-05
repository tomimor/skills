# Hardcoded best-practice defaults

These are the "if the brief doesn't say otherwise, do this" values the build script applies. All come from the skill author's explicit choices and are baked into `scripts/build_import.py` (`DEFAULTS` dict).

## Account & budget

| Setting | Default | Override key in brief |
|---------|---------|-----------------------|
| Ads per ad set (no matrix) | 3–5 (script errors if > 5) | — |
| Ads per ad set (with matrix) | 27 (3 × 3 × 3) | `creative_matrix` axis sizes |
| Budget mode | CBO (set `daily_budget` at campaign level) | Set `daily_budget` at ad-set level for ABO |
| Ad sets per campaign | 1 (one audience per campaign) | Add more entries under `ad_sets:` |
| Buying type | AUCTION | `campaigns[].buying_type` |
| Campaign bid strategy | Highest volume or value | `campaigns[].bid_strategy` |

## Audience

| Setting | Default | Override key |
|---------|---------|--------------|
| Strategy | Broad / Advantage+ Audience (no custom audience, no lookalike, no detailed targeting) | `ad_sets[].custom_audiences`, `ad_sets[].lookalike_audiences` |
| Country | AR | `ad_sets[].country` (ISO code) |
| Age range | 25 – 54 | `ad_sets[].age_min` / `age_max` |
| Gender | All | `ad_sets[].gender` |
| Lookalike % (when used) | 1 – 3% | Specify in audience definition before referencing |

## Creative

| Setting | Default | Override key |
|---------|---------|--------------|
| Required aspect ratios per creative | 4:5 + 9:16 (script errors if either missing) | — |
| `Image File Name` value | The 4:5 file from `creatives[].files["4:5"]` | `ads[].image_file_name` |
| Default matrix shape | 3 titles × 3 bodies × 3 creative_ids = 27 ads | `creative_matrix.titles/bodies/creative_ids` |

## Bidding & delivery

| Setting | Default | Override key |
|---------|---------|--------------|
| Placements | Advantage+ Auto (leave platform/position columns blank) | Manual placements via column overrides |
| Optimization Goal — Outcome Leads | `CONVERSATIONS` (Click-to-Message / WhatsApp) | `ad_sets[].optimization_goal` |
| Optimization Goal — Outcome Sales | **No default** — script errors unless specified | `ad_sets[].optimization_goal` |
| Optimization Goal — other objectives | None hardcoded — Meta uses its per-objective default | `ad_sets[].optimization_goal` |

## Launch hygiene

| Setting | Default | Override key |
|---------|---------|--------------|
| Campaign Status | PAUSED | `campaigns[].status` |
| Ad Set Status | PAUSED | `ad_sets[].status` |
| Ad Status | PAUSED | `ads[].status` |
| Special Ad Categories | `none` | `campaigns[].special_ad_categories` |
| Special-cat conflict | Drop incompatible targeting (custom audiences, lookalikes, age < 18) and emit per-row warning | — |
| UTM tags | `utm_source=facebook&utm_medium=paid_social&utm_campaign={campaign_name}&utm_content={ad_name}` | `ads[].url_tags` (per-ad) or `creative_matrix.url_tags` (matrix-wide) |

## Default campaign shape (with empty/minimal brief)

If you provide just a campaign name, objective, and budget plus a `creative_matrix` block, the resulting structure is:

```
1 campaign
└── 1 ad set        (broad audience, AR, 25-54, Advantage+ placements,
    │                Highest Volume bid, CBO daily_budget, PAUSED)
    └── 27 ads      (3 titles × 3 bodies × 3 creatives, all PAUSED, all
                     using 4:5 image, all sharing the same link + CTA)
```

Toggle the campaign / ad set / ad to ACTIVE in Ads Manager after reviewing previews.

## Why these defaults

- **Broad + Advantage+ placements**: 2026 Andromeda-era best practice. Meta's algorithm finds buyers more efficiently than detailed targeting in most accounts.
- **CBO**: same reason — let Meta distribute spend across ad sets based on performance signals.
- **PAUSED everywhere**: human review before any spend. Cheap insurance against typos in URLs, audiences, or budgets that multiply across 27 ads.
- **27-ad matrix**: enough creative variation to find outliers without overwhelming a single ad set. Pair with Advantage+ Creative downstream if you want Meta to mix-and-match the elements automatically.
- **AR + 25–54**: skill author's primary market and ICP age band. Override per brief.
