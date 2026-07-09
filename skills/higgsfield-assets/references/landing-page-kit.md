# Landing-page asset kits

Unlike person/product sheets, the anchor here is a **style tile**: one image that locks the visual language. Every kit asset derives from it so the page reads as one brand.

## 1. Style block template

Freeze once approved; suffix of every kit prompt.

```
[render style: photorealistic / soft 3D render / flat editorial illustration],
[palette: 2–3 named colors, e.g. deep teal, warm sand, off-white],
[lighting: soft diffused daylight / dramatic rim light / even ambient],
[mood: calm and premium / energetic / technical],
[finish: subtle grain / clean matte / glossy]
```

Derive it from the brief: audience + product category + any brand colors. If the site already exists, ask for a screenshot or brand colors and encode them here.

## 2. Style tile (the anchor)

```
Brand style tile for [product/service]: an abstract composition combining
[hero subject or motif], a background texture, and 3 small object studies,
arranged as a loose moodboard grid. [STYLE BLOCK]. No text, no logos, no UI.
```

Aspect 16:9. Iterate until the user says "that's the vibe." Its `job_id` is the reference for every asset below.

## 3. Kit checklist

Generate in this order — later assets reference earlier winners. Ask which the page needs; default to the starred ones.

| Asset | Ratio | Notes |
|-------|-------|-------|
| ★ Hero image | 16:9 or 21:9 | See copy-space technique below |
| ★ Feature spots (3–6) | 1:1 | One motif each, same camera distance across all |
| ★ Background / section texture | 16:9 | Low contrast, "subtle, defocused, works behind text" |
| Testimonial avatars (3–5) | 1:1 | Person-sheet rules, one light setup for all; `remove_background` for floating crops |
| Product/device shot | 4:5 or 1:1 | Product-sheet rules if a real product exists |
| ★ OG / social image | 16:9 | Generate hero-adjacent, leave center-left copy space; crops to 1.91:1 |
| CTA banner strip | 21:9 | Or `outpaint_image` the hero to 21:9 |

## 4. Copy-space technique (hero)

Headlines go on the image, so reserve room in the prompt:

```
[subject] positioned in the right third of the frame, generous negative space
across the left half, background simple and uncluttered on the left,
composition balanced for a text overlay. [STYLE BLOCK]
```

If the winner lacks space, `outpaint_image` to a wider ratio instead of regenerating — extends the quiet side and preserves the approved subject.

## 5. Consistency across the kit

- Same style block suffix, byte-for-byte, on every asset.
- Style tile `job_id` in `medias` on every call.
- Feature spots: identical prompt scaffold, swap only the motif noun phrase — same camera distance, same background treatment, so they sit in a row as siblings.
- Avatars: fix one lighting phrase ("soft frontal key light, plain warm grey backdrop") across all people; vary only the person.

## 6. Text in images

Don't render headlines/UI copy into assets — the page's HTML sets the text. Exceptions (badge, sticker, small wordmark): `nano_banana_pro` with the exact string quoted, and verify the spelling on every output.

## 7. Delivery

- Winners → `upscale_image` (2K for section images, 4K for hero).
- Anything needing transparency → `remove_background` before upscale.
- Record every asset in the manifest with its slot name (`hero-16x9`, `feature-sync-1x1`, `og-16x9`) so a future session can extend the kit without re-anchoring.
