# Creative matrix expansion

A `creative_matrix` block in an ad set expands into one ad row per (title × body × creative_id) combination. The default 3 × 3 × 3 yields **27 ads in one ad set**.

## Schema

```yaml
ad_sets:
  - name: "Broad AR 25-54"
    creative_matrix:
      titles:
        - "Headline 1"
        - "Headline 2"
        - "Headline 3"
      bodies:
        - "Primary text A"
        - "Primary text B"
        - "Primary text C"
      creative_ids:
        - lifestyle_a
        - lifestyle_b
        - product_shot
      link: "https://example.com/landing"      # required
      cta: SHOP_NOW                            # required, must be from CTA enum
      description: "Optional link description" # optional
      url_tags: "..."                          # optional, overrides default UTM
```

`creative_ids` references entries in the top-level `creatives:` block:

```yaml
creatives:
  - id: lifestyle_a
    files:
      "4:5": lifestyle_a_4x5.jpg
      "9:16": lifestyle_a_9x16.jpg
```

Every creative must declare files for both **4:5** and **9:16**. The script:
- Uses the **4:5** file as the value of the `Image File Name` column (most common Feed format).
- Validates that the **9:16** file exists in your `--images` folder for upload coverage of Stories/Reels placements.
- For Advantage+ Auto placements, Meta will auto-resize the 4:5 to other aspect ratios at delivery, but the 9:16 file gives better Stories/Reels rendering.

## Naming

Generated ad names follow `T{titleIdx}_B{bodyIdx}_C{creativeIdx}_{creative_id}`, then truncated to 35 chars:

```
T1_B1_C1_lifestyle_a
T1_B1_C2_lifestyle_b
T1_B1_C3_product_shot
T1_B2_C1_lifestyle_a
...
```

This pattern makes it easy to identify winners post-launch by reading just the name.

## When to use a matrix vs discrete ads

| Use a matrix when… | Use discrete `ads:` when… |
|--------------------|---------------------------|
| Testing creative variations systematically | Each ad is hand-crafted |
| You want > 5 ads per ad set | You want ≤ 5 ads per ad set |
| Headlines and bodies pair freely | Specific headline must pair with specific body |
| Bulk creation is the point | Editing existing ads |

## Conflict rule

When `creative_matrix` is present, the script ignores the "max 5 ads per ad set" cap (since matrix expansion is the entire point). With `ads:` (discrete list), the cap is enforced and the script errors if you exceed 5.
