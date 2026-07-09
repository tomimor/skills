---
name: higgsfield-assets
description: >-
  Generate consistent visual asset sets with Higgsfield MCP tools: person/character
  sheets, product sheets, and landing-page asset kits. Builds an anchor sheet first,
  locks reusable prompt blocks, then derives every downstream asset from the anchor
  so faces, products, and style stay consistent. Use when the user mentions
  Higgsfield, asset generation, person sheet, character sheet, product sheet,
  product angles, landing page assets, hero image, brand kit images, or wants a
  set of images that must look like they belong together.
---

# Higgsfield asset sheets

Produces sets of images that stay consistent across generations. The core move is always the same: generate one **anchor sheet**, lock its **prompt blocks**, and derive every later asset from the anchor by reference — never by re-describing from memory.

## When to use

- The user wants a character/person they can reuse across scenes.
- The user needs a product shot set (angles, lifestyle, cutouts) for e-commerce or ads.
- The user is building a landing page and needs a cohesive kit: hero, feature spots, avatars, backgrounds, OG image.

Not for: one-off single images (just call `generate_image` directly), video generation (use `generate_video` after you have anchors), or editing a single existing photo.

## The five rules

1. **Anchor first, derivatives second.** The sheet is the source of truth. Never generate scene/marketing images before the anchor is approved by the user.
2. **Lock the blocks.** The identity/product/style description block is immutable once approved — reuse it byte-for-byte at the *start* of every derivative prompt. Only the scene/angle/action part changes.
3. **One variable per generation.** Change the camera angle *or* the environment *or* the action — never two at once. Drift compounds.
4. **Reference beats text.** Pass the anchor's `job_id` (or uploaded `media_id`) in `medias` on every derivative call. Text blocks keep style consistent; the reference keeps identity consistent.
5. **Post-process with dedicated tools.** Cutout → `remove_background`. Bigger canvas → `outpaint_image`. Resolution → `upscale_image`. Never re-generate to fix something an edit tool does deterministically.

## Workflow

### 1. Brief

Collect (ask only for what's missing; default the rest):

- **Subject**: who/what. For people: age, build, hair, skin tone, base outfit, 1–2 distinguishing features. For products: material, color, shape, key detail. For landing pages: product/service, audience, mood.
- **References**: any photos? Local files → `media_upload_widget`. URLs → `media_import_url`.
- **Style**: photorealistic / 3D / illustration; lighting; palette.
- **Destination**: where the assets go (site, store, ads) — this drives aspect ratios and count.

### 2. Pick the model

| Task | Model |
|------|-------|
| People: portraits, fashion, UGC, editorial | `soul_2` |
| Reusable person across many sessions | `soul_2` + trained Soul (`soul_id`) |
| Text-only character concept (no photo refs) | `soul_cast` |
| Products, commercial, ads | `marketing_studio_image` |
| 4K output, legible text/labels, diagrams | `nano_banana_pro` |

Unsure → `models_explore(action:'recommend')` with the goal and input context. Check supported `aspect_ratios` and `medias` roles via `models_explore` before the first call. Preflight cost with `get_cost:true` on the first generation of a batch; check `balance` for large kits.

Soul training (`show_characters(action:'train')`) only when the user explicitly asks for a reusable character or provides 5–20 photos — never silently.

### 3. Generate the anchor sheet

Use the template for the asset type:

- People → [references/person-sheet.md](references/person-sheet.md)
- Products → [references/product-sheet.md](references/product-sheet.md)
- Landing pages → [references/landing-page-kit.md](references/landing-page-kit.md) (its anchor is a **style tile**, not a subject sheet)

Show the result. Iterate until the user approves. **Do not proceed to derivatives on an unapproved anchor.**

### 4. Derive assets

For each derivative:

- Prompt = `[locked block] + [one changed variable] + [locked style/lighting suffix]`.
- `medias: [{ value: <anchor job_id>, role: <per models_explore> }]`.
- Generate in small batches (`count` 2–4), let the user pick winners; winners become secondary anchors for anything downstream of them.

### 5. Post-process

- Transparent cutouts (product PNGs, avatar crops) → `remove_background`.
- Wider/taller canvas (hero needs copy space, banner formats) → `outpaint_image`.
- Final deliverables → `upscale_image` to 2K/4K. Upscale **last**, after content is final.

### 6. Write the manifest

Persist a manifest so the set is reusable in future sessions — job IDs and locked blocks are otherwise lost with the chat. Write `higgsfield-assets.yml` in the project (or scratchpad if no project):

```yaml
set: spring-launch
anchor:
  job_id: "..."
  model: soul_2
locked_blocks:
  identity: >-
    MAYA, a woman in her late 20s, warm brown skin, shoulder-length black
    curly hair, hazel eyes, athletic build, wearing a cream linen shirt,
    small gold hoop earrings, faint freckles across the nose
  style: >-
    photorealistic, soft natural window light, shallow depth of field,
    muted warm palette, sharp focus
assets:
  - name: hero-16x9
    job_id: "..."
    changed: "leaning on a balcony rail at golden hour, 3/4 view"
  - name: avatar-1x1-cutout
    job_id: "..."
    post: [remove_background, "upscale_image 2k"]
```

To resume a set later: read the manifest, reuse the blocks verbatim, and pass the anchor `job_id` as reference again (`show_generations` can re-surface old results if IDs are missing).

## Failure modes

- **Face/product drifts across derivatives** → a block was reworded, or the reference wasn't passed. Diff the prompt against the manifest block; re-add `medias`.
- **Sheet comes out with text labels/watermarks** → add "no text, no labels, no watermarks" to the sheet prompt; `nano_banana_pro` follows negative text instructions best.
- **Model rejects the reference role** → run `models_explore` on that model and use one of its declared `medias[].roles`; don't guess role names.
- **User wants the same person "next week"** → that's the cue to offer Soul training instead of re-anchoring from a sheet.

## Reference files

- [references/person-sheet.md](references/person-sheet.md) — identity block template, turnaround sheet prompt, expression row, scene derivative pattern, Soul guidance.
- [references/product-sheet.md](references/product-sheet.md) — product block template, angle-line library, lifestyle variants, cutout pipeline.
- [references/landing-page-kit.md](references/landing-page-kit.md) — style tile, full asset checklist with aspect ratios, copy-space technique, OG/social crops.

## Out of scope

- Building the landing page itself (that's Lovable / `create_website`); this skill only produces the image assets.
- Video, audio, 3D generation.
- Ad campaign setup (see `meta-ads-bulk-creator` for Meta bulk imports).
